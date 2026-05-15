"""
tiktok_extractor.py — Descarga vídeos de TikTok y extrae fotogramas clave

Funcionalidades:
  - Descarga vídeo sin marca de agua con yt-dlp
  - Extrae fotogramas a intervalos regulares con FFmpeg
  - Selecciona el mejor fotograma para face swap (nitidez + resolución)
  - Extrae metadatos del vídeo (caption, autor, etc.)
"""

import os
import glob
import subprocess
from PIL import Image

# Intentar importar imageio_ffmpeg para usar su binario FFmpeg bundled
try:
    import imageio_ffmpeg
    FFMPEG_EXE = imageio_ffmpeg.get_ffmpeg_exe()
except ImportError:
    FFMPEG_EXE = "ffmpeg"


class TikTokExtractor:
    """Descarga vídeos de TikTok y extrae los mejores fotogramas."""

    def __init__(self, download_dir: str = None):
        if download_dir is None:
            # Mover fuera de backend/ para evitar reloads de uvicorn
            download_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "..", "downloads", "tiktok")
        self.download_dir = download_dir
        os.makedirs(self.download_dir, exist_ok=True)

    def _log(self, msg: str):
        """Imprime un mensaje y lo guarda en el log de auditoría manejando emojis."""
        import time
        timestamp = time.strftime('%Y-%m-%d %H:%M:%S')
        clean_msg = f"[{timestamp}] [Extractor] {str(msg)}"
        try:
            print(clean_msg)
        except UnicodeEncodeError:
            # Fallback para consolas Windows que no soportan UTF-8 (charmap)
            print(clean_msg.encode('ascii', 'ignore').decode('ascii'))

    def download_video(self, tiktok_url: str, job_id: str) -> dict:
        """
        Descarga un vídeo de TikTok sin marca de agua usando yt-dlp.
        
        Retorna:
            dict con keys: video_path, title, description, uploader, duration
        """
        import yt_dlp

        job_dir = os.path.join(self.download_dir, job_id)
        os.makedirs(job_dir, exist_ok=True)

        output_template = os.path.join(job_dir, "viral_video.%(ext)s")

        ydl_opts = {
            "outtmpl": output_template,
            "format": "bestvideo[vcodec^=avc1]+bestaudio[ext=m4a]/best[ext=mp4]/best",
            "merge_output_format": "mp4",
            "quiet": True,
            "no_warnings": True,
        }

        self._log(f"⬇️ Descargando vídeo de TikTok: {tiktok_url[:60]}...")

        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(tiktok_url, download=True)

            # Buscar el archivo descargado
            video_files = glob.glob(os.path.join(job_dir, "viral_video.*"))
            if not video_files:
                raise FileNotFoundError("No se encontró el vídeo descargado")

            video_path = video_files[0]
            
            # PASO DE LIMPIEZA: Convertir a H.264 CFR para evitar mosaicos y desincronización
            clean_video_path = os.path.join(job_dir, "viral_video_clean.mp4")
            self._log(f"🧹 Analizando y limpiando vídeo...")
            
            # 1. Extraer un frame de prueba para detectar mosaico (usamos el segundo 2.0 para evitar intros)
            test_frame = os.path.join(job_dir, "test_detect.png")
            subprocess.run([FFMPEG_EXE, "-y", "-ss", "2.0", "-i", video_path, "-frames:v", "1", test_frame], capture_output=True)
            
            is_mosaic = False
            if os.path.exists(test_frame):
                try:
                    from PIL import Image, ImageStat, ImageChops
                    img = Image.open(test_frame).convert("RGB")
                    w, h = img.size
                    
                    # Detección por Aspect Ratio (si es muy alto, es mosaico vertical)
                    if h > 1.8 * w:
                        self._log(f"🧩 Mosaico detectado por Aspect Ratio ({w}x{h}).")
                        is_mosaic = True
                    else:
                        # Detección por similitud de contenido (mosaico 1x2)
                        # Comparamos el cuarto superior del frame 1 con el cuarto superior del frame 2
                        top_part = img.crop((0, 0, w, h//4))
                        bot_part = img.crop((0, h//2, w, 3*h//4))
                        
                        diff = ImageChops.difference(top_part, bot_part)
                        stat = ImageStat.Stat(diff)
                        # Media de diferencia de píxeles (0-255). Si es < 20, son casi idénticos.
                        diff_mean = sum(stat.mean) / len(stat.mean)
                        
                        # También verificamos que no sea una imagen plana (negra/blanca)
                        energy = sum(ImageStat.Stat(top_part).stddev)
                        
                        if diff_mean < 20 and energy > 10: 
                            self._log(f"🧩 Mosaico detectado por Similitud (Diff: {diff_mean:.2f}). Activando recorte.")
                            is_mosaic = True
                    
                    os.remove(test_frame)
                except Exception as e:
                    self._log(f"⚠️ Error en detección de mosaico: {e}")

            # 2. Transcodificar con o sin recorte según el resultado
            vf_chain = "yadif"
            if is_mosaic:
                # Recortamos la mitad superior y reescalamos a vertical estándar
                vf_chain += ",crop=iw:ih/2:0:0,scale=1080:1920"
            else:
                vf_chain += ",scale='if(gt(iw,ih),-1,trunc(iw/2)*2)':'if(gt(iw,ih),trunc(ih/2)*2,-1)'"

            conv_cmd = [
                FFMPEG_EXE, "-y", "-i", video_path,
                "-c:v", "libx264", "-preset", "ultrafast", "-crf", "18",
                "-vf", vf_chain,
                "-vsync", "cfr", "-r", "30", "-c:a", "copy",
                clean_video_path
            ]
            subprocess.run(conv_cmd, capture_output=True)
            
            if os.path.exists(clean_video_path):
                video_path = clean_video_path

            file_size = os.path.getsize(video_path)
            result = {
                "video_path": os.path.abspath(video_path),
                "title": info.get("title", "Sin título"),
                "description": info.get("description", ""),
                "uploader": info.get("uploader", "Desconocido"),
                "duration": info.get("duration", 0),
                "file_size": file_size,
            }

            self._log(f"✅ Vídeo descargado: {os.path.basename(video_path)} ({file_size // 1024}KB, {result['duration']}s)")
            self._log(f"   Autor: {result['uploader']}")
            self._log(f"   Descripción: {result['description'][:100]}...")

            return result

        except Exception as e:
            self._log(f"❌ Error descargando vídeo: {e}")
            raise

    def extract_keyframes(self, video_path: str, num_frames: int = 8) -> list:
        """
        Extrae fotogramas clave del vídeo a intervalos regulares.
        Usa FFmpeg para capturar N frames distribuidos uniformemente.
        
        Retorna:
            Lista de rutas absolutas a los fotogramas extraídos.
        """
        self._log(f"🎞️ Extrayendo {num_frames} fotogramas clave...")

        frames_dir = os.path.join(os.path.dirname(video_path), "frames")
        os.makedirs(frames_dir, exist_ok=True)

        # Obtener duración del vídeo
        duration = self._get_video_duration(video_path)
        if duration <= 0:
            duration = 10  # fallback

        # Calcular intervalo entre frames
        interval = max(duration / (num_frames + 1), 0.5)

        frame_paths = []
        for i in range(num_frames):
            timestamp = interval * (i + 1)
            output_path = os.path.join(frames_dir, f"frame_{i:03d}.png")

            cmd = [
                FFMPEG_EXE,
                "-y",
                "-ss", str(round(timestamp, 3)),
                "-i", video_path,
                "-vf", "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2",
                "-vframes", "1",
                output_path,
            ]

            try:
                # Capturamos stderr para diagnosticar fallos si el frame no se genera
                res = subprocess.run(cmd, capture_output=True, text=True, timeout=15)
                if os.path.exists(output_path) and os.path.getsize(output_path) > 0:
                    frame_paths.append(os.path.abspath(output_path))
                else:
                    self._log(f"❌ Error FFmpeg en frame {i}: {res.stderr}")
            except Exception as e:
                self._log(f"⚠️ Excepción extrayendo frame {i}: {e}")

        self._log(f"✅ Extraídos {len(frame_paths)} fotogramas")
        return frame_paths

    def extract_frame_at(self, video_path: str, timestamp: float, output_name: str = "manual_frame.png") -> str:
        """
        Extrae un fotograma en un segundo específico del vídeo.
        """
        self._log(f"📸 Capturando frame manual en {timestamp}s...")
        job_dir = os.path.dirname(video_path)
        frames_dir = os.path.join(job_dir, "frames")
        os.makedirs(frames_dir, exist_ok=True)
        
        output_path = os.path.join(frames_dir, output_name)
        
        cmd = [
            FFMPEG_EXE,
            "-y",
            "-ss", str(round(timestamp, 3)),
            "-i", video_path,
            "-vf", "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2",
            "-vframes", "1",
            output_path,
        ]

        try:
            res = subprocess.run(cmd, capture_output=True, text=True, timeout=15)
            if os.path.exists(output_path) and os.path.getsize(output_path) > 0:
                self._log(f"✅ Frame manual capturado: {output_path}")
                return os.path.abspath(output_path)
            else:
                self._log(f"❌ Error FFmpeg en frame manual: {res.stderr}")
        except Exception as e:
            self._log(f"❌ Excepción capturando frame manual: {e}")
        
        return None

    def select_best_frame(self, frame_paths: list) -> str:
        """
        Selecciona el mejor fotograma basándose en:
        - Nitidez (varianza del Laplaciano — usando ImageStat para velocidad)
        - Resolución e iluminación
        """
        print(f"[Extractor] 🧠 Analizando {len(frame_paths)} fotogramas para elegir el mejor...")
        from PIL import ImageStat

        if not frame_paths:
            raise ValueError("No hay fotogramas para analizar")

        best_score = -1
        best_frame = frame_paths[0]

        for path in frame_paths:
            try:
                img = Image.open(path)
                # 1. Convertir a escala de grises para análisis de nitidez
                gray = img.convert("L")
                stat = ImageStat.Stat(gray)
                
                # Usamos la desviación estándar como métrica de "energía" o detalle (nitidez relativa)
                stddev = stat.stddev[0]
                mean_val = stat.mean[0]

                # Penalizar imágenes muy oscuras o muy claras (posible transición a negro/blanco)
                brightness_penalty = 1.0
                if mean_val < 50 or mean_val > 220:
                    brightness_penalty = 0.4

                # Bonus por resolución (aunque aquí todas suelen ser iguales por el scale de FFmpeg)
                width, height = img.size
                resolution_score = (width * height) / (1080 * 1920)

                # Score final
                score = stddev * brightness_penalty * resolution_score

                if score > best_score:
                    best_score = score
                    best_frame = path

            except Exception as e:
                print(f"[Extractor] ⚠️ Error analizando {os.path.basename(path)}: {e}")

        print(f"[Extractor] ✅ Mejor fotograma: {os.path.basename(best_frame)} (score: {best_score:.2f})")
        return best_frame

    def smart_crop_to_916(self, image_path: str, output_path: str = None) -> str:
        """
        Recorta una imagen al centro para que tenga un formato 9:16 (vertical).
        """
        print(f"[Extractor] ✂️ Recortando imagen a formato 9:16: {image_path}")
        if output_path is None:
            # Generar un nombre temporal para el recorte
            base, ext = os.path.splitext(image_path)
            output_path = f"{base}_916{ext}"
            
        try:
            img = Image.open(image_path)
            width, height = img.size
            
            target_ratio = 9 / 16
            current_ratio = width / height
            
            # Tolerancia pequeña para no recortar si ya es casi 9:16
            if abs(current_ratio - target_ratio) < 0.05:
                print("[Extractor] La imagen ya tiene formato vertical. Saltando recorte.")
                return os.path.abspath(image_path)

            if current_ratio > target_ratio:
                # Es más ancha que 9:16 (ej: Horizontal 16:9 o Cuadrada 1:1)
                # Recortamos los laterales
                new_width = height * target_ratio
                left = (width - new_width) / 2
                right = (width + new_width) / 2
                top = 0
                bottom = height
            else:
                # Es más alta que 9:16 (Muy vertical)
                # Recortamos arriba y abajo
                new_height = width / target_ratio
                top = (height - new_height) / 2
                bottom = (height + new_height) / 2
                left = 0
                right = width
                
            img_cropped = img.crop((left, top, right, bottom))
            img_cropped.save(output_path, quality=95)
            print(f"[Extractor] ✅ Imagen recortada guardada en: {output_path}")
            return os.path.abspath(output_path)
        except Exception as e:
            print(f"[Extractor] ❌ Error recortando imagen: {e}")
            return image_path

    def _get_video_duration(self, video_path: str) -> float:
        """Obtiene la duración del vídeo en segundos usando FFmpeg."""
        try:
            cmd = [
                FFMPEG_EXE,
                "-i", video_path,
                "-f", "null", "-"
            ]
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
            # FFmpeg imprime la duración en stderr
            for line in result.stderr.split("\n"):
                if "Duration:" in line:
                    time_str = line.split("Duration:")[1].split(",")[0].strip()
                    parts = time_str.split(":")
                    hours, minutes, seconds = float(parts[0]), float(parts[1]), float(parts[2])
                    return hours * 3600 + minutes * 60 + seconds
        except Exception:
            pass
        return 0


if __name__ == "__main__":
    extractor = TikTokExtractor()
    print("[Test] TikTokExtractor inicializado.")
    print(f"[Test] Download dir: {extractor.download_dir}")
    print(f"[Test] FFmpeg: {FFMPEG_EXE}")
