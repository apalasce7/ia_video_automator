"""
main.py — UGC Automator v2 Backend

Pipeline automatizado de 8 fases con Consola de Especialista (v3.2):
  1. Descargar vídeo viral
  2. Extraer fotogramas clave
  3. Seleccionar mejor fotograma
  4. Crear imagen base (Nano Banana 2 Edit)
  5. Director IA + Voz (Pausa Debug si activa)
  6. Generar vídeo (Seedance 2.0 / Kling 3.0)
  7. Finalizar Hook
  8. Overlay FFmpeg
"""

import os
import uuid
import shutil
import time

import json
import random
import sys
import io

# Forzar UTF-8 en Windows para evitar errores de 'charmap'
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')
from typing import List, Optional

from fastapi import FastAPI, BackgroundTasks, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from modules.tiktok_extractor import TikTokExtractor
from modules.wavespeed_client import WavespeedClient
from modules.brain import Brain
from modules.assembler import Assembler
from modules.cost_tracker import cost_tracker
from pydantic import BaseModel

app = FastAPI(title="UGC Automator v3.3 — DEBUG MODE")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def _log(msg: str):
    """Limpia emojis para evitar errores de codificación en la consola de Windows y guarda en el directorio de logs centralizado."""
    try:
        clean_msg = str(msg).encode("ascii", "ignore").decode("ascii")
        print(clean_msg)
        
        # Asegurar que el directorio de logs existe
        logs_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "logs")
        os.makedirs(logs_dir, exist_ok=True)
        log_path = os.path.join(logs_dir, "debug_error.log")
        
        with open(log_path, "a", encoding="utf-8") as f:
            f.write(f"\n[{time.strftime('%Y-%m-%d %H:%M:%S')}] {clean_msg}")
    except Exception as e:
        print(f"Error logging: {e}")

# Directorios fuera de backend/ para evitar reloads de uvicorn
# BASE_DIR es .../UGC/backend
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# ROOT_DIR es .../UGC
ROOT_DIR = os.path.abspath(os.path.join(BASE_DIR, ".."))

INFLUENCERS_DIR = os.path.join(ROOT_DIR, "data", "influencers")
UPLOAD_DIR = os.path.join(ROOT_DIR, "downloads", "uploads")
OUTPUT_DIR = os.path.join(ROOT_DIR, "downloads", "ready_to_upload")
TIKTOK_DIR = os.path.join(ROOT_DIR, "downloads", "tiktok")
LOGS_DIR = os.path.join(ROOT_DIR, "logs")
JOBS_FILE = os.path.join(ROOT_DIR, "data", "jobs.json")
INFLUENCERS_FILE = os.path.join(ROOT_DIR, "data", "influencers.json")
COSTS_FILE = os.path.join(ROOT_DIR, "data", "project_costs.json")

os.makedirs(LOGS_DIR, exist_ok=True)

def _abs(path: str) -> str:
    """Helper para asegurar rutas absolutas desde la raíz del proyecto."""
    if not path: return ""
    if path.startswith("http"): return path # Si es una URL, devolverla tal cual
    return os.path.abspath(os.path.join(ROOT_DIR, path))

def _abs_opt(path):
    if not path: return None
    return _abs(path)

def _get_url(path):
    """Convierte una ruta absoluta o relativa en una URL accesible por el frontend."""
    if not path: return ""
    if path.startswith("http"): return path
    
    # Si es ruta absoluta, obtener la relativa respecto a ROOT_DIR
    if os.path.isabs(path):
        try:
            rel = os.path.relpath(path, ROOT_DIR)
        except:
            return path # Fallback
    else:
        rel = path
    
    # Normalizar barras para URL
    url_path = rel.replace(os.sep, "/")
    return f"http://localhost:8000/{url_path}"

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(INFLUENCERS_DIR, exist_ok=True)

if not os.path.exists(INFLUENCERS_FILE):
    with open(INFLUENCERS_FILE, "w") as f:
        json.dump([], f)

app.mount("/downloads", StaticFiles(directory=os.path.join(ROOT_DIR, "downloads")), name="downloads")
app.mount("/data", StaticFiles(directory=os.path.join(ROOT_DIR, "data")), name="data")
app.mount("/influencers", StaticFiles(directory=INFLUENCERS_DIR), name="influencers")

jobs = {}

