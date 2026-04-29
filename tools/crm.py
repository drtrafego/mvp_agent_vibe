import asyncio
import logging
from datetime import datetime, timezone
from typing import Optional
from urllib.parse import urlparse, parse_qs

import asyncpg

from config.settings import settings

logger = logging.getLogger(__name__)

VALID_STAGES = [
    "novo",
    "qualificando",
    "interesse",
    "agendado",
    "realizada",
    "sem_interesse",
    "perdido",
    "bloqueado",
]

VALID_TEMPERATURES = ["cold", "warm", "hot"]

_pool: Optional[asyncpg.Pool] = None


async def _get_pool() -> asyncpg.Pool:
    global _pool
    if _pool is None:
        _pool = await asyncpg.create_pool(
            settings.DATABASE_URL,
            min_size=1,
            max_size=5,
            statement_cache_size=0,
        )
    return _pool


async def get_contact(phone: str) -> dict:
    """Retorna dados do contato. Cria registro basico se nao existir."""
    pool = await _get_pool()
    row = await pool.fetchrow(
        "SELECT * FROM agente_vibe.contacts WHERE phone = $1 LIMIT 1", phone
    )
    if row:
        return dict(row)

    result = await pool.fetchrow(
        """
        INSERT INTO agente_vibe.contacts (id, phone, name, stage, followup_count)
        VALUES (gen_random_uuid()::text, $1, $2, 'novo', 0)
        ON CONFLICT (phone) WHERE phone IS NOT NULL DO UPDATE SET phone = EXCLUDED.phone
        RETURNING *
        """,
        phone, phone,
    )
    return dict(result) if result else {"phone": phone, "stage": "novo", "followup_count": 0}


async def update_contact(phone: str, **kwargs) -> None:
    """Atualiza campos do contato."""
    if not kwargs:
        return
    pool = await _get_pool()
    sets = ", ".join(f"{k} = ${i+2}" for i, k in enumerate(kwargs))
    values = list(kwargs.values())
    await pool.execute(
        f"UPDATE agente_vibe.contacts SET {sets}, updated_at = now() WHERE phone = $1",
        phone, *values,
    )


async def append_observation(phone: str, obs: str) -> None:
    """Adiciona linha a observacoes_sdr com timestamp. Limita a 20 linhas."""
    pool = await _get_pool()
    row = await pool.fetchrow(
        "SELECT observacoes_sdr FROM agente_vibe.contacts WHERE phone = $1", phone
    )
    existing = (row["observacoes_sdr"] or "") if row else ""

    now = datetime.now(timezone.utc).strftime("%H:%M")
    lines = existing.splitlines() if existing else []
    lines.append(f"[{now}] {obs}")
    lines = lines[-20:]

    await pool.execute(
        "UPDATE agente_vibe.contacts SET observacoes_sdr = $2, updated_at = now() WHERE phone = $1",
        phone, "\n".join(lines),
    )


async def advance_stage(phone: str, new_stage: str) -> None:
    """Muda o stage validando contra VALID_STAGES. Dispara automacao de deal em background."""
    if new_stage not in VALID_STAGES:
        logger.warning("Stage invalido: %s ignorado para phone %s", new_stage, phone)
        return
    pool = await _get_pool()
    await pool.execute(
        "UPDATE agente_vibe.contacts SET stage = $2, updated_at = now() WHERE phone = $1",
        phone, new_stage,
    )
    logger.info("Stage atualizado: phone=%s novo_stage=%s", phone, new_stage)
    asyncio.create_task(_trigger_deal_automation(phone, new_stage))


async def _trigger_deal_automation(phone: str, new_stage: str) -> None:
    try:
        from tools.deals import auto_deal_on_stage_change
        await auto_deal_on_stage_change(phone, new_stage)
    except Exception as exc:
        logger.warning("deal automation falhou: phone=%s stage=%s: %s", phone, new_stage, exc)


async def mark_bot_message(phone: str) -> None:
    """Atualiza last_bot_msg_at = now()."""
    pool = await _get_pool()
    await pool.execute(
        "UPDATE agente_vibe.contacts SET last_bot_msg_at = now(), updated_at = now() WHERE phone = $1",
        phone,
    )


