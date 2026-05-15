"""
wavespeed_client.py — Cliente para Wavespeed AI API (v3)

Pipeline CORRECTO del negocio UGC:
  Fase 2: Nano Banana 2 Edit — Genera imagen base con identidad IA + pose viral
  Fase 4a: Kling Elements — Registra Personaje y Producto como elementos
  Fase 4b: Kling 3.0 Pro I2V — Genera vídeo animando la imagen con Elements

Endpoints:
  - Upload:             POST /api/v3/media/upload/binary
  - Nano Banana 2 Edit: POST /api/v3/google/nano-banana-2/edit
  - Kling Elements:     POST /api/v3/kwaivgi/kling-elements  (producto)
  - Kling Elem. Adv.:  POST /api/v3/kwaivgi/kling-elements-advanced  (personaje)
  - Kling 3.0 Pro I2V:  POST /api/v3/kwaivgi/kling-v3.0-pro/image-to-video
  - Status:             GET  /api/v3/predictions/{prediction_id}

Auth: Bearer token via WAVESPEED_API_KEY

IMPORTANTE: Las imágenes se suben primero al CDN via Upload API.
            Luego se envían las URLs (ligeras) en el payload del task.
            Esto evita el timeout de escritura con payloads base64 de varios MB.
"""

import os
import time
import mimetypes
import requests
import json
from dotenv import load_dotenv
from modules.cost_tracker import cost_tracker

load_dotenv()

# ─────────────────────────────────────────────
# PROMPTS MAESTROS (documentados en UGC_BUSINESS_MODEL.md)
# ─────────────────────────────────────────────
PROMPT_VIDEO_MOTION = """
The character interacts naturally with the product. Smooth, fluid movements of the hands and head. Handheld camera feel.
"""

PROMPT_IDENTITY = """
This is a high-fidelity image transfer operation. The goal is to create a seamless, photorealistic photograph that integrates distinct elements from three source images.

CONTEXT BASE (from Image 3):
The final output is a high-resolution photograph of the scene, pose, and clothing exactly as depicted in Reference 3. This is the static environment. Maintain the composition, lighting direction, shadows, and full context from Reference 3 perfectly.

IDENTITY OVERLAY (from Image 1):
Strictly transfer the facial identity of the person from Reference 1 onto the face in Image 3. The subject's face must be a perfect, seamless, and unedited 1:1 match to Reference 1, preserving all unique features, including skin texture, eye shape, nose structure, lip proportions, and overall likeness.

BODY TYPE ADJUSTMENT (CRITICAL FIDELITY - REVISED):
The model must ENFORCE the exact defined, substantial bust volume and shape depicted across ALL views of Reference 2, including the front-and-side close-up. Do not interpret the white top from Reference 3 as a reducing or flattening garment. Maintain the dominant, curvy physique of Reference 2 specifically for the chest geometry, transferring the volume perfectly 1:1, aligning it with the new pose.

HAIR FIDELITY (Dynamic Constraint):
Preserve the exact physical hair COLOR and physical hair LENGTH observed in Reference 1. These are physical attributes. The hairstyle itself (e.g., loose, ponytail) should adapt naturally to match the visual presentation of Image 3 (to ensure integration with the pose), but the fundamental color and length come from Reference 1.

LIGHTING & REALISM:
The final image must appear as an unedited, natural photograph taken with a consumer device (iPhone style). All lighting, shadows, and reflections must be integrated seamlessly, consistent with the light sources in Reference 3.

CLEAN OUTPUT:
Ensure a natural skin texture (no 'beautify' or 'airbrush' effects). The image must be clean, free of any text, logos, watermarks, symbols, or graphical overlays. Do not change or blur the original background from Image 3. Maintain the skin completely clear of any tattoos, piercings, or body modifications.
"""