def load_jobs():
    _log(f"[Debug] Loading jobs from: {JOBS_FILE}")
    if os.path.exists(JOBS_FILE):
        try:
            with open(JOBS_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                jobs.update(data)
                _log(f"[Debug] Loaded {len(data)} jobs.")
            # Realizar migración de rutas antiguas si las hay
            migrate_stale_paths()
        except Exception as e:
            _log(f"Error loading jobs: {e}")
    else:
        _log(f"[Debug] JOBS_FILE NOT FOUND at {JOBS_FILE}")

def migrate_stale_paths():
    """Corrige rutas antiguas y asegura que todos los trabajos tengan fecha de creación."""
    _log("[Migration] Verificando integridad y fechas en trabajos...")
    modified = False
    from datetime import datetime
    for job in jobs.values():
        # 1. Migración de fecha de creación
        if "created_at" not in job:
            job_id = job.get("id")
            job_dir = os.path.join(UPLOAD_DIR, job_id) if job_id else None
            if job_dir and os.path.exists(job_dir):
                try:
                    ctime = os.path.getctime(job_dir)
                    job["created_at"] = datetime.fromtimestamp(ctime).strftime("%Y-%m-%d %H:%M:%S")
                except:
                    job["created_at"] = "Fecha desconocida"
            else:
                job["created_at"] = "Fecha desconocida"
            modified = True

        data = job.get("data", {})
        # Corregir influencer_path
        p = data.get("influencer_path")
        if p and isinstance(p, str):
            if "data/models/" in p:
                data["influencer_path"] = p.replace("data/models/", "data/influencers/")
                modified = True
            elif "influencers/" in p and not p.startswith("data/"):
                data["influencer_path"] = p.replace("influencers/", "data/influencers/")
                modified = True
        
        # Corregir influencer_sheet_path
        ps = data.get("influencer_sheet_path")
        if ps and isinstance(ps, str):
            if "data/models/" in ps:
                data["influencer_sheet_path"] = ps.replace("data/models/", "data/influencers/")
                modified = True
            elif "influencers/" in ps and not ps.startswith("data/"):
                data["influencer_sheet_path"] = ps.replace("influencers/", "data/influencers/")
                modified = True
            
        # Corregir paths de resultados
        results = job.get("phases_results", {})
        for res_key, res_val in results.items():
            if isinstance(res_val, str):
                if "data/models/" in res_val:
                    results[res_key] = res_val.replace("data/models/", "data/influencers/")
                    modified = True
                elif "influencers/" in res_val and "http" not in res_val and not res_val.startswith("data/"):
                    results[res_key] = res_val.replace("influencers/", "data/influencers/")
                    modified = True
                
    if modified:
        _log("[Migration] Rutas actualizadas. Guardando jobs.json...")
        save_jobs()
    else:
        _log("[Migration] Todo en orden.")

def save_jobs():
    try:
        with open(JOBS_FILE, "w", encoding="utf-8") as f:
            json.dump(jobs, f, indent=4, ensure_ascii=False)
    except Exception as e:
        with open(os.path.join(BASE_DIR, "..", "jobs_error.log"), "a") as f:
            import traceback
            f.write(f"\n[save_jobs ERROR] {str(e)}\n{traceback.format_exc()}\n")
        _log(f"Error saving jobs: {e}")

def check_interrupted_jobs():
    """Busca trabajos que quedaron en estado '🔄' y los marca como interrumpidos para evitar bloqueos."""
    _log("[Recovery] Verificando trabajos interrumpidos...")
    modified = False
    for job_id, job in jobs.items():
        status = job.get("status", "")
        # Si está en un estado transitorio (empezando con 🔄 o con nombres de fase activos)
        # y no hay un hilo activo (esto es difícil de saber con hilos, pero podemos ver el tiempo)
        if status in ["base_image", "director", "video", "audio", "ffmpeg"] or (isinstance(job.get("phases", {}).get(status), str) and "🔄" in job.get("phases", {}).get(status)):
            _log(f"[Recovery] ⚠️ Job {job_id} detectado como interrumpido (estado: {status}).")
            job["status"] = f"interrumpido_{status}"
            job["phases"][status] = "⚠️ Interrumpido por reinicio del servidor"
            modified = True
    
    if modified:
        _log("[Recovery] Estados de trabajos actualizados. Guardando...")
        save_jobs()
    else:
        _log("[Recovery] Sin trabajos interrumpidos.")

load_jobs()
check_interrupted_jobs()


@app.post("/api/produce")
async def produce_ugc(
    job_id: Optional[str] = Form(None),
    tiktok_url: Optional[str] = Form(None),
    direct_image: Optional[UploadFile] = File(None),
    selected_frame_url: Optional[str] = Form(None),
    influencer_id: Optional[str] = Form(None),
    influencer_name: Optional[str] = Form(None),
    influencer_image: Optional[UploadFile] = File(None),
    influencer_sheet: Optional[UploadFile] = File(None),
    product_images: List[UploadFile] = File(...),
    product_name: str = Form(...),
    product_details: str = Form(...),
    duration: int = Form(5),
    cfg_scale: float = Form(0.5),
    shot_type: str = Form("customize"),
    negative_prompt: str = Form(""),
    model: str = Form("seedance"),
    use_voice: bool = Form(False),
    skip_video: bool = Form(False),
    debug_mode: bool = Form(False),
    resolution: str = Form("480p"),
    story_guide: Optional[str] = Form(None),
    audio_mode: str = Form("lip-sync"),
    auto_execution: str = Form("false"),
    language: str = Form("es"),
    edit_style: str = Form("fast-cuts"),
    director_model: str = Form("minimax"),
    voice_print: Optional[str] = Form(None),
    background_tasks: BackgroundTasks = None
):
    # Ayudante para booleanos que vienen como string desde el frontend
    def _tobool(v):
        if isinstance(v, bool): return v
        return str(v).lower() in ["true", "1", "t", "y", "yes"]

    try:
        job_id_val = job_id if (job_id and job_id in jobs) else str(uuid.uuid4())
        job_dir = os.path.join(UPLOAD_DIR, job_id_val)
        if not os.path.exists(job_dir): os.makedirs(job_dir, exist_ok=True)
        
        current_job_id = job_id_val

        influencer_path = None
        influencer_sheet_path = None
        influencer_seed = None
        influencer_voice_print = None

        if influencer_id and influencer_id != "new":
            if not os.path.exists(INFLUENCERS_FILE):
                return {"error": "Archivo de biblioteca de influencers no encontrado"}
            with open(INFLUENCERS_FILE, "r") as f:
                library = json.load(f)
                found = next((i for i in library if i["id"] == influencer_id), None)
                if found:
                    influencer_path = found.get("local_path")
                    influencer_sheet_path = found.get("sheet_path")
                    influencer_name = found.get("name")
                    influencer_seed = found.get("seed")

        if not influencer_path and influencer_image:
            influencer_path = os.path.join(job_dir, f"influencer_face{_get_ext(influencer_image.filename)}")
            with open(influencer_path, "wb") as f:
                content = await influencer_image.read()
                f.write(content)
            # Para modelos nuevas ad-hoc, generamos un seed para este job
            influencer_seed = random.randint(100000, 999999)

        # Lógica de voz dinámica por proyecto (basado en el idioma o override del frontend)
        if voice_print:
            influencer_voice_print = voice_print
        elif language == "es":
            influencer_voice_print = "25-year-old female, native Castilian Spanish from Spain, energetic UGC tone, slightly raspy timbre, close-mic volume, consistent mid-range pitch, conversational pacing."
        elif language == "es-latam":
            influencer_voice_print = "25-year-old female, native Latin American Spanish (Mexico), energetic UGC tone, slightly raspy timbre, close-mic volume, consistent mid-range pitch, conversational pacing."
        elif language == "en":
            influencer_voice_print = "25-year-old female, native American English, energetic UGC tone, slightly raspy timbre, close-mic volume, consistent mid-range pitch, conversational pacing."
        elif language == "fr":
            influencer_voice_print = "25-year-old female, native French from France, energetic UGC tone, slightly raspy timbre, close-mic volume, consistent mid-range pitch, conversational pacing."
        elif language == "de":
            influencer_voice_print = "25-year-old female, native German, energetic UGC tone, slightly raspy timbre, close-mic volume, consistent mid-range pitch, conversational pacing."
        elif language == "it":
            influencer_voice_print = "25-year-old female, native Italian, energetic UGC tone, slightly raspy timbre, close-mic volume, consistent mid-range pitch, conversational pacing."
        elif language == "pt":
            influencer_voice_print = "25-year-old female, native Portuguese from Portugal, energetic UGC tone, slightly raspy timbre, close-mic volume, consistent mid-range pitch, conversational pacing."
        else:
            influencer_voice_print = "25-year-old female, energetic UGC tone, slightly raspy timbre, close-mic volume, consistent mid-range pitch, conversational pacing."

        if influencer_sheet:
            influencer_sheet_path = os.path.join(job_dir, f"influencer_sheet{_get_ext(influencer_sheet.filename)}")
            with open(influencer_sheet_path, "wb") as f:
                content = await influencer_sheet.read()
                f.write(content)
        
        product_paths = []
        for i, prod_file in enumerate(product_images):
            prod_path = os.path.join(job_dir, f"product_{i}{_get_ext(prod_file.filename)}")
            with open(prod_path, "wb") as f:
                content = await prod_file.read()
                f.write(content)
            product_paths.append(prod_path)

        # --- MANEJO DE IMAGEN DIRECTA ---
        direct_image_path = None
        if direct_image:
            temp_path = os.path.join(job_dir, f"direct_source{_get_ext(direct_image.filename)}")
            with open(temp_path, "wb") as f:
                f.write(await direct_image.read())
            
            # Recortar a 9:16 automáticamente
            extractor = TikTokExtractor()
            direct_image_path = extractor.smart_crop_to_916(temp_path)

        if current_job_id not in jobs:
            now = time.strftime("%Y-%m-%d %H:%M:%S")
            jobs[current_job_id] = {
                "id": current_job_id, 
                "status": "creado", 
                "created_at": now,
                "data": {}, 
                "phases": {}, 
                "phases_results": {}
            }

        data = jobs[current_job_id]["data"]
        
        if selected_frame_url and "frame_urls" in data and selected_frame_url in data["frame_urls"]:
            idx = data["frame_urls"].index(selected_frame_url)
            data["best_frame"] = data["all_frames"][idx]

        data.update({
            "tiktok_url": tiktok_url or "Modo Imagen Directa",
            "influencer_id": influencer_id,
            "influencer_name": influencer_name,
            "influencer_path": influencer_path,
            "influencer_sheet_path": influencer_sheet_path,
            "seed": influencer_seed,
            "voice_print": influencer_voice_print,
            "product_paths": product_paths[:3],
            "product_name": product_name,
            "product_details": product_details,
            "duration": int(duration),
            "cfg_scale": float(cfg_scale),
            "shot_type": shot_type,
            "negative_prompt": negative_prompt,
            "model": model,
            "use_voice": _tobool(use_voice),
            "skip_video": _tobool(skip_video),
            "debug_mode": _tobool(debug_mode),
            "resolution": resolution,
            "story_guide": story_guide,
            "audio_mode": audio_mode,
            "auto_execution": _tobool(auto_execution),
            "language": language,
            "edit_style": edit_style,
            "director_model": director_model,
        })

        # Si tenemos imagen directa, ya tenemos el "best_frame"
        if direct_image_path:
            data["best_frame"] = direct_image_path
            # Marcamos que las fases iniciales ya están "listas"
            jobs[current_job_id]["phases"]["download"] = "✅ Omitido (Modo Imagen)"
            jobs[current_job_id]["phases"]["extract_frames"] = "✅ Omitido (Modo Imagen)"
            
            _update_phase(jobs[current_job_id], 3, "select_frame", "✅ Imagen directa lista", _get_url(direct_image_path))

        jobs[current_job_id]["status"] = "pipeline_iniciado"
        if background_tasks:
            background_tasks.add_task(run_ugc_pipeline_v2, current_job_id, background_tasks)
        
        return {"job_id": current_job_id, "message": "Pipeline iniciado."}
    except Exception as e:
        _log(f"[Error] /api/produce: {str(e)}")
        import traceback; traceback.print_exc()
        return {"error": f"Error interno al preparar la producción: {str(e)}"}

@app.post("/api/analyze")
async def analyze_tiktok(tiktok_url: str = Form(...)):
    job_id = str(uuid.uuid4())
    job_dir = os.path.join(UPLOAD_DIR, job_id)
    os.makedirs(job_dir, exist_ok=True)
    extractor = TikTokExtractor()
    try:
        video_info = extractor.download_video(tiktok_url, job_id)
        video_path = video_info["video_path"]
        frames = extractor.extract_keyframes(video_path, num_frames=8)
        best_frame = extractor.select_best_frame(frames)
        
        rel_video = os.path.relpath(video_path, ROOT_DIR)
        video_url = _get_url(video_path)
        frame_urls = [_get_url(f) for f in frames]
        best_frame_url = _get_url(best_frame)

        jobs[job_id] = {
            "id": job_id, "status": "analizado", "phases": {}, "phases_results": {},
            "created_at": time.strftime("%Y-%m-%d %H:%M:%S"),
            "data": {
                "tiktok_url": tiktok_url, "viral_video": video_path, "video_url": video_url,
                "all_frames": frames, "frame_urls": frame_urls, "best_frame": best_frame,
                "best_frame_url": best_frame_url, "video_caption": video_info.get("description", ""),
            }
        }
        return {"job_id": job_id, "video_url": video_url, "frames": frame_urls, "recommended_frame": best_frame_url}
    except Exception as e:
        return {"error": str(e)}

class SearchRequest(BaseModel):
    name: str

@app.post("/api/search_product")
async def search_product(req: SearchRequest):
    try:
        brain = Brain()
        # Nota: aquí no tenemos job_id aún, se podría pasar uno temporal o ignorar el coste de investigación
        details = brain.search_product_info(req.name)
        return {"details": details}
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/costs/{job_id}")
async def get_project_costs(job_id: str):
    return {
        "job_id": job_id,
        "total_cost": cost_tracker.get_job_cost(job_id),
        "details": cost_tracker._load_data().get(job_id, {}).get("logs", [])
    }

@app.get("/api/balance")
async def get_wavespeed_balance():
    ws = WavespeedClient()
    return {"balance": ws.get_balance()}

# ─── DEEPL PROXY ───
class TranslateRequest(BaseModel):
    texts: List[str]
    target_lang: str = "ES"
    source_lang: Optional[str] = None

DEEPL_API_KEY = os.getenv("DEEPL_API_KEY", "d586df09-e6e5-472c-9fb7-36a0c17413af:fx")
DEEPL_URL = "https://api-free.deepl.com/v2/translate"

@app.post("/api/translate")
async def translate_proxy(req: TranslateRequest):
    """Proxy para la API de DeepL. Evita restricciones CORS del browser.
    La clave de API nunca se expone al cliente."""
    import httpx

    if not req.texts or all(not t.strip() for t in req.texts):
        return {"translations": [{"text": t} for t in req.texts]}

    payload: dict = {
        "text": req.texts,
        "target_lang": req.target_lang,
    }
    if req.source_lang:
        payload["source_lang"] = req.source_lang

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                DEEPL_URL,
                json=payload,
                headers={
                    "Authorization": f"DeepL-Auth-Key {DEEPL_API_KEY}",
                    "Content-Type": "application/json",
                },
            )
            response.raise_for_status()
            return response.json()
    except httpx.HTTPStatusError as e:
        _log(f"[DeepL] HTTP error {e.response.status_code}: {e.response.text}")
        return {"error": f"DeepL error {e.response.status_code}", "translations": [{"text": t} for t in req.texts]}
    except Exception as e:
        _log(f"[DeepL] Error: {e}")
        return {"error": str(e), "translations": [{"text": t} for t in req.texts]}

