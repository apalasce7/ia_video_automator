import os
import json
import time
from datetime import datetime

# ─────────────────────────────────────────────
# TABLA DE PRECIOS REALES (USD)
# ─────────────────────────────────────────────
PRICES = {
    "wavespeed": {
        "seedance_2.0": {
            "480p": 0.12,  # por segundo
            "720p": 0.24,  # por segundo
            "1080p": 0.60, # por segundo
        },
        "nano_banana_2": 0.07,   # por imagen
        "image_captioner": 0.01, # por petición
        "gemini_3_flash": {
            "input_1m": 0.25,
            "output_1m": 1.50
        }
    },
    "minimax": {
        "m2.7": {
            "input_1m": 0.30,
            "output_1m": 1.20
        },
        "voice_turbo": 60.00 # por 1M caracteres
    },
    "groq": {
        "llama_3.3_70b": 0.00 # Gratis (según confirmación del usuario)
    }
}

class CostTracker:
    """Módulo centralizado para el seguimiento de costes de IA por proyecto."""
    
    def __init__(self, data_dir="data"):
        self.base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) # backend/
        # Mover fuera de backend/ para evitar reloads de uvicorn
        self.costs_file = os.path.join(self.base_dir, "..", "data", "project_costs.json")
        
        # Asegurar que el directorio data existe
        os.makedirs(os.path.dirname(self.costs_file), exist_ok=True)
        
        if not os.path.exists(self.costs_file):
            with open(self.costs_file, "w") as f:
                json.dump({}, f)

    def _load_data(self):
        try:
            with open(self.costs_file, "r") as f:
                return json.load(f)
        except:
            return {}

    def _save_data(self, data):
        with open(self.costs_file, "w") as f:
            json.dump(data, f, indent=4)

    def log_media_cost(self, job_id, provider, model, quantity, resolution=None):
        """Registra el coste de clips de vídeo o imágenes."""
        data = self._load_data()
        if job_id not in data:
            data[job_id] = {"total_cost": 0.0, "logs": []}
        
        cost = 0.0
        m_lower = model.lower()
        if provider == "wavespeed":
            if "seedance" in m_lower:
                res = resolution or "480p"
                rate = PRICES["wavespeed"]["seedance_2.0"].get(res, 0.12)
                cost = rate * quantity
            elif "nano-banana" in m_lower or "nano_banana" in m_lower:
                cost = PRICES["wavespeed"]["nano_banana_2"] * quantity
            elif "captioner" in m_lower:
                cost = PRICES["wavespeed"]["image_captioner"] * quantity
        
        data[job_id]["total_cost"] = round(data[job_id]["total_cost"] + cost, 4)
        data[job_id]["logs"].append({
            "timestamp": datetime.now().isoformat(),
            "provider": provider,
            "model": model,
            "quantity": quantity,
            "resolution": resolution,
            "cost": round(cost, 4)
        })
        
        print(f"[CostTracker] REGISTRANDO: {job_id} -> {model} (${cost})")
        self._save_data(data)
        return cost

    def log_token_cost(self, job_id, provider, model, input_tokens, output_tokens):
        """Registra el coste de LLMs basado en tokens."""
        data = self._load_data()
        if job_id not in data:
            data[job_id] = {"total_cost": 0.0, "logs": []}
            
        cost = 0.0
        if provider == "wavespeed" and "gemini" in model.lower():
            rate_in = PRICES["wavespeed"]["gemini_3_flash"]["input_1m"] / 1_000_000
            rate_out = PRICES["wavespeed"]["gemini_3_flash"]["output_1m"] / 1_000_000
            cost = (input_tokens * rate_in) + (output_tokens * rate_out)
        elif provider == "minimax":
            rate_in = PRICES["minimax"]["m2.7"]["input_1m"] / 1_000_000
            rate_out = PRICES["minimax"]["m2.7"]["output_1m"] / 1_000_000
            cost = (input_tokens * rate_in) + (output_tokens * rate_out)
        elif provider == "groq":
            cost = 0.0 # Llama es gratis
            
        data[job_id]["total_cost"] += cost
        data[job_id]["logs"].append({
            "timestamp": datetime.now().isoformat(),
            "provider": provider,
            "model": model,
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "cost": round(cost, 6)
        })
        
        self._save_data(data)
        return cost

    def log_voice_cost(self, job_id, text_length):
        """Registra el coste de generación de voz por caracteres."""
        data = self._load_data()
        if job_id not in data:
            data[job_id] = {"total_cost": 0.0, "logs": []}
            
        rate = PRICES["minimax"]["voice_turbo"] / 1_000_000
        cost = text_length * rate
        
        data[job_id]["total_cost"] += cost
        data[job_id]["logs"].append({
            "timestamp": datetime.now().isoformat(),
            "provider": "minimax",
            "model": "voice-turbo",
            "chars": text_length,
            "cost": round(cost, 4)
        })
        
        self._save_data(data)
        return cost

    def get_job_cost(self, job_id):
        data = self._load_data()
        return data.get(job_id, {}).get("total_cost", 0.0)

cost_tracker = CostTracker()
