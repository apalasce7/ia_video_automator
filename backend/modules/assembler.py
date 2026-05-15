import os
import ffmpeg
import textwrap
import shutil

class Assembler:
    def __init__(self, output_dir: str = None):
        if output_dir:
            self.output_dir = os.path.abspath(output_dir)
        else:
            # Mover fuera de backend/ para evitar reloads de uvicorn
            self.output_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "..", "downloads", "ready_to_upload")
            
        if not os.path.exists(self.output_dir):
            os.makedirs(self.output_dir, exist_ok=True)
        print(f"[Assembler] Output dir configurado en: {self.output_dir}")

    def get_video_duration(self, video_path: str) -> float:
        """Obtiene la duración de un vídeo usando ffprobe."""
        import imageio_ffmpeg
        import subprocess
        ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
        ffprobe_exe = ffmpeg_exe.replace("ffmpeg", "ffprobe")
        cmd = [
            ffprobe_exe, "-v", "error", "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1", video_path
        ]
        try:
            out = subprocess.check_output(cmd).decode().strip()
            return float(out)
        except:
            return 0.0

    def trim_clip(self, v_path: str, start: float, end: float) -> str:
        """Crea una versión recortada de un clip."""
        import imageio_ffmpeg
        import subprocess
        ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
        
        trimmed_path = v_path.replace(".mp4", f"_trimmed_{int(start*100)}_{int(end*100)}.mp4")
        
        # Si ya existe, no lo repetimos
        if os.path.exists(trimmed_path):
            return trimmed_path

        duration = end - start
        cmd = [
            ffmpeg_exe, "-y", "-ss", str(start), "-i", v_path,
            "-t", str(duration), "-c", "copy", trimmed_path
        ]
        
        res = subprocess.run(cmd, capture_output=True, text=True)
        if res.returncode == 0 and os.path.exists(trimmed_path):
            return trimmed_path
        return v_path

    def concatenate_scenes(self, scene_videos: list, scene_audios: list, output_filename: str = "final_ugc_video.mp4", scene_edits: dict = None) -> str:
        """
        Concatena múltiples clips de vídeo y sus audios correspondientes usando el método Concat Demuxer.
        Soporta recortes si se pasa scene_edits { '0': { 'start': 1.0, 'end': 4.0 }, ... }
        """
        import imageio_ffmpeg
        import tempfile
        import subprocess
        
        ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
        num_scenes = len(scene_videos)
        print(f"[Assembler] [ROBUST] Concatenando {num_scenes} escenas con Concat Demuxer...")
        
        final_path = os.path.join(self.output_dir, output_filename)
        normalized_videos = []
        
        try:
            for i, v_path in enumerate(scene_videos):
                v_path = os.path.abspath(v_path)
                if not os.path.exists(v_path):
                    print(f"[Assembler] ⚠️ Vídeo no encontrado: {v_path}")
                    continue
                
                # Aplicar recorte si existe en los metadatos
                if scene_edits and str(i) in scene_edits:
                    edit = scene_edits[str(i)]
                    start = edit.get("start", 0)
                    end = edit.get("end", 0)
                    if end > start:
                        print(f"[Assembler] ✂️ Recortando escena {i+1}: {start}s - {end}s")
                        v_path = self.trim_clip(v_path, start, end)

                norm_v_path = v_path.replace(".mp4", "_norm.mp4")
                
                # Normalizar audio a AAC para evitar fallos de concatenación
                cmd_with_audio = [
                    ffmpeg_exe, "-y", "-i", v_path,
                    "-c:v", "copy", "-c:a", "aac", "-ar", "44100", "-ac", "2",
                    norm_v_path
                ]
                
                res = subprocess.run(cmd_with_audio, capture_output=True, text=True)
                
                if res.returncode != 0:
                    # Inyectar silencio si falla la normalización
                    print(f"[Assembler] Vídeo {i} sin audio o error. Inyectando silencio...")
                    cmd_silent = [
                        ffmpeg_exe, "-y", "-i", v_path,
                        "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo",
                        "-c:v", "copy", "-c:a", "aac",
                        "-map", "0:v:0", "-map", "1:a:0", "-shortest",
                        norm_v_path
                    ]
                    subprocess.run(cmd_silent, capture_output=True, text=True)
                
                if os.path.exists(norm_v_path):
                    normalized_videos.append(norm_v_path)
                else:
                    normalized_videos.append(v_path)

            if not normalized_videos:
                return None

            with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False, encoding='utf-8') as f:
                for v in normalized_videos:
                    safe_v = os.path.abspath(v).replace('\\', '/')
                    f.write(f"file '{safe_v}'\n")
                list_path = f.name

            cmd_concat = [
                ffmpeg_exe, "-y", "-f", "concat", "-safe", "0",
                "-i", list_path, "-c", "copy", final_path
            ]
            
            res_concat = subprocess.run(cmd_concat, capture_output=True, text=True, encoding='utf-8', errors='replace')
            
            # Limpieza
            try: os.remove(list_path)
            except: pass
            
            if res_concat.returncode == 0 and os.path.exists(final_path):
                print(f"[Assembler] ✅ Concatenación exitosa: {final_path}")
                return os.path.abspath(final_path)
            else:
                if num_scenes == 1 and os.path.exists(scene_videos[0]):
                    shutil.copyfile(scene_videos[0], final_path)
                    return os.path.abspath(final_path)
                return None

        except Exception as e:
            print(f"[Assembler] Error crítico en concatenación: {e}")
            return None


    def assemble(self, video_path: str, hook_text: str = "", output_filename: str = "tiktok_ready.mp4") -> str:
        """
        Fase 5 (Postproducción): Prepara el vídeo final limpio.
        """
        if not os.path.exists(video_path):
            print("[Assembler] Error: No se encontro el video de entrada.")
            return None
            
        final_path = os.path.join(self.output_dir, output_filename)
        
        try:
            shutil.copyfile(video_path, final_path)
            print(f"[Assembler] Vídeo final preparado (limpio): {final_path}")
            return os.path.abspath(final_path)
        except Exception as e:
            print(f"[Assembler] Error al preparar video final: {e}")
            return os.path.abspath(video_path)

if __name__ == "__main__":
    a = Assembler()
    print("Módulo de postproducción cargado.")