@app.post("/api/capture_frame")
def capture_frame(job_id: str = Form(...), timestamp: float = Form(...)):
    if job_id not in jobs: return {"error": "Job no encontrado"}
    data = jobs[job_id]["data"]
    video_path = data.get("viral_video")
    if not video_path: return {"error": "No hay vídeo descargado para capturar"}
    
    extractor = TikTokExtractor()
    out_name = f"manual_frame_{int(timestamp*1000)}.png"
    try:
        frame_path = extractor.extract_frame_at(video_path, timestamp, out_name)
        if not frame_path: return {"error": "Fallo la extracción del manual frame"}
        
        rel_path = os.path.relpath(frame_path, ROOT_DIR)
        frame_url = f"http://localhost:8000/{rel_path.replace(os.sep, '/')}"
        
        data.setdefault("all_frames", []).append(frame_path)
        data.setdefault("frame_urls", []).append(frame_url)
        data["best_frame"] = frame_path
        data["best_frame_url"] = frame_url
        
        save_jobs()
        return {"frame_url": frame_url}
    except Exception as e:
        return {"error": str(e)}

@app.post("/api/jobs/{job_id}/continue")
def continue_render(job_id: str, background_tasks: BackgroundTasks, prompt: Optional[str] = Form(None), plan: Optional[str] = Form(None)):
    if job_id not in jobs: return {"error": "Job no encontrado"}
    if prompt: jobs[job_id]["data"]["manual_prompt"] = prompt
    if plan:
        try:
            jobs[job_id]["data"]["story_plan"] = json.loads(plan)
        except Exception as e:
            _log(f"Error parsing manual plan: {e}")
    jobs[job_id]["status"] = "continuando_produccion"
    
    # Al aprobar el plan, marcamos la fase de director como completada
    _update_phase(jobs[job_id], 6, "director", "✅ Guion confirmado")
    save_jobs() # Doble seguro
    
    background_tasks.add_task(run_ugc_pipeline_v2, job_id, background_tasks, start_at_phase=6)
    return {"status": "ok", "message": "Pipeline reanudado"}

@app.post("/api/jobs/{job_id}/approve_base_image")
def approve_base_image(job_id: str, background_tasks: BackgroundTasks):
    """Aprueba la imagen base clonada y continúa el pipeline desde el Director IA (Fase 5)."""
    if job_id not in jobs: return {"error": "Job no encontrado"}
    job = jobs[job_id]
    if job.get("status") != "esperando_aprobacion_imagen_base":
        return {"error": f"El job no está esperando aprobación de imagen base (status: {job.get('status')})"}
    
    _log(f"[Pipeline] ✅ Imagen base aprobada para job {job_id}. Continuando con Director IA...")
    
    # Actualizar estado a completado ANTES de lanzar la siguiente tarea
    # Al aprobar la imagen base, marcamos esa fase como lista y la de elementos como completada automáticamente
    _update_phase(job, 4, "base_image", "✅ Imagen base lista")
    _update_phase(job, 5, "elements", "✅ Completado")
    job["status"] = "continuando_director"
    save_jobs()
    
    background_tasks.add_task(run_ugc_pipeline_v2, job_id, background_tasks, start_at_phase=5)
    return {"status": "ok", "message": "Imagen base aprobada. Iniciando Director IA..."}

