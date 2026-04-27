"""Transcricao de audio via api.transcrever.casaldotrafego.com (Whisper local).

Fluxo:
1. Baixa audio da Meta API
2. Upload para api.transcrever via /videos/upload
3. Cria job via POST /jobs
4. Polling /jobs/{id} ate status=completed
5. Busca texto em /transcricoes/{output_path}
"""
import asyncio
import logging

import httpx

from config.settings import settings

logger = logging.getLogger(__name__)

META_MEDIA_URL = "https://graph.facebook.com/v21.0/{media_id}"
TRANSCRIBE_BASE = "https://api.transcrever.casaldotrafego.com"
POLL_INTERVAL_S = 2
POLL_TIMEOUT_S = 180  # 3 min max
FALLBACK = "[Audio nao pode ser transcrito. O lead enviou um audio.]"


async def _download_meta_audio(media_id: str) -> tuple[bytes, str] | None:
    headers = {"Authorization": f"Bearer {settings.META_ACCESS_TOKEN}"}
    async with httpx.AsyncClient(timeout=30.0) as client:
        meta_url = META_MEDIA_URL.format(media_id=media_id)
        meta_resp = await client.get(meta_url, headers=headers)
        meta_resp.raise_for_status()
        meta_data = meta_resp.json()
        download_url = meta_data.get("url")
        mime_type = meta_data.get("mime_type", "audio/ogg")

        if not download_url:
            logger.error("URL de download nao encontrada para media_id=%s", media_id)
            return None

        audio_resp = await client.get(download_url, headers=headers)
        audio_resp.raise_for_status()
        return audio_resp.content, mime_type


async def transcribe_audio(media_id: str) -> str:
    """Baixa audio da Meta e transcreve via api.transcrever (Whisper local). Sem custo Gemini."""
    try:
        downloaded = await _download_meta_audio(media_id)
        if not downloaded:
            return FALLBACK
        audio_bytes, mime_type = downloaded

        suffix = ".ogg" if "ogg" in mime_type else ".mp4"
        filename = f"meta_{media_id[:30]}{suffix}"

        async with httpx.AsyncClient(timeout=POLL_TIMEOUT_S + 30) as client:
            # 1. Upload
            files = {"file": (filename, audio_bytes, mime_type)}
            up = await client.post(f"{TRANSCRIBE_BASE}/videos/upload", files=files)
            up.raise_for_status()
            uploaded_filename = up.json().get("filename", filename)
            logger.info("Audio uploaded: %s", uploaded_filename)

            # 2. Cria job
            job_resp = await client.post(
                f"{TRANSCRIBE_BASE}/jobs",
                json={"files": [uploaded_filename], "language": "pt"},
            )
            job_resp.raise_for_status()
            jobs = job_resp.json().get("jobs", [])
            if not jobs:
                logger.error("Sem jobs criados: %s", job_resp.text[:200])
                return FALLBACK
            job_id = jobs[0]["job_id"]
            logger.info("Transcribe job criado: %s", job_id)

            # 3. Polling
            elapsed = 0
            while elapsed < POLL_TIMEOUT_S:
                await asyncio.sleep(POLL_INTERVAL_S)
                elapsed += POLL_INTERVAL_S
                st = await client.get(f"{TRANSCRIBE_BASE}/jobs/{job_id}")
                st.raise_for_status()
                data = st.json()
                status = data.get("status", "")
                if status == "completed":
                    output_path = data.get("output_path", "")
                    if not output_path:
                        logger.warning("Job completed sem output_path: %s", data)
                        return FALLBACK
                    # 4. Buscar texto
                    text_resp = await client.get(f"{TRANSCRIBE_BASE}/transcricoes/{output_path}")
                    text_resp.raise_for_status()
                    transcript = text_resp.text.strip()
                    logger.info("Audio transcrito: media_id=%s chars=%d", media_id, len(transcript))
                    return transcript or FALLBACK
                if status == "error":
                    logger.error("Job erro: %s", data.get("error", "unknown"))
                    return FALLBACK
                # Continua polling se queued/processing

            logger.warning("Audio timeout após %ds: media_id=%s", POLL_TIMEOUT_S, media_id)
            return FALLBACK

    except Exception as exc:
        logger.error("Erro ao transcrever audio media_id=%s: %s", media_id, exc)
        return FALLBACK
