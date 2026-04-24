import logging
import os
import tempfile

import httpx
from google import genai
from google.genai import types

from config.settings import settings

logger = logging.getLogger(__name__)

META_MEDIA_URL = "https://graph.facebook.com/v21.0/{media_id}"
TRANSCRIPTION_PROMPT = "Transcreva este audio em portugues. Retorne apenas o texto transcrito."


async def transcribe_audio(media_id: str) -> str:
    """Baixa audio da Meta API e transcreve com Gemini. Retorna texto."""
    tmp_path: str | None = None
    try:
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
                return "[Audio nao pode ser transcrito. O lead enviou um audio.]"

            audio_resp = await client.get(download_url, headers=headers)
            audio_resp.raise_for_status()
            audio_bytes = audio_resp.content

        suffix = ".ogg" if "ogg" in mime_type else ".mp4"
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name

        gemini_client = genai.Client(api_key=settings.GOOGLE_API_KEY)
        audio_part = types.Part.from_bytes(data=audio_bytes, mime_type=mime_type)

        response = await gemini_client.aio.models.generate_content(
            model="gemini-2.5-flash",
            contents=[audio_part, TRANSCRIPTION_PROMPT],
            config=types.GenerateContentConfig(
                thinking_config=types.ThinkingConfig(thinking_budget=0),
            ),
        )
        transcript = (response.text or "").strip()

        if not transcript:
            logger.warning("Transcricao vazia: media_id=%s", media_id)
            return "[Audio nao pode ser transcrito. O lead enviou um audio.]"

        logger.info("Audio transcrito: media_id=%s chars=%d", media_id, len(transcript))
        return transcript

    except Exception as exc:
        logger.error("Erro ao transcrever audio media_id=%s: %s", media_id, exc)
        return "[Audio nao pode ser transcrito. O lead enviou um audio.]"

    finally:
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.unlink(tmp_path)
            except Exception:
                pass