@app.post("/api/jobs/{job_id}/replay")
def replay_job(job_id: str, background_tasks: BackgroundTasks, phase: int = Form(...), director_model: str = Form(None)):
    _log(f"--- [REPLAY REQUEST] Job: {job_id} | Phase: {phase} ---")
    if job_id not in jobs:
        return {"error": "Job no encontrado"}
    job = jobs[job_id]
    data = job["data"]
    
    if director_model:
        data["director_model"] = director_model
    
    # 1. Limpiamos las fases en el UI
    phases_keys = ["download", "extract_frames", "select_frame", "base_image", "director", "audio", "video", "ffmpeg"]
    job_phases = job["phases"]
    
    for i in range(phase - 1, len(phases_keys)):
        k = phases_keys[i]
        if k in job_phases:
            del job_phases[k]
            
    # 2. Limpieza INTELIGENTE de datos previos para forzar re-ejecución
    # Si re-ejecuta desde X, borramos el resultado de X y siguientes
    if phase <= 3: # Select Frame
        data.pop("best_frame", None)
        data.pop("best_frame_url", None)
    if phase <= 4: # Base Image
        data.pop("base_image_path", None)
    if phase <= 5: # Director
        data.pop("visual_desc", None)
        data.pop("base_image_desc", None)
        data.pop("story_plan", None)
        data.pop("current_scene_idx", None)
        data.pop("scene_results", None)
        data.pop("scene_audios", None)
    if phase <= 6: # Video bucle
        data["current_scene_idx"] = 0
        data["scene_results"] = []
        data["scene_audios"] = []
    if phase <= 8: # FFMPEG
        data.pop("final_video_url", None)

    job["status"] = f"re-ejecutando_desde_fase_{phase}"
    save_jobs()
    background_tasks.add_task(run_ugc_pipeline_v2, job_id, background_tasks, start_at_phase=phase)
    return {"status": "ok", "message": f"Repetición desde Fase {phase} iniciada"}

@app.post("/api/jobs/{job_id}/purge")
def purge_job(job_id: str):
    if job_id == "all":
        if os.path.exists(UPLOAD_DIR): shutil.rmtree(UPLOAD_DIR)
        os.makedirs(UPLOAD_DIR, exist_ok=True)
        jobs.clear()
        return {"status": "ok", "message": "MEMORIA Y DISCO PURGADOS"}
    
    job_dir = os.path.join(UPLOAD_DIR, job_id)
    if os.path.exists(job_dir): shutil.rmtree(job_dir)
    if job_id in jobs: 
        del jobs[job_id]
        save_jobs()
    return {"status": "ok", "message": "Job purgado"}