async def save_origin(phone: str, referral: dict) -> None:
    """
    Salva origem do lead a partir do referral CTWA da Meta.
    Logica identica ao agent_n8n_agencia/app/api/whatsapp/webhook/route.ts:
      1. Garante que o contato existe (upsert)
      2. Salva ad_id + UTMs imediatamente (sincrono)
      3. Dispara enriquecimento via Meta Graph API (fire and forget)
    """
    if not referral:
        return

    ad_id = referral.get("source_id") or ""
    if not ad_id:
        logger.info("Origem ignorada: referral sem source_id. phone=%s referral=%s", phone, referral)
        return

    # Parsear UTMs da source_url
    headline = referral.get("headline") or ""
    body_text = referral.get("body") or ""
    source_url = referral.get("source_url") or ""
    utm_source = utm_medium = utm_campaign = utm_content = utm_placement = ""
    if source_url:
        try:
            params = parse_qs(urlparse(source_url).query)
            utm_source    = params.get("utm_source",    [None])[0] or source_url
            utm_medium    = params.get("utm_medium",    [None])[0] or body_text
            utm_campaign  = params.get("utm_campaign",  [None])[0] or ""
            utm_content   = params.get("utm_content",   [None])[0] or headline
            utm_placement = params.get("utm_placement", [None])[0] or params.get("placement", [None])[0] or ""
        except Exception:
            utm_source = source_url
            utm_medium = body_text
            utm_content = headline

    # 1. Garante que o contato existe (mesmo padrao do n8n: upsert antes do update)
    pool = await _get_pool()
    await pool.execute(
        """
        INSERT INTO agente_vibe.contacts (id, phone, name, stage, followup_count)
        VALUES (gen_random_uuid()::text, $1, $1, 'novo', 0)
        ON CONFLICT (phone) WHERE phone IS NOT NULL DO UPDATE SET updated_at = now()
        """,
        phone,
    )

    # 2. Salva ad_id e UTMs (ad_id sempre sobrescreve, UTMs preservam se ja preenchidos)
    await pool.execute(
        """
        UPDATE agente_vibe.contacts SET
            ad_id        = $2,
            utm_content  = COALESCE(NULLIF(utm_content,  ''), $3),
            utm_source   = COALESCE(NULLIF(utm_source,   ''), $4),
            utm_medium   = COALESCE(NULLIF(utm_medium,   ''), $5),
            utm_campaign = COALESCE(NULLIF(utm_campaign, ''), $6),
            placement    = COALESCE(NULLIF(placement,    ''), $7),
            updated_at   = now()
        WHERE phone = $1
        """,
        phone, ad_id, utm_content, utm_source, utm_medium, utm_campaign, utm_placement,
    )
    logger.info("Origem salva: phone=%s ad_id=%s source_url=%s", phone, ad_id, source_url)

    # 3. Enriquecimento via Meta Graph API (fire and forget — igual ao n8n after())
    asyncio.create_task(_enrich_from_meta(phone, ad_id))


async def _enrich_from_meta(phone: str, ad_id: str) -> None:
    """Busca ad_name, campaign_name e adset_name via Meta Graph API e atualiza o contato."""
    import httpx
    from config.settings import settings

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                f"https://graph.facebook.com/v20.0/{ad_id}",
                params={"fields": "id,name,campaign_id,adset_id", "access_token": settings.META_ACCESS_TOKEN},
            )
            if resp.status_code != 200:
                logger.warning("Meta API falhou para ad_id=%s: %s", ad_id, resp.status_code)
                return
            data = resp.json()

        updates: dict = {}
        if data.get("name"):
            updates["ad_name"] = data["name"]

        campaign_id = data.get("campaign_id")
        adset_id = data.get("adset_id")
        if campaign_id:
            updates["campaign_id"] = campaign_id
        if adset_id:
            updates["adset_id"] = adset_id

        async with httpx.AsyncClient(timeout=10) as client:
            if campaign_id:
                r = await client.get(
                    f"https://graph.facebook.com/v20.0/{campaign_id}",
                    params={"fields": "name", "access_token": settings.META_ACCESS_TOKEN},
                )
                if r.status_code == 200:
                    updates["campaign_name"] = r.json().get("name")

            if adset_id:
                r = await client.get(
                    f"https://graph.facebook.com/v20.0/{adset_id}",
                    params={"fields": "name", "access_token": settings.META_ACCESS_TOKEN},
                )
                if r.status_code == 200:
                    updates["adset_name"] = r.json().get("name")

        updates = {k: v for k, v in updates.items() if v}
        if updates:
            pool = await _get_pool()
            sets = ", ".join(f"{k} = COALESCE({k}, ${i+2})" for i, k in enumerate(updates))
            values = list(updates.values())
            await pool.execute(
                f"UPDATE agente_vibe.contacts SET {sets}, updated_at = now() WHERE phone = $1",
                phone, *values,
            )
            logger.info("Meta enrich ok: phone=%s updates=%s", phone, list(updates.keys()))
    except Exception as exc:
        logger.warning("Meta enrich falhou: phone=%s ad_id=%s: %s", phone, ad_id, exc)


async def update_lead_profile(
    phone: str,
    nicho: str | None = None,
    stage: str | None = None,
    temperature: str | None = None,
) -> None:
    """Atualiza perfil do lead. Stages só avançam (não regridem se ja em estado superior)."""
    updates: dict = {}
    if nicho:
        updates["nicho"] = nicho
    if stage and stage in VALID_STAGES:
        updates["stage"] = stage
    if temperature and temperature in VALID_TEMPERATURES:
        updates["temperature"] = temperature
    if not updates:
        return

    pool = await _get_pool()
    sets = ", ".join(f"{k} = ${i+2}" for i, k in enumerate(updates))
    values = list(updates.values())
    await pool.execute(
        f"UPDATE agente_vibe.contacts SET {sets}, updated_at = now() WHERE phone = $1",
        phone, *values,
    )
    logger.info("Lead profile atualizado: phone=%s updates=%s", phone, updates)