class WavespeedClient:
    """Cliente para la API REST de Wavespeed AI (v3)."""

    BASE_URL = "https://api.wavespeed.ai/api/v3"
    POLL_INTERVAL = 3       # segundos entre cada check
    MAX_POLL_TIME = 600     # 10 minutos máximo de espera

    def __init__(self):
        self.api_key = os.getenv("WAVESPEED_API_KEY")
        self.headers_json = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        # Headers para upload (sin Content-Type, requests lo pone automáticamente con multipart)
        self.headers_upload = {
            "Authorization": f"Bearer {self.api_key}",
        }
        self.download_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "..", "downloads")
        os.makedirs(self.download_dir, exist_ok=True)
        self.log_file = os.path.join(os.path.dirname(self.download_dir), "logs", "wavespeed_api.log")
        os.makedirs(os.path.dirname(self.log_file), exist_ok=True)

    def _log(self, msg: str):
        """Imprime un mensaje y lo guarda en el log de auditoría."""
        # Limpieza de emojis para evitar errores en terminales antiguas, pero permitimos UTF-8
        timestamp = time.strftime('%Y-%m-%d %H:%M:%S')
        clean_msg = f"[{timestamp}] {str(msg)}"
        try:
            print(clean_msg)
        except UnicodeEncodeError:
            print(clean_msg.encode('ascii', 'ignore').decode('ascii'))
            
        with open(self.log_file, "a", encoding="utf-8") as f:
            f.write(clean_msg + "\n")

    def get_balance(self) -> float:
        """
        Consulta el saldo real en USD desde la API de Wavespeed.
        GET /api/v3/balance
        """
        url = f"{self.BASE_URL}/balance"
        try:
            response = requests.get(url, headers=self.headers_json, timeout=10)
            if response.status_code == 200:
                data = response.json()
                # La API suele devolver {"data": {"balance": 12.34}}
                balance = data.get("data", {}).get("balance", 0.0)
                return float(balance)
            return 0.0
        except Exception as e:
            self._log(f"[Wavespeed] Error consultando balance: {e}")
            return 0.0

    # ──────────────── Utilidades Internas ────────────────

    def _compress_image(self, image_path: str, max_size_mb: float = 1.0) -> str:
        """
        Comprime y redimensiona una imagen para cumplir con los requisitos de Kling.
        - Fuerza modo RGB (sin transparencia).
        - Asegura dimensiones múltiplos de 32 (evita error 1401).
        - Resolución mínima de 512px.
        """
        from PIL import Image
        import os
        
        img = Image.open(image_path)
        
        # 1. Fuerza modo RGB (importantísimo para Kling)
        if img.mode != "RGB":
            img = img.convert("RGB")
        
        orig_w, orig_h = img.size
        
        # 2. Calcular nuevas dimensiones (múltiplos de 32 y min 512)
        target_w = max(512, (orig_w // 32) * 32)
        target_h = max(512, (orig_h // 32) * 32)
        
        # Si es muy grande, capar a 1024 o 1280 (para no subir archivos gigantes)
        max_dim = 1280
        if target_w > max_dim or target_h > max_dim:
            ratio = max_dim / max(target_w, target_h)
            target_w = int((target_w * ratio) // 32) * 32
            target_h = int((target_h * ratio) // 32) * 32

        # 3. Redimensionar si ha cambiado algo
        if (target_w, target_h) != (orig_w, orig_h):
            self._log(f"[Wavespeed] Redimensionando: {orig_w}x{orig_h} -> {target_w}x{target_h} (múltiplo de 32)")
            img = img.resize((target_w, target_h), Image.LANCZOS)
        
        # 4. Guardar y comprimir si el archivo sigue siendo grande
        compressed_path = os.path.splitext(image_path)[0] + "_processed.jpg"
        
        # Primero intentamos con calidad 90
        img.save(compressed_path, "JPEG", quality=90, optimize=True)
        
        file_size_mb = os.path.getsize(compressed_path) / (1024 * 1024)
        if file_size_mb > max_size_mb:
            self._log(f"[Wavespeed] Comprimiendo {file_size_mb:.1f} MB -> <{max_size_mb} MB...")
            for quality in [75, 60, 45]:
                img.save(compressed_path, "JPEG", quality=quality, optimize=True)
                new_size_mb = os.path.getsize(compressed_path) / (1024 * 1024)
                if new_size_mb <= max_size_mb:
                    self._log(f"[Wavespeed]   ✅ Comprimido: {new_size_mb:.1f} MB (quality={quality})")
                    break
        
        return compressed_path

    def _upload_image(self, image_path: str, use_compression: bool = True) -> str:
        """
        Sube una imagen local al CDN de Wavespeed via Upload API.
        
        1. Comprime la imagen si es >1MB para reducir tiempo de subida
        2. Sube via POST multipart con timeout generoso y reintentos
        
        POST /api/v3/media/upload/binary
        Content-Type: multipart/form-data
        
        Retorna: URL pública del CDN (https://cdn.wavespeed.ai/uploads/xxx.png)
        """
        if not self.api_key:
            self._log(f"[Wavespeed] ⚠️ No API key — mock upload para {os.path.basename(image_path)}")
            return "https://mock.wavespeed.ai/uploaded_image.png"

        # Asegurar ruta absoluta
        image_path = os.path.abspath(image_path)
        if not os.path.exists(image_path):
            raise FileNotFoundError(f"No se encuentra la imagen para subir: {image_path}")

        # Comprimir si es necesario para acelerar la subida (solo si use_compression es True)
        if use_compression:
            upload_path = self._compress_image(image_path, max_size_mb=1.0)
        else:
            self._log(f"[Wavespeed] 🚀 Subida RAW (sin compresión) solicitada para {os.path.basename(image_path)}")
            upload_path = image_path
        
        url = f"{self.BASE_URL}/media/upload/binary"
        filename = os.path.basename(upload_path)
        file_size_mb = os.path.getsize(upload_path) / (1024 * 1024)
        
        # Detectar MIME type
        mime_type = mimetypes.guess_type(upload_path)[0] or "image/jpeg"
        
        self._log(f"[Wavespeed] 📤 Subiendo {filename} ({file_size_mb:.1f} MB) al CDN...")

        # Usar Session con reintentos automáticos para uploads
        from requests.adapters import HTTPAdapter
        from urllib3.util.retry import Retry
        
        session = requests.Session()
        retries = Retry(
            total=3,
            backoff_factor=5,        # espera 5, 10, 20 segundos entre reintentos
            status_forcelist=[500, 502, 503, 504],
            allowed_methods=["POST"],
        )
        session.mount("https://", HTTPAdapter(max_retries=retries))
        
        with open(upload_path, "rb") as f:
            files = {"file": (filename, f, mime_type)}
            response = session.post(
                url, 
                headers=self.headers_upload, 
                files=files, 
                timeout=(30, 600)  # 30s conexión, 600s para subir (10 min — tu upload es lento)
            )

        if response.status_code >= 400:
            self._log(f"[Wavespeed] ❌ Upload HTTP {response.status_code}")
            self._log(f"[Wavespeed] Response: {response.text[:500]}")
            response.raise_for_status()

        data = response.json()
        
        # La respuesta viene: { "code": 200, "data": { "download_url": "https://cdn..." } }
        upload_data = data.get("data", data)
        cdn_url = upload_data.get("download_url")
        
        if not cdn_url:
            raise ValueError(f"Upload API no devolvió download_url. Respuesta: {data}")

        self._log(f"[Wavespeed] ✅ Subido → {cdn_url}")
        
        # Limpiar archivo comprimido temporal
        if upload_path != image_path and os.path.exists(upload_path):
            os.remove(upload_path)
        
        return cdn_url

    def _submit_task(self, model_id: str, payload: dict) -> dict:
        """
        POST /api/v3/{model_id}
        Devuelve el JSON de respuesta con el prediction_id.
        El payload debe contener URLs (no base64) — es ligero e instantáneo.
        """
        url = f"{self.BASE_URL}/{model_id}"
        self._log(f"[Wavespeed] POST → {url}")

        if not self.api_key:
            self._log("[Wavespeed] ⚠️ No WAVESPEED_API_KEY — devolviendo mock.")
            return {"id": "mock_prediction_id", "status": "completed", "outputs": ["https://mock.wavespeed.ai/result.png"]}

        response = requests.post(url, json=payload, headers=self.headers_json, timeout=(30, 60))

        if response.status_code >= 400:
            try:
                error_data = response.json() if "application/json" in response.headers.get('Content-Type', '') else {"message": response.text}
            except:
                error_data = {"message": response.text}
                
            error_msg = error_data.get('message', str(error_data))
            self._log(f"[Wavespeed] [ERROR] HTTP {response.status_code}: {error_msg}")
            
            if any(word in error_msg.lower() for word in ["credits", "balance", "funds", "insufficient"]):
                raise Exception(f"SALDO_INSUFICIENTE: No tienes créditos en Wavespeed. Por favor, recarga tu cuenta en wavespeed.ai")
                
            response.raise_for_status()

        data = response.json()
        if "data" in data: return data["data"]
        return data

    def _poll_result(self, prediction_id: str) -> dict:
        """
        Polling: GET /api/v3/predictions/{id}/result
        
        Este endpoint devuelve status + outputs en una sola llamada.
        Maneja reintentos de red y timeouts de forma robusta.
        """
        poll_url = f"{self.BASE_URL}/predictions/{prediction_id}/result"
        elapsed = 0
        self._log(f"[Wavespeed] 🔄 Iniciando polling para {prediction_id} (Timeout: {self.MAX_POLL_TIME}s)")

        while elapsed < self.MAX_POLL_TIME:
            try:
                response = requests.get(poll_url, headers={"Authorization": f"Bearer {self.api_key}"}, timeout=(30, 60))
                
                if response.status_code == 404:
                    # El recurso aún no se ha creado en la base de datos de predicciones
                    if elapsed % 15 == 0:
                        self._log(f"[Wavespeed] ⏳ Predicción {prediction_id} todavía en cola (404)...")
                    time.sleep(self.POLL_INTERVAL)
                    elapsed += self.POLL_INTERVAL
                    continue
                
                response.raise_for_status()
                data = response.json()
                result = data.get("data", data)
                
                status = result.get("status", "unknown")
                outputs = result.get("outputs", result.get("output", []))
                
                self._log(f"[Wavespeed] 🔄 {prediction_id} estado: {status} ({elapsed}s)")

                # Corregido: Solo salir si está completado Y tiene outputs (o si el modelo no devuelve outputs pero dice completed)
                if status == "completed":
                    if outputs:
                        self._log(f"[Wavespeed] ✅ {prediction_id} completado con éxito.")
                        return result
                    else:
                        # Si dice completed pero no hay outputs, esperamos un poco más por si hay lag en el CDN
                        self._log(f"[Wavespeed] ⚠️ Status completed pero 'outputs' vacío. Esperando sync...")
                elif "outputs" in result and outputs:
                    # Si ya hay outputs aunque no diga completed (algunos modelos lo hacen)
                    self._log(f"[Wavespeed] ✅ {prediction_id} tiene outputs disponibles.")
                    return result
                elif status == "failed":
                    error_msg = result.get("error", "Error desconocido en Wavespeed")
                    self._log(f"[Wavespeed] ❌ {prediction_id} falló: {error_msg}")
                    raise Exception(f"Generación fallida: {error_msg}")
                
                # Si el estado es "processing", "starting", etc., seguimos esperando
                time.sleep(self.POLL_INTERVAL)
                elapsed += self.POLL_INTERVAL
                
            except requests.exceptions.RequestException as e:
                # Errores de red temporales
                self._log(f"[Wavespeed] ⚠️ Error de red en polling ({prediction_id}): {e}. Reintentando...")
                time.sleep(self.POLL_INTERVAL)
                elapsed += self.POLL_INTERVAL
            except Exception as e:
                # Errores fatales (JSON inválido, etc.)
                self._log(f"[Wavespeed] ❌ Error inesperado en polling ({prediction_id}): {e}")
                raise e

        self._log(f"[Wavespeed] 🛑 Timeout alcanzado para {prediction_id}")
        raise TimeoutError(f"El proceso de Wavespeed ({prediction_id}) excedió el tiempo máximo de {self.MAX_POLL_TIME}s")

    def _download_file(self, url: str, filename: str, subfolder: str = "") -> str:
        """Descarga un archivo desde una URL y lo guarda en downloads/[subfolder]/."""
        target_dir = os.path.join(self.download_dir, subfolder) if subfolder else self.download_dir
        os.makedirs(target_dir, exist_ok=True)
        
        dest = os.path.join(target_dir, filename)
        if url.startswith("https://mock"):
            with open(dest, "w") as f:
                f.write("MOCK FILE PLACEHOLDER")
            return os.path.abspath(dest)

        self._log(f"[Wavespeed] Descargando → {dest}")

        response = requests.get(url, stream=True, timeout=120)
        response.raise_for_status()
        with open(dest, "wb") as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)

        self._log(f"[Wavespeed] ✅ Descargado: {os.path.basename(dest)} ({os.path.getsize(dest)} bytes)")
        return os.path.abspath(dest)

    def _get_output_url(self, result: dict) -> str:
        """Extrae la primera URL de salida del resultado de una predicción."""
        outputs = result.get("outputs", result.get("output", []))
        if isinstance(outputs, list) and len(outputs) > 0:
            return outputs[0]
        elif isinstance(outputs, str):
            return outputs
        raise ValueError(f"No se encontró URL de salida en el resultado: {result}")

    # ──────────────── FASE 0b: Analizador Visual de Producto ────────────────
    
    def analyze_product_image(self, image_path: str, prompt: str = None, job_id: str = None) -> str:
        """
        Usa el modelo de visión de Wavespeed para describir físicamente el producto o el entorno.
        Retorna: descripción en inglés obtenida del modelo captioner.
        """
        self._log("═" * 60)
        self._log("[Wavespeed] ═══ FASE 0b: Analizador Visual (Reconocimiento) ═══")
        
        # Subir imagen para análisis
        image_url = self._upload_image(image_path)
        
        payload = {
            "image": image_url,
            "prompt": prompt or "Identify the physical container (tube, jar, bottle, pump), color, and material of this product. Be concise.",
            "detail_level": "high",
            "enable_sync_mode": True # Para que sea instantáneo en el pipeline
        }

        try:
            # Intentamos modo síncrono para mayor velocidad
            result = self._submit_task("wavespeed-ai/image-captioner", payload)
            
            # Registrar coste
            if job_id:
                cost_tracker.log_media_cost(job_id, "wavespeed", "image-captioner", 1)

            # El resultado puede venir en outputs[0] o directamente si es sync
            description = ""
            if "outputs" in result and result["outputs"]:
                description = result["outputs"][0]
            elif "output" in result:
                description = result["output"]
            
            self._log(f"[Wavespeed] 👁️ Análisis visual: {description[:100]}...")
            return description
        except Exception as e:
            self._log(f"[Wavespeed] ⚠️ Error en análisis visual: {e}. Usando fallback.")
            return "A product in a container."

    # ──────────────── FASE 2: Nano Banana 2 Edit ────────────────

    def create_base_image(self, influencer_image_path: str, viral_frame_path: str, influencer_sheet_path: str = None, job_id: str = None) -> str:
        """
        Fase 2: Crear imagen base con Nano Banana 2 Edit.
        Incluye identidad de rostro + fisionomía de cuerpo (Character Sheet).
        """
        self._log("═" * 60)
        self._log("[Wavespeed] ═══ FASE 2: Nano Banana 2 Edit (Identidad Compuesta + Pose) ═══")
        
        # PASO 1: Subir imágenes al CDN
        self._log("[Wavespeed]   📤 Paso 1: Subiendo referencias al CDN...")
        influencer_url = self._upload_image(influencer_image_path)
        frame_url = self._upload_image(viral_frame_path)
        
        ref_images = [influencer_url]
        if influencer_sheet_path:
            self._log("[Wavespeed]   📤 Añadiendo Hoja de Personaje para fisionomía...")
            sheet_url = self._upload_image(influencer_sheet_path)
            ref_images.append(sheet_url)
        
        # La última imagen siempre es el frame/pose viral
        ref_images.append(frame_url)

        # Prompt ajustado para fisionomía y cabello
        # Si hay 3 imágenes: 1=Rostro, 2=Cuerpo(Sheet), 3=Pose
        # Si hay 2 imágenes: 1=Rostro/Cuerpo, 2=Pose
        dynamic_prompt = PROMPT_IDENTITY
        if len(ref_images) == 3:
            # Primero corregimos la pose y fondo para que apunten al Frame (Image 3)
            dynamic_prompt = dynamic_prompt.replace("Image 2", "Image 3")
            # Luego asignamos la identidad a Cara y Cuerpo (Image 1 and Image 2)
            dynamic_prompt = dynamic_prompt.replace("Image 1", "Image 1 and Image 2")
            dynamic_prompt += "\nSpecific Instruction: Replicate the EXACT physique, body proportions, and hair length/color from the influencer references."
        else:
            # Con 2 imágenes, Image 1 y Image 2 ya coinciden perfectamente con PROMPT_IDENTITY
            pass

        # Configuración de Seguridad Solicitada (Bypass Capa 1 Google)
        safety_settings = [
            {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"}
        ]

        payload = {
            "prompt": dynamic_prompt,
            "images": ref_images,
            "aspect_ratio": "9:16",
            "resolution": "1k",
            "output_format": "png",
            "enable_sync_mode": False,
            "enable_base64_output": False,
            "safety_settings": safety_settings
        }

        # Bucle de reintento para maximizar probabilidad de éxito ante censura aleatoria
        for attempt in range(1, 3):
            try:
                self._log(f"[Wavespeed]   🚀 Paso 2: Enviando task a Nano Banana 2 (Intento {attempt}/2)...")
                result = self._submit_task("google/nano-banana-2/edit", payload)

                self._log("[Wavespeed]   ⏳ Paso 3: Esperando resultado (polling)...")
                pred_id = result.get("id")
                if result.get("status") != "completed" and pred_id:
                    result = self._poll_result(pred_id)

                output_url = self._get_output_url(result)
                # Usamos un nombre único con timestamp + pred_id para evitar colisiones y caché
                unique_filename = f"base_image_{int(time.time())}_{pred_id[:6]}.png"
                local_path = self._download_file(output_url, unique_filename, subfolder="base_images")
                
                # Registrar coste
                if job_id:
                    cost_tracker.log_media_cost(job_id, "wavespeed", "google/nano-banana-2", 1)

                self._log(f"[Wavespeed] ✅ Imagen base creada → {local_path}")
                return local_path
            except Exception as e:
                self._log(f"[Wavespeed]   ⚠️ Error en intento {attempt}: {e}")
                if attempt == 2: raise
        
        return ""

    # ──────────────── FASE 6: Generar Vídeo Seedance-2.0 ────────────────

    def _sanitize_script_for_tts(self, script: str) -> str:
        """
        Limpia el script de locución de tokens técnicos (@Image, @Audio, etc.) 
        y caracteres que confunden al TTS de Seedance.
        """
        if not script: return ""
        import re
        # 1. Eliminar etiquetas de referencia (@Image1, @Audio1, etc.)
        script = re.sub(r'@\w+\d*', '', script)
        # 2. Eliminar caracteres no lingüísticos que causan ruidos o errores
        script = re.sub(r'[/\\()\[\]{}<>#*_~]', ' ', script)
        # 3. Normalizar espacios
        script = re.sub(r'\s{2,}', ' ', script).strip()
        return script

    def generate_video_seedance(self, start_image_path: str, prompt: str, 
                                reference_images: list = None, reference_audio_path: str = None,
                                duration: int = 5, resolution: str = "720p",
                                aspect_ratio: str = "9:16", script: str = None,
                                audio_mode: str = "lip-sync",
                                is_first_scene: bool = False,
                                seed: int = None,
                                language: str = "es",
                                job_id: str = None) -> str:
        """
        Genera vídeo con Bytedance Seedance-2.0 via TEXT-TO-VIDEO endpoint.
        Separa script del prompt visual según el audio_mode activo.
        """
        self._log("═" * 60)
        self._log(f"[Wavespeed] ═══ Seedance 2.0 T2V+Refs (Duration: {duration}s, Audio: {audio_mode}, FirstScene: {is_first_scene}) ═══")

        # Pre-procesamiento de script para mejorar pronunciación del TTS nativo
        if script:
            # Eliminar puntuación excesiva que puede causar repetición de sílabas
            import re as _re
            script = _re.sub(r'([!?.]){2,}', r'\1', script)  # "!!!" -> "!"
            script = _re.sub(r'\s{2,}', ' ', script)  # doble espacio
            script = script.strip()

        # Definir la restricción de acento según el idioma
        accent_constraint = ""
        if language == "es":
            accent_constraint = " (Speaker accent: Native Castilian Spanish from Spain ONLY. Do not use Latin American accents). "
        elif language == "es-latam":
            accent_constraint = " (Speaker accent: Native Latin American Spanish (Mexico/Neutral) ONLY. Do not use accents from Spain). "
        elif language == "en":
            accent_constraint = " (Speaker accent: Native American English ONLY). "
        elif language == "fr":
            accent_constraint = " (Speaker accent: Native French from France ONLY). "
        elif language == "de":
            accent_constraint = " (Speaker accent: Native German ONLY). "
        elif language == "it":
            accent_constraint = " (Speaker accent: Native Italian ONLY). "
        elif language == "pt":
            accent_constraint = " (Speaker accent: Native Portuguese from Portugal ONLY). "

        # Sanitizar script para evitar palabras inventadas o sílabas repetidas
        clean_script = self._sanitize_script_for_tts(script)

        # Construir Prompt Final con ACENTO como prioridad máxima
        if audio_mode == "lip-sync" and clean_script:
            # Lip-sync: la influencer HABLA, incluir script para sincronización de labios
            final_prompt = f'VOICE_ACCENT_CONSTRAINT: {accent_constraint.strip()} SPOKEN_SCRIPT: "{clean_script}". VISUAL_INSTRUCTIONS: {prompt}'
        elif audio_mode == "voice-over":
            # Voice-over: narración externa, boca CERRADA
            if clean_script:
                final_prompt = f'VOICE_ACCENT_CONSTRAINT: {accent_constraint.strip()} SPOKEN_SCRIPT: "{clean_script}". Voice-over narration only. VISUAL_INSTRUCTIONS: {prompt}. Character keeps mouth closed at all times. No lip movement.'
            else:
                final_prompt = f'VOICE_ACCENT_CONSTRAINT: {accent_constraint.strip()} {prompt}. Character keeps mouth closed at all times. No lip movement. Voice-over narration only.'
        elif audio_mode == "mixed":
            # Mixed: Combina partes habladas y voz en off
            if clean_script:
                final_prompt = f'VOICE_ACCENT_CONSTRAINT: {accent_constraint.strip()} SPOKEN_SCRIPT: "{clean_script}". Mixed audio mode: combine direct speech with voice-over narration. VISUAL_INSTRUCTIONS: {prompt}'
            else:
                final_prompt = f'VOICE_ACCENT_CONSTRAINT: {accent_constraint.strip()} {prompt}. Mixed audio mode.'
        elif audio_mode == "asmr":
            # ASMR: sonidos táctiles, si hay script se hace susurrando.
            if clean_script:
                final_prompt = f'SPOKEN_SCRIPT: "{clean_script}". ASMR mode: whisper soft voice and tactile sounds only. VISUAL_INSTRUCTIONS: {prompt}. Focus on close-up sensory interactions.'
            else:
                final_prompt = f'{prompt}. ASMR mode: whisper-level tactile sounds only. No speech. Focus on close-up sensory interactions.'
        elif audio_mode == "silent":
            # Silent: sin voz, ignora explícitamente el script si se mandó por error
            final_prompt = f'{prompt}. Complete silence from character. No speech. Ambient environmental sounds only.'
        else:
            # Fallback
            if clean_script:
                final_prompt = f'VOICE_ACCENT_CONSTRAINT: {accent_constraint.strip()} SPOKEN_SCRIPT: "{clean_script}". VISUAL_INSTRUCTIONS: {prompt}'
            else:
                final_prompt = f'VOICE_ACCENT_CONSTRAINT: {accent_constraint.strip()} {prompt}'
        
        # Refuerzo anti-deformación, anti-bokeh y estabilidad posicional en TODOS los modos
        final_prompt += " All objects maintain exact original shape and proportions throughout. NO bokeh. NO blur. Deep focus like amateur phone camera. POSITIONAL STABILITY: All product labels, text, logos and surface graphics must remain fixed in their exact original position. No sliding, drifting, warping or transmutation of any surface element."

        # Refuerzo de primer frame para la primera escena
        if is_first_scene:
            final_prompt += " FIRST FRAME DIRECTIVE: The video MUST begin with an exact reproduction of @Image1. The first 1-2 seconds must show the IDENTICAL composition, pose, background, and framing as @Image1. Start from this exact image and then transition into movement."

        # 1. Subir todas las imágenes de referencia
        all_image_urls = []
        if reference_images:
            for img_path in reference_images:
                if img_path:
                    # Si es un frame de continuidad, saltamos la compresión para evitar degradación progresiva
                    is_continuity = "continuity" in os.path.basename(img_path).lower()
                    all_image_urls.append(self._upload_image(img_path, use_compression=not is_continuity))
                else:
                    all_image_urls.append("") 
        
        # 2. Subir audio si existe (@Audio1)
        audio_url = None
        if reference_audio_path:
            audio_url = self._upload_image(reference_audio_path)

        # 3. Construir Payload para TEXT-TO-VIDEO
        payload = {
            "prompt": final_prompt,
            "reference_images": all_image_urls,
            "duration": duration,
            "resolution": resolution,
            "aspect_ratio": aspect_ratio,
            "enable_web_search": False,
        }

        if seed is not None:
            payload["seed"] = seed
        
        if audio_url:
            payload["reference_audios"] = [audio_url]

        self._log(f"[Wavespeed] 🚀 PAYLOAD SEEDANCE (T2V):\n{json.dumps(payload, indent=2)}")

        result = self._submit_task("bytedance/seedance-2.0/text-to-video", payload)
        pred_id = result.get("id")
        if result.get("status") != "completed" and pred_id:
            result = self._poll_result(pred_id)
        
        output_url = self._get_output_url(result)
        unique_filename = f"seedance_video_{int(time.time())}_{pred_id[:6]}.mp4"
        local_path = self._download_file(output_url, unique_filename, subfolder="seedance_videos")
        
        # Registrar coste
        if job_id:
            cost_tracker.log_media_cost(job_id, "wavespeed", "bytedance/seedance-2.0", duration, resolution=resolution)

        return local_path, payload


        return local_path, payload


if __name__ == "__main__":
    client = WavespeedClient()
    client._log("[Test] WavespeedClient inicializado correctamente.")
    client._log(f"[Test] API Key presente: {'Sí' if client.api_key else 'No (modo mock)'}")
    client._log(f"[Test] Download dir: {client.download_dir}")
    client._log("\n[Test] Métodos disponibles:")
    client._log("  - create_base_image(influencer, viral_frame)  -> Nano Banana 2 Edit")
    client._log("  - generate_video_seedance(...)               -> Seedance 2.0 T2V")
    
    # Test rápido del upload si hay API key
    if client.api_key:
        client._log("\n[Test] 🔑 API Key detectada — el upload funciona con:")
        client._log(f"       POST {client.BASE_URL}/media/upload/binary")