# ─── PIPELINE MAESTRO ───
def run_ugc_pipeline_v2(job_id: str, background_tasks: BackgroundTasks, start_at_phase: int = 1):
    _log(f"--- [TASK START] Job: {job_id} | Phase: {start_at_phase} ---")
    try:
        if job_id not in jobs:
            _log(f"[Error] Job {job_id} no encontrado en memoria al iniciar tarea.")
            return

        job = jobs[job_id]
        data = job["data"]
        
        _log(f"[Pipeline] Inicializando módulos para {job_id[:8]}...")
        try:
            extractor = TikTokExtractor()
            ws = WavespeedClient()
            brain = Brain()
            asm = Assembler(output_dir=OUTPUT_DIR)
            _log(f"[Pipeline] Módulos inicializados correctamente.")
        except Exception as mod_err:
            _log(f"[Error] Fallo al inicializar módulos: {mod_err}")
            job["status"] = f"error: initialization_failed ({str(mod_err)})"
            save_jobs()
            return
        
        # Estado inicial para evitar NaN% en el frontend
        if "phase" not in job or job.get("phase") == 0:
            job["phase"] = start_at_phase
            save_jobs()
        
        # Recuperar estado
        base_image = data.get("base_image_path", "")
        seedance_refs = data.get("seedance_refs_paths", [])
        audio_path = data.get("audio_path_local", "")

        # Inicialización de payloads de seguridad para evitar UnboundLocalError
        payload_f3, payload_f4, payload_f5, payload = {}, {}, {}, {}

        # Fase 1: Descarga
        if start_at_phase <= 1:
            if not data.get("viral_video") and data.get("tiktok_url") != "Modo Imagen Directa":
                _update_phase(job, 1, "download", "🔄 Descargando viral...")
                info = extractor.download_video(data["tiktok_url"], job_id)
                data["viral_video"], data["video_caption"] = info["video_path"], info.get("description", "")
                job["phases"]["download"] = "✅ Listo"
            elif data.get("tiktok_url") == "Modo Imagen Directa":
                job["phases"]["download"] = "✅ Omitido"

        # Fase 2: Keyframes
        if start_at_phase <= 2:
            if not data.get("all_frames") and data.get("tiktok_url") != "Modo Imagen Directa":
                data["all_frames"] = extractor.extract_keyframes(data["viral_video"], num_frames=8)
                job["phases"]["extract_frames"] = "✅ Listo"
            elif data.get("tiktok_url") == "Modo Imagen Directa":
                job["phases"]["extract_frames"] = "✅ Omitido"

        # Fase 3: Select Frame
        if start_at_phase <= 3:
            all_frames = data.get("all_frames", [])
            if not data.get("best_frame"):
                if all_frames:
                    data["best_frame"] = extractor.select_best_frame(all_frames)
                # En Modo Imagen Directa best_frame ya está seteado desde /api/produce, no hay all_frames
            if not data.get("best_frame"):
                _update_phase(job, 3, "select_frame", "❌ Error: no hay frame ni imagen base disponible")
                job["status"] = "error: no_frame"
                save_jobs()
                return
            payload_f3 = {"all_frames_count": len(all_frames), "selected": data["best_frame"]}
            _update_phase(job, 3, "select_frame", "✅ Frame seleccionado", _get_url(data["best_frame"]), payload=payload_f3)

        # Fase 4: Base Image
        if start_at_phase <= 4:
            if not data.get("base_image_path"):
                payload_f4 = {
                    "influencer": data["influencer_path"], 
                    "sheet": data.get("influencer_sheet_path"),
                    "viral_frame": data["best_frame"], 
                    "model": "google/nano-banana-2"
                }
                _update_phase(job, 4, "base_image", "🔄 Creando imagen base...", payload=payload_f4)
                try:
                    data["base_image_path"] = ws.create_base_image(_abs(data["influencer_path"]), _abs(data["best_frame"]), _abs_opt(data.get("influencer_sheet_path")), job_id=job_id)
                except Exception as e:
                    _log(f"[Pipeline] ❌ Error crítico en Nano Banana: {e}")
                    job["status"] = "error: nanobanana_failed"
                    _update_phase(job, 4, "base_image", f"❌ Error API: {str(e)}")
                    return

            base_image_path = data.get("base_image_path")
            if not base_image_path:
                _log("[Pipeline] ⚠️ Error: No se generó la ruta de la imagen base")
                job["status"] = "error: base_image_missing"
                save_jobs()
                return

            _update_phase(job, 4, "base_image", "✅ Imagen base lista", _get_url(base_image_path), payload=payload_f4 if 'payload_f4' in locals() else {})
            
            # ⏸️ Pausa iterativa: solo si no ha sido aprobada ya (evita bucles de pausa en re-ejecuciones)
            should_pause = (not data.get("auto_execution", True) or data.get("debug_mode")) and job.get("status") not in ["continuando_director", "esperando_aprobacion_plan", "esperando_revision", "video", "esperando_aprobacion_escena", "completado"]
            if should_pause:
                _update_phase(job, 4, "base_image", "⏸️ Imagen base lista. Revisa y aprueba antes del Director.", _get_url(base_image_path), payload=payload_f4 if 'payload_f4' in locals() else {})
                job["status"] = "esperando_aprobacion_imagen_base"
                save_jobs()
                return  # Espera aprobación manual antes de continuar

        # Fase 5: AI Brain (Director)
        if start_at_phase <= 5:
            if not data.get("visual_desc"):
                data["visual_desc"] = ws.analyze_product_image(data["product_paths"][0], job_id=job_id)
            
            if not data.get("base_image_desc"):
                base_img_to_analyze = data.get("base_image_path") or data.get("best_frame") or data["all_frames"][0]
                data["base_image_desc"] = ws.analyze_product_image(
                    _abs(base_img_to_analyze), 
                    prompt="Describe concisely the environment, setting, background, and lighting in this image. Ignore any people.",
                    job_id=job_id
                )
            
            # Mapeo de referencias para Seedance-2.0 (Sistema Estricto de 6 Imágenes)
            # @Image1: Función de primer fotograma base (entorno/composición)
            # @Image2: Rostro influencer (identidad)
            # @Image3: Hoja de personaje influencer (cuerpo/ropa)
            # @Image4-6: Productos 1, 2 y 3.
            
            # Inicializamos lista de 6 posiciones con el fondo (base_image) como relleno de seguridad
            base_img = data.get("base_image_path")
            refs = [base_img] * 6 
            
            # Posición 2: Cara
            if data.get("influencer_path"): refs[1] = data.get("influencer_path")
            # Posición 3: Hoja de Personaje
            if data.get("influencer_sheet_path"): refs[2] = data.get("influencer_sheet_path")
            # Posiciones 4, 5, 6: Productos
            products = data.get("product_paths", [])
            for i in range(min(len(products), 3)):
                refs[3 + i] = products[i]
            
            mapping = (
                "@Image1: Función de primer fotograma base (entorno/composición).\n"
                "@Image2: Rostro influencer (identidad).\n"
                "@Image3: Hoja de personaje influencer (cuerpo/ropa).\n"
                "@Image4: Producto 1.\n"
                "@Image5: Producto 2.\n"
                "@Image6: Producto 3."
            )

            # --- NUEVA LÓGICA DE ACTUALIZACIÓN DE FASE 5 (REGISTRO DE ELEMENTOS) ---
            _update_phase(job, 5, "elements", "✅ Completado")
            # -----------------------------------------------------------------------

            payload_f5 = {
                "product": data["product_name"],
                "visual_desc": data["visual_desc"],
                "duration": data.get("duration", 5),
                "audio_mode": data.get("audio_mode", "lip-sync")
            }
            _log(f"[Job {job_id[:8]}] Fase 6: Orquestando escena con Gemini...")
            _update_phase(job, 6, "director", "Orquestando escena con Gemini...", payload=payload_f5)
            
            story_plan = brain.generate_story_plan(
                data["product_name"], 
                data["product_details"], 
                data.get("influencer_name", "Host"), 
                data.get("duration", 15), 
                data.get("visual_desc", ""), 
                data.get("base_image_desc", ""), 
                mapping, 
                data.get("audio_mode", "lip-sync"),
                data.get("story_guide", ""),
                data.get("language", "es"),
                data.get("edit_style", "fast-cuts"),
                data.get("voice_print", ""),
                provider=data.get("director_model", "minimax"),
                job_id=job_id
            )
            
            if "error" in story_plan:
                _update_phase(job, 5, "director", f"❌ Error en planificación: {story_plan['error']}")
                return

            if "clips" in story_plan and "escenas" not in story_plan:
                story_plan["escenas"] = story_plan["clips"]

            data["story_plan"] = story_plan
            data["current_scene_idx"] = 0
            data["scene_results"] = []
            data["scene_audios"] = []
            data["seedance_refs_paths"] = refs
            
            # Decidir si pausar o continuar (Ahora por defecto siempre pausamos si no se indica auto explícitamente)
            should_pause = (not data.get("auto_execution", False) or data.get("debug_mode")) and job.get("status") not in ["video", "esperando_aprobacion_escena", "completado"]
            if should_pause:
                status_to_set = "esperando_aprobacion_plan" if not data.get("auto_execution", False) else "esperando_revision"
                director_msg = "⏸️ Esperando aprobación de plan" if status_to_set == "esperando_aprobacion_plan" else "⏸️ Esperando revisión (Debug)"
                
                # Actualizar status final antes de pausar usando _update_phase para consistencia
                _update_phase(job, 6, "director", director_msg, res=story_plan)
                job["status"] = status_to_set
                save_jobs()
                
                _log(f"[Pipeline] ⏸️ Pausado en Director: {status_to_set}")
                return # Pausa para revisión manual

        # Fase 6: Bucle de Clips de Video
        if start_at_phase <= 6:
            plan = data.get("story_plan", {})
            scenes = plan.get("escenas", plan.get("clips", []))
            
            is_auto = data.get("auto_execution", False)
            if isinstance(is_auto, str):
                is_auto = is_auto.lower() == "true"
            
            while data.get("current_scene_idx", 0) < len(scenes):
                idx = data.get("current_scene_idx", 0)
                scene = scenes[idx]
                
                _log(f"\n[Pipeline] 🎬 Generando ESCENA {idx+1}/{len(scenes)} (Job: {job_id[:8]})")
                _update_phase(job, 7, "video", f"🎬 Generando Escena {idx+1}...")
                
                # Referencias y Continuidad
                current_base_image = data.get("base_image")
                current_refs = list(data.get("seedance_refs_paths", []))
                
                # Si no es la primera escena, intentar extraer frame de continuidad
                if idx > 0 and data.get("scene_results"):
                    prev_video = data["scene_results"][idx-1]
                    prev_scene = scenes[idx-1]
                    
                    extractor = TikTokExtractor()
                    actual_duration = extractor._get_video_duration(_abs(prev_video))
                    if actual_duration <= 0:
                        actual_duration = prev_scene.get("duracion", 5)
                        
                    extract_time = max(0, actual_duration - 0.2)
                    unique_cont_name = f"continuity_{job_id[:8]}_sc{idx}_{int(time.time())}.png"
                    cont_frame = extractor.extract_frame_at(_abs(prev_video), timestamp=extract_time, output_name=unique_cont_name)
                    
                    if cont_frame: 
                        current_base_image = cont_frame
                        current_refs[0] = cont_frame

                # Generar Video
                prompt = scene.get("prompt_visual_ingles", scene.get("prompt_visual", ""))
                script = scene.get("script_completo", "")
                a_mode = data.get("audio_mode", "mixed")
                ref_audio = None
                
                video, payload = ws.generate_video_seedance(
                    _abs(current_base_image), 
                    prompt, 
                    [_abs(r) for r in current_refs], 
                    ref_audio, 
                    duration=scene.get("duracion", 5), 
                    resolution=data.get("resolution", "480p"),
                    script=script,
                    audio_mode=a_mode,
                    is_first_scene=(idx == 0),
                    seed=data.get("seed"),
                    language=data.get("language", "es"),
                    job_id=job_id
                )
                
                if not data.get("scene_results"): data["scene_results"] = []
                
                # Gestión de Historial
                if "scene_history" not in data:
                    data["scene_history"] = {}
                
                s_idx_str = str(idx)
                if s_idx_str not in data["scene_history"]:
                    data["scene_history"][s_idx_str] = []
                
                # Solo añadir al historial si no está ya (evitar duplicados si re-lanzamos el polling)
                if video not in data["scene_history"][s_idx_str]:
                    data["scene_history"][s_idx_str].append(video)
                
                # El resultado activo es siempre el último generado por defecto
                if idx < len(data["scene_results"]):
                    data["scene_results"][idx] = video
                else:
                    data["scene_results"].append(video)
                
                _update_phase(job, 7, "video", f"✅ Escena {idx+1} lista", _get_url(video), payload=payload)
                
                # LÓGICA DE PAUSA O AVANCE
                if not is_auto or data.get("debug_mode"):
                    _log(f"[Pipeline] ⏸️ Escena {idx+1} completada. Pausando para aprobación del usuario.")
                    pause_msg = f"✅ Escena {idx+1} lista. Revisa y aprueba para continuar."
                    _update_phase(job, 7, "video", pause_msg, _get_url(video), payload=payload)
                    job["status"] = "esperando_aprobacion_escena"
                    save_jobs()
                    return # Salir del pipeline. El usuario relanzará vía approve_scene -> run_ugc_pipeline_v2
                else:
                    # Modo automático: Incrementar índice y seguir en el bucle
                    _log(f"[Pipeline] ⏩ Modo automático. Continuando a la siguiente escena...")
                    data["current_scene_idx"] = idx + 1
                    save_jobs()
                    # No hacemos return, el bucle while sigue a la siguiente iteración

            # GUARD DE CONTINUIDAD: Solo avanzar a Fase 7/8 si todas las escenas están realmente listas
            results = data.get("scene_results", [])
            if len(results) < len(scenes) or any(v is None for v in results):
                _log(f"[Pipeline] ⏸️ Deteniendo pipeline en Fase 6. Faltan escenas por generar ({len(results)}/{len(scenes)}).")
                return # No avanzamos a Fase 7/8 hasta que el bucle o el usuario terminen todas las escenas.

        # Fase 7 & 8: Hook + Assembler
        if start_at_phase <= 7:
            # Fallback a la premisa si no hay hook específico
            data["hook"] = data.get("manual_prompt") or data.get("story_plan", {}).get("premisa", "Look at this!")
        
        # Fase 8: Assembler (Concatenación + Hook)
        if start_at_phase <= 9:
            _update_phase(job, 9, "ffmpeg", "[RUN] Ensamblando escenas...")
            
            # Filtramos nulos y escenas excluidas para evitar que el ensamblador falle
            scene_edits = data.get("scene_edits", {})
            scene_videos = []
            results = data.get("scene_results", [])
            for i, v in enumerate(results):
                if v and not scene_edits.get(str(i), {}).get("excluded"):
                    scene_videos.append(v)

            scene_audios = [a for a in data.get("scene_audios", []) if a]
            
            if not scene_videos:
                _update_phase(job, 8, "ffmpeg", "❌ Error: No hay escenas generadas o todas están excluidas")
                job["status"] = "error: no_scenes"
                return

            # 1. Concatenar todas las escenas
            if data.get("edit_style") == "standard":
                _update_phase(job, 8, "ffmpeg", "🎬 Ensamblando escenas (Modo Standard)...")
            else:
                _update_phase(job, 8, "ffmpeg", "🎬 Ensamblando escenas (Fast Cuts)...")

            raw_concatenated = asm.concatenate_scenes(scene_videos, [], output_filename=f"concatenated_{job_id}.mp4", scene_edits=scene_edits)
            
            if not raw_concatenated:
                _update_phase(job, 8, "ffmpeg", "❌ Error en concatenación (ver log del servidor)")
                job["status"] = "error: concatenation_failed"
                save_jobs()
                return

            # 2. Aplicar el Hook (Texto superpuesto)
            _update_phase(job, 8, "ffmpeg", "[RUN] Aplicando Hook de ventas...")
            
            # Filtro inteligente para el Hook: si es 'ok', 'listo' o muy corto, usamos la premisa
            candidate_hook = (data.get("hook") or data.get("manual_prompt") or "").strip()
            if not candidate_hook or len(candidate_hook) < 3 or candidate_hook.lower() in ["ok", "listo", "done", "yes", "si"]:
                hook_text = data.get("story_plan", {}).get("premisa", "Look at this!")
            else:
                hook_text = candidate_hook

            final = asm.assemble(raw_concatenated, hook_text, output_filename=f"final_{job_id}.mp4")
            
            if final:
                # Añadir timestamp para evitar cache en el navegador
                data["final_video_url"] = _get_url(final) + f"?t={int(time.time())}"
                _update_phase(job, 9, "ffmpeg", "✅ COMPLETADO", data["final_video_url"])
                job["status"] = "completado"
                save_jobs()
            else:
                _update_phase(job, 8, "ffmpeg", "[ERR] Error Aplicando Hook (FFmpeg)")
                job["status"] = "error: hook_failed"
                save_jobs()

    except Exception as e:
        import traceback
        raw_error = f"Error Job {job_id}: {str(e)}\n{traceback.format_exc()}"
        # Limpieza básica de emojis para la fase visual
        clean_phase_error = str(e).replace("✅", "[OK]").replace("🔄", "[RUN]").replace("❌", "[ERR]").replace("⏸️", "[PAUSE]")
        
        _log(raw_error)
        if job_id in jobs: 
            jobs[job_id]["status"] = f"error: {str(e)[:100]}"
            # Aseguramos que el error se vea en la fase actual
            try:
                current_phase_num = jobs[job_id].get("phase", 1)
                phase_keys = ["download", "extract_frames", "select_frame", "base_image", "director", "video", "ffmpeg"]
                if 1 <= current_phase_num <= len(phase_keys):
                    phase_key = phase_keys[current_phase_num - 1]
                    jobs[job_id]["phases"][phase_key] = f"❌ Error: {str(e)[:150]}"
            except Exception as inner_e:
                _log(f"Error secundario actualizando fase: {inner_e}")
        save_jobs()

@app.post("/api/jobs/{job_id}/scenes/approve")
def approve_scene(job_id: str, background_tasks: BackgroundTasks):
    if job_id not in jobs: return {"error": "Job no encontrado"}
    job = jobs[job_id]
    data = job.get("data", {})
    
    is_auto = data.get("auto_execution", False)
    # Doble verificación de tipo por si acaso llega como string "false"
    if isinstance(is_auto, str):
        is_auto = is_auto.lower() == "true"
        
    _log(f"\n[PIPELINE_DEBUG] >>> APROBANDO ESCENA | Job: {job_id[:8]} | Auto: {is_auto} (Type: {type(is_auto)})")
    
    plan = data.get("story_plan", {})
    scenes = plan.get("escenas", plan.get("clips", []))
    idx = data.get("current_scene_idx", 0)
    
    new_idx = idx + 1
    data["current_scene_idx"] = new_idx
    
    if new_idx >= len(scenes):
        _log(f"[Pipeline] 🏁 ÚLTIMA ESCENA FINALIZADA. Iniciando ensamblado final...")
        if "resume_from_idx" in data: del data["resume_from_idx"]
        job["status"] = "continuando_ensamblado_final"
        _update_phase(job, 8, "ffmpeg", "🔄 Iniciando ensamblado final...")
        save_jobs()
        background_tasks.add_task(run_ugc_pipeline_v2, job_id, background_tasks, start_at_phase=8)
        return {"status": "ok", "message": "¡Producción completada! Generando vídeo final montado..."}

    # Lógica de Teletransporte (Parcheo)
    resume_idx = data.get("resume_from_idx")
    if resume_idx is not None:
        _log(f"[Pipeline] ⏩ TELETRANSPORTE: Volviendo a la escena {resume_idx+1}")
        data["current_scene_idx"] = resume_idx
        del data["resume_from_idx"]
        job["status"] = "esperando_aprobacion_escena" # Siempre pausa al volver del parche
        _update_phase(job, 6, "video", f"✅ Parche completado. Volviendo a Escena {resume_idx+1}")
        save_jobs()
        return {"status": "ok", "message": "Parche aplicado. Volviendo a la posición actual."}

    # PAUSA OBLIGATORIA SI ES ITERATIVO
    if not is_auto:
        _log(f"[Pipeline] ⏸️ PAUSA ITERATIVA. Esperando revisión de Escena {new_idx+1}")
        job["status"] = "esperando_revision_siguiente_escena"
        # Actualizamos fase indicando que hay que revisar el plan
        _update_phase(job, 7, "video", f"✅ Escena {idx+1} aprobada. ⏸️ Revisa el plan de la Escena {new_idx+1}")
        save_jobs()
        return {"status": "ok", "message": f"Escena {idx+1} aprobada. Revisa el plan de la siguiente."}
    
    _log(f"[Pipeline] 🚀 Modo automático. Lanzando escena {new_idx+1}...")
    job["status"] = "continuando_siguiente_escena"
    save_jobs()
    background_tasks.add_task(run_ugc_pipeline_v2, job_id, background_tasks, start_at_phase=6)
    return {"status": "ok", "message": "Siguiente escena iniciada automáticamente."}

@app.post("/api/jobs/{job_id}/scenes/generate_next")
def generate_next_scene(job_id: str, background_tasks: BackgroundTasks):
    """Lanza la generación del clip actual (idx) de forma manual."""
    if job_id not in jobs: return {"error": "Job no encontrado"}
    job = jobs[job_id]
    data = job["data"]
    idx = data.get("current_scene_idx", 0)
    
    # Limpieza de seguridad: si ya había un vídeo en este índice, lo borramos para regenerar limpio
    if "scene_results" in data and idx < len(data["scene_results"]):
        _log(f"[Pipeline] 🧹 Limpiando resultado previo de escena {idx+1} para regeneración limpia.")
        data["scene_results"][idx] = None
        
    job["status"] = "generando_escena"
    _update_phase(job, 6, "video", f"🎬 Iniciando generación manual de Escena {idx+1}")
    save_jobs()
    background_tasks.add_task(run_ugc_pipeline_v2, job_id, background_tasks, start_at_phase=6)
    return {"status": "ok", "message": f"Generando Escena {idx+1}..."}

@app.post("/api/jobs/{job_id}/scenes/regenerate")
def regenerate_scene(job_id: str, background_tasks: BackgroundTasks, manual_prompt: Optional[str] = Form(None), manual_script: Optional[str] = Form(None), scene_idx: Optional[int] = Form(None)):
    if job_id not in jobs: return {"error": "Job no encontrado"}
    job = jobs[job_id]
    data = job["data"]
    
    # Si se proporciona un índice, retrocedemos el cursor de producción
    if scene_idx is not None:
        idx = scene_idx
        data["current_scene_idx"] = idx
        # Al retroceder, limpiamos los resultados desde ese punto en adelante para mantener consistencia
        data["scene_results"] = data.get("scene_results", [])[:idx]
        data["scene_audios"] = data.get("scene_audios", [])[:idx]
    else:
        idx = data.get("current_scene_idx", 0)
        # Limpieza específica del índice que vamos a regenerar
        if "scene_results" in data and idx < len(data["scene_results"]):
            data["scene_results"][idx] = None
        if "scene_audios" in data and idx < len(data["scene_audios"]):
            data["scene_audios"][idx] = None

    _log(f"[DEBUG] 🔄 REGENERANDO ESCENA {idx+1}")

    # Aplicar ediciones manuales si existen
    if manual_prompt: 
        scene_obj = data["story_plan"]["escenas"][idx]
        scene_obj["prompt_visual"] = manual_prompt
        scene_obj["prompt_visual_ingles"] = manual_prompt
        if "prompt_visual_espanol" in scene_obj:
            scene_obj["prompt_visual_espanol"] = manual_prompt

    if manual_script: 
        scene_obj = data["story_plan"]["escenas"][idx]
        scene_obj["script"] = manual_script
        scene_obj["script_completo"] = manual_script

    job["status"] = "regenerando_escena"
    save_jobs()

    background_tasks.add_task(run_ugc_pipeline_v2, job_id, background_tasks, start_at_phase=6)
    return {"status": "ok", "message": f"Regenerando escena {idx+1}..."}
@app.post("/api/jobs/{job_id}/unlock")
def unlock_scene(job_id: str, scene_idx: Optional[int] = Form(None)):
    if job_id not in jobs: return {"error": "Job no encontrado"}
    job = jobs[job_id]
    data = job["data"]
    
    # Si especificamos una escena, rebobinamos el cursor de producción
    if scene_idx is not None:
        current_pos = data.get("current_scene_idx", 0)
        # Si la escena a la que vamos es anterior a la actual, guardamos donde estábamos
        if scene_idx < current_pos:
            data["resume_from_idx"] = current_pos
            _log(f"[DEBUG] 📍 MEMORIA ACTIVADA: Guardada posición actual (Escena {current_pos+1})")
        
        data["current_scene_idx"] = scene_idx
        _log(f"[DEBUG] ⏪ REBOBINANDO producción a Escena {scene_idx+1}")
    
    # Cambiamos el estado a pausa de plan para que el usuario pueda editar
    job["status"] = "esperando_aprobacion_plan"
    save_jobs()
    return {"status": "ok", "message": "Escena desbloqueada y lista para edición."}

@app.post("/api/jobs/{job_id}/scenes/{idx}/select_version")
def select_scene_version(job_id: str, idx: int, version_idx: int = Form(...)):
    if job_id not in jobs: return {"error": "Job no encontrado"}
    job = jobs[job_id]
    data = job["data"]
    
    history = data.get("scene_history", {}).get(str(idx), [])
    if version_idx < 0 or version_idx >= len(history):
        return {"error": "Versión no válida"}
    
    selected_video = history[version_idx]
    
    # Actualizar el resultado activo para que el montaje lo use
    if "scene_results" not in data: data["scene_results"] = []
    while len(data["scene_results"]) <= idx:
        data["scene_results"].append(None)
    
    data["scene_results"][idx] = selected_video
    
    # Resetear recortes al cambiar de versión para evitar inconsistencias de duración
    if "scene_edits" in data and str(idx) in data["scene_edits"]:
        del data["scene_edits"][str(idx)]
        
    save_jobs()
    
    return {"status": "ok", "selected_video": _get_url(selected_video)}

@app.post("/api/jobs/{job_id}/assemble")
def regenerate_assembly(job_id: str, background_tasks: BackgroundTasks):
    """Regenera solo el montaje final (Fase 8) sin tocar los vídeos generados."""
    if job_id not in jobs: return {"error": "Job no encontrado"}
    job = jobs[job_id]
    
    # Marcamos para empezar desde la fase 8 (Assembler)
    job["status"] = "regenerando_montaje"
    save_jobs()
    
    background_tasks.add_task(run_ugc_pipeline_v2, job_id, background_tasks, start_at_phase=8)
    return {"status": "ok", "message": "Iniciando regeneración de montaje final..."}

@app.post("/api/jobs/{job_id}/update_guide")
def update_story_guide(job_id: str, story_guide: str = Form("")):
    """Actualiza la guía de historia de un job antes de regenerar el Director."""
    if job_id not in jobs: return {"error": "Job no encontrado"}
    job = jobs[job_id]
    data = job.get("data", {})
    data["story_guide"] = story_guide
    save_jobs()
    return {"status": "ok", "message": f"Guía actualizada para job {job_id[:8]}"}



@app.get("/api/jobs")
def get_jobs():
    # Eliminamos load_jobs() de aquí para evitar bloqueos por IO cada 2 segundos.
    # Los trabajos se cargan al inicio y se mantienen en memoria sincronizados con save_jobs().
    return list(jobs.values())

@app.get("/api/jobs/{job_id}")
def get_job(job_id: str):
    return jobs.get(job_id, {"error": "No existe"})

@app.post("/api/jobs/{job_id}/purge")
def purge_job(job_id: str):
    """Borrado profundo: elimina el registro del job y todos sus archivos asociados en downloads/."""
    if job_id not in jobs:
        return {"error": "Job no encontrado"}
    
    job = jobs[job_id]
    _log(f"[Purge] 🗑️ Iniciando borrado profundo del job {job_id[:8]}...")
    
    # 1. Eliminar carpeta de uploads del job
    job_upload_dir = os.path.join(UPLOAD_DIR, job_id)
    if os.path.exists(job_upload_dir):
        import shutil
        try:
            shutil.rmtree(job_upload_dir)
            _log(f"[Purge]   - Carpeta de uploads eliminada: {job_id}")
        except Exception as e:
            _log(f"[Purge]   ⚠️ Error eliminando uploads: {e}")

    # 2. Eliminar vídeo de tiktok descargado
    tiktok_file = os.path.join(TIKTOK_DIR, f"{job_id}.mp4")
    if os.path.exists(tiktok_file):
        try:
            os.remove(tiktok_file)
            _log(f"[Purge]   - Vídeo TikTok eliminado")
        except: pass

    # 3. Eliminar frames extraídos
    frames_dir = os.path.join(ROOT_DIR, "downloads", "frames")
    if os.path.exists(frames_dir):
        for f in os.listdir(frames_dir):
            if job_id in f:
                try:
                    os.remove(os.path.join(frames_dir, f))
                except: pass

    # 4. Eliminar resultados de fases (Imágenes Base, Vídeos Seedance)
    results = job.get("phases_results", {})
    for phase_key, res in results.items():
        # Puede ser una ruta directa (string) o un objeto con "escenas" (lista)
        paths_to_check = []
        if isinstance(res, str):
            paths_to_check.append(res)
        elif isinstance(res, dict):
            # Caso de fase 'video' que tiene una lista de escenas
            scenes = res.get("escenas", [])
            for s in scenes:
                if isinstance(s, str): paths_to_check.append(s)
    
    # También revisar el historial de versiones de escenas
    scene_history = job.get("data", {}).get("scene_history", {})
    for idx, versions in scene_history.items():
        for v_path in versions:
            if isinstance(v_path, str): paths_to_check.append(v_path)

    for p in set(paths_to_check):
        abs_p = _abs(p)
        if os.path.exists(abs_p) and "downloads" in abs_p:
            try:
                os.remove(abs_p)
                _log(f"[Purge]   - Archivo eliminado: {os.path.basename(abs_p)}")
            except Exception as e:
                _log(f"[Purge]   ⚠️ No se pudo eliminar {os.path.basename(abs_p)}: {e}")

    # 5. Eliminar vídeo final
    final_video = os.path.join(OUTPUT_DIR, f"final_{job_id}.mp4")
    if os.path.exists(final_video):
        try:
            os.remove(final_video)
            _log(f"[Purge]   - Vídeo final eliminado")
        except: pass

    # 6. Eliminar del registro y guardar
    del jobs[job_id]
    save_jobs()
    _log(f"[Purge] ✅ Job {job_id[:8]} eliminado completamente.")
    
    return {"status": "ok", "message": f"Job {job_id} y sus archivos han sido purgados."}

@app.get("/api/influencers")
def get_influencers():
    if not os.path.exists(INFLUENCERS_FILE): return []
    with open(INFLUENCERS_FILE, "r") as f: return json.load(f)

@app.post("/api/influencers/create")
async def create_influencer_direct(
    name: str = Form(...),
    image: UploadFile = File(...),
    sheet: Optional[UploadFile] = File(None),
    voice_print: Optional[str] = Form("25-year-old female, native Spanish, energetic UGC tone, slightly raspy timbre, close-mic volume, consistent mid-range pitch, conversational pacing.")
):
    """Crea un influencer directamente subiendo los archivos, sin depender de un job ID."""
    _log(f"[Library] 📥 Guardando nueva modelo directa: {name}")
    safe_name = name.replace(" ", "_").lower()
    inf_id = str(uuid.uuid4())[:8]
    
    os.makedirs(INFLUENCERS_DIR, exist_ok=True)
    
    # Guardar cara
    face_dest = os.path.join(INFLUENCERS_DIR, f"{safe_name}_face{_get_ext(image.filename)}")
    with open(face_dest, "wb") as f:
        f.write(await image.read())
    
    # Guardar hoja (opcional)
    sheet_dest = None
    if sheet:
        sheet_dest = os.path.join(INFLUENCERS_DIR, f"{safe_name}_sheet{_get_ext(sheet.filename)}")
        with open(sheet_dest, "wb") as f:
            f.write(await sheet.read())
            
    # Rutas relativas para servir (usamos data/influencers para consistencia total con el mount /data)
    rel_face = f"data/influencers/{os.path.basename(face_dest)}"
    rel_sheet = f"data/influencers/{os.path.basename(sheet_dest)}" if sheet_dest else None
    
    new_entry = {
        "id": inf_id,
        "name": name,
        "local_path": rel_face,
        "sheet_path": rel_sheet,
        "element_id": f"lib_{inf_id}",
        "seed": random.randint(100000, 999999),
        "voice_print": voice_print
    }
    
    library = []
    if os.path.exists(INFLUENCERS_FILE):
        with open(INFLUENCERS_FILE, "r") as f:
            try:
                library = json.load(f)
            except:
                library = []
    
    library.append(new_entry)
    with open(INFLUENCERS_FILE, "w") as f:
        json.dump(library, f, indent=4)
    
    return {"status": "ok", "influencer": new_entry}

@app.post("/api/influencers/{influencer_id}/new_voice")
def regenerate_influencer_voice(influencer_id: str):
    """Genera un nuevo seed de voz aleatorio para el influencer dado, cambiando así su voz."""
    if not os.path.exists(INFLUENCERS_FILE):
        return {"error": "Biblioteca de influencers no encontrada"}
    
    with open(INFLUENCERS_FILE, "r") as f:
        try:
            library = json.load(f)
        except:
            return {"error": "Error al leer biblioteca"}

    new_seed = random.randint(100000, 999999)
    found = False
    for inf in library:
        if inf.get("id") == influencer_id:
            inf["seed"] = new_seed
            found = True
            break
            
    if not found:
        return {"error": "Influencer no encontrado"}
        
    with open(INFLUENCERS_FILE, "w") as f:
        json.dump(library, f, indent=4)
        
    return {"status": "ok", "new_seed": new_seed, "message": "Voz regenerada con éxito."}

@app.get("/api/health")
def health_check():
    ws_key = bool(os.getenv("WAVESPEED_API_KEY"))
    mm_key = bool(os.getenv("MINIMAX_TOKEN_KEY"))
    return {
        "status": "ok",
        "wavespeed_api": "✅" if ws_key else "❌ Offline",
        "minimax_api": "✅" if mm_key else "❌ Offline",
        "active_jobs": len(jobs),
    }


@app.post("/api/jobs/{job_id}/save_edits")
def save_clip_edits(job_id: str, edits: str = Form(...)):
    """Guarda los ajustes de edición (recortes, exclusión) de las escenas."""
    if job_id not in jobs: return {"error": "Job no encontrado"}
    try:
        scene_edits = json.loads(edits)
        jobs[job_id]["data"]["scene_edits"] = scene_edits
        save_jobs()
        return {"status": "ok"}
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/jobs/{job_id}/scenes/{idx}/duration")
def get_scene_duration(job_id: str, idx: int):
    """Retorna la duración real de un clip de escena."""
    if job_id not in jobs: return {"error": "Job no encontrado"}
    data = jobs[job_id]["data"]
    results = data.get("scene_results", [])
    if idx < 0 or idx >= len(results) or not results[idx]:
        return {"error": "Clip no encontrado"}
    
    asm = Assembler()
    duration = asm.get_video_duration(_abs(results[idx]))
    return {"duration": duration}

def _update_phase(job, num, key, msg, res=None, payload=None):
    job["phase"], job["status"], job["phases"][key] = num, key, msg
    if "phases_results" not in job: job["phases_results"] = {}
    if "phases_payloads" not in job: job["phases_payloads"] = {}
    
    if res is not None:
        # Normalización para el frontend: clips -> escenas
        if isinstance(res, dict) and "clips" in res and "escenas" not in res:
            res["escenas"] = res["clips"]
        job["phases_results"][key] = res
        
    if payload is not None: job["phases_payloads"][key] = payload
    
    save_jobs()
    # Eliminamos el emoji del print para evitar UnicodeEncodeError en Windows
    clean_msg = msg.replace("✅", "[OK]").replace("🔄", "[RUN]").replace("❌", "[ERR]").replace("⏸️", "[PAUSE]").replace("🎬", "[BRAIN]").replace("🎬", "[BRAIN]")
    _log(f"[Job {job['id'][:8]}] Fase {num}: {clean_msg}")

def _get_ext(f):
    return "." + f.split(".")[-1].lower() if f and "." in f else ".jpg"
 
