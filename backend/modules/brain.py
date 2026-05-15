import os
import re
import json
import requests
from openai import OpenAI
from dotenv import load_dotenv
from modules.cost_tracker import cost_tracker

load_dotenv()

# ─────────────────────────────────────────────
# Configuración LLMs
# ─────────────────────────────────────────────
MINIMAX_BASE_URL = "https://api.minimax.io/v1"
MINIMAX_MODEL = "MiniMax-M2.7"

GROQ_BASE_URL = "https://api.groq.com/openai/v1"
GROQ_MODEL = "llama-3.3-70b-versatile" 

GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai/"
GEMINI_MODEL = "gemini-3.1-pro-preview" 
GEMINI_FLASH_LITE_MODEL = "gemini-3.1-flash-lite-preview"
GEMINI_FLASH_MODEL = "gemini-3-flash-preview"
GEMINI_25_PRO_MODEL = "gemini-2.5-pro"


class Brain:
    """Motor de texto para hooks de ventas usando MiniMax M2.7 (compatible OpenAI). Solo en Español."""

    def __init__(self):
        self.minimax_key = os.getenv("MINIMAX_TOKEN_KEY")
        self.groq_key = os.getenv("GROQ_API_KEY")
        self.gemini_key = os.getenv("GOOGLE_API_KEY")
        
        self.clients = {}
        
        if self.minimax_key:
            client = OpenAI(api_key=self.minimax_key, base_url=MINIMAX_BASE_URL)
            self.clients["minimax"] = client
            self.client = client # Cliente por defecto para compatibilidad
            self._log("[Brain] [OK] MiniMax M2.7 configurado.")
            
        if self.groq_key:
            self.clients["groq"] = OpenAI(api_key=self.groq_key, base_url=GROQ_BASE_URL)
            self._log("[Brain] [OK] Groq (Llama) configurado.")
            
        if self.gemini_key:
            client = OpenAI(api_key=self.gemini_key, base_url=GEMINI_BASE_URL)
            self.clients["gemini"] = client
            self.client = client # Gemini es ahora el cliente por defecto
            self._log("[Brain] [OK] Gemini configurado.")

    def _log(self, msg: str):
        """Imprime un mensaje limpiando emojis para evitar errores en Windows."""
        clean_msg = str(msg).encode("ascii", "ignore").decode("ascii")
        print(clean_msg)

    def _get_client_and_model(self, provider: str):
        """Retorna el cliente y modelo según el proveedor seleccionado."""
        p = provider.lower() if provider else "gemini-flash"
        if p == "groq" and "groq" in self.clients:
            return self.clients["groq"], GROQ_MODEL
        if p == "gemini" and "gemini" in self.clients:
            return self.clients["gemini"], GEMINI_MODEL
        if p == "gemini-lite" and "gemini" in self.clients:
            return self.clients["gemini"], GEMINI_FLASH_LITE_MODEL
        if p == "gemini-flash" and "gemini" in self.clients:
            return self.clients["gemini"], GEMINI_FLASH_MODEL
        if p == "gemini-25-pro" and "gemini" in self.clients:
            return self.clients["gemini"], GEMINI_25_PRO_MODEL
        if p == "minimax" and "minimax" in self.clients:
            return self.clients["minimax"], MINIMAX_MODEL
        
        # Fallback al primero disponible
        for key in ["minimax", "groq", "gemini"]:
            if key in self.clients:
                m = MINIMAX_MODEL if key=="minimax" else GROQ_MODEL if key=="groq" else GEMINI_MODEL
                return self.clients[key], m
        
        return None, None

    def generate_sales_hook(self, product_details: str, provider: str = "minimax", job_id: str = None) -> str:
        """
        Genera un gancho (hook) agresivo de ventas "Bottom of Funnel" usando el modelo de negocio "Sobreoferta".
        """
        self._log(f"[Brain] Diseñando Gancho (Hook) comercial con {provider} para: {product_details[:30]}...")
        client, model = self._get_client_and_model(provider)
        
        if not client:
            self._log(f"[Brain] WARNING: NO client for {provider}. Returning mock Hook.")
            return "Aparentemente si tu cuenta es antigua puedes conseguir esto barato. ¿Quién más pidió dos?"
            
        prompt = f"""
        Actúa como un experto en redacción publicitaria para TikTok Shop (Bottom of funnel).
        El usuario va a promocionar el siguiente producto:
        "{product_details}"

        Tu tarea es generar un texto CORTO y AGRESIVO (máximo 2 oraciones breves) para superponer en un vídeo tipo selfie de TikTok. 
        El texto debe seguir esta psicología (o similar): "Parece que hay un gran descuento / error de precio, hoy está súper barato, puedes conseguir varios, etc."

        REGLAS ESTRICTAS:
        - Responde ÚNICAMENTE en ESPAÑOL.
        - NO uses caracteres de otros idiomas (chino, japonés, etc).
        - NO incluyas comillas, ni introducciones, ni comentarios extra.
        - Devuelve SOLO el texto final del gancho.
        """
        
        try:
            response = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": "You are a TikTok Shop elite affiliate copywriter. Respond ONLY in Spanish. Output ONLY the final hook text, nothing else."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=200
            )
            
            # Registrar coste
            if job_id and hasattr(response, "usage"):
                cost_tracker.log_token_cost(job_id, provider, model, response.usage.prompt_tokens, response.usage.completion_tokens)

            msg = response.choices[0].message
            raw_content = msg.content or ""

            # Limpiar bloques <think>...</think>
            hook = re.sub(r'<think>[\s\S]*?</think>\s*', '', raw_content).strip()
            
            # Fallback
            if not hook:
                parts = raw_content.split('</think>')
                hook = parts[-1].strip() if len(parts) > 1 else raw_content.strip()

            hook = hook.strip('"').strip("'").strip()
            hook = re.sub(r'[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef\u3400-\u4dbf]', '', hook).strip()

            return hook or "Aparentemente si tu cuenta es antigua puedes conseguir esto barato. ¿Quién más pidió dos?"
        except Exception as e:
            self._log(f"[Brain] [ERROR] Error generando el Hook con {provider}: {str(e)}")
            return "Error al generar gancho."

    def generate_voice(self, text: str, output_path: str, job_id: str = None) -> str:
        """
        Genera voz a partir de texto usando el endpoint T2A de MiniMax.
        """
        if not self.client:
            self._log("[Brain] [WARN] No API key para T2A. Omitiendo voz.")
            return None
            
        self._log(f"[Brain] Generando voz para lip-sync: \"{text[:30]}...\"")
        url = "https://api.minimax.io/v1/t2a_v2"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": "speech-01-turbo", # Modelo turbo (más compatible con planes básicos)
            "text": text,
            "stream": False,
            "voice_setting": {
                "voice_id": "female-shaonv", # Voz juvenil/clara típica de UGC
                "speed": 1.0,
                "vol": 1.0,
                "pitch": 0
            },
            "audio_setting": {
                "sample_rate": 32000,
                "bitrate": 128000,
                "format": "mp3"
            }
        }
        
        try:
            response = requests.post(url, json=payload, headers=headers, timeout=30)
            if response.status_code == 200:
                with open(output_path, "wb") as f:
                    f.write(response.content)
                
                # Registrar coste de voz
                if job_id:
                    cost_tracker.log_voice_cost(job_id, len(text))

                self._log(f"[Brain] [OK] Voz generada: {output_path}")
                return output_path
            else:
                self._log(f"[Brain] [ERROR] T2A HTTP {response.status_code}: {response.text}")
                return None
        except Exception as e:
            self._log(f"[Brain] [ERROR] Error en T2A: {e}")
            return None

    def generate_story_plan(self, product_name: str, product_details: str, influencer_name: str, total_duration: int, visual_description: str = "", base_image_description: str = "", mapping_description: str = "", audio_mode: str = "lip-sync", story_guide: str = "", language: str = "es", edit_style: str = "standard", voice_print: str = "", provider: str = "minimax", job_id: str = None) -> dict:
        """
        Director v5.0 (UGC Story Master): Desglosa un vídeo largo en clips de máximo 10s.
        Utiliza el Prompt Maestro para asegurar máxima calidad visual y narrativa.
        """
        self._log(f"[Director v5.0] Orquestando historia UGC con {provider}...")
        client, model = self._get_client_and_model(provider)

        if not client:
            return {
                "premisa": f"Mock Plan (No {provider} Key)",
                "escenas": [
                    {
                        "id": 1, 
                        "duracion": total_duration, 
                        "audio_mode": audio_mode,
                        "script_completo": f"¡Hola! Soy {influencer_name} y mira este {product_name}.", 
                        "prompt_visual_ingles": f"[CAMERA]: Eye-level. [CHARACTER]: {influencer_name}. [ACTION]: Showing product.",
                        "prompt_visual_espanol": "Video mostrando producto.",
                        "guion_detallado": [{"tiempo": f"0-{total_duration}s", "locucion": "Hola", "accion_visual": "Interactuando"}]
                    }
                ]
            }

        use_voice = audio_mode in ["lip-sync", "voice-over", "mixed"]
        
        lang_map = {
            "es": "Español (Castellano de España peninsular)",
            "es-latam": "Español (Latinoamericano/México)",
            "en": "Inglés (American English)",
            "fr": "Francés (Français)",
            "de": "Alemán (Deutsch)",
            "it": "Italiano",
            "pt": "Portugués"
        }
        target_lang = lang_map.get(language, "Español")

        system_instructions = f"""
Eres el "Lead Prompt Engineer & Cinematographer" para contenido UGC viral de TikTok, experto en Seedance 2.0. Tu misión es transformar una premisa de contenido en un objeto JSON técnico de alta fidelidad, aplicando estricta literalidad física.

REGLAS BASE Y VARIABLES DINÁMICAS:

Idioma del Guion: Escribe el 'script_completo' y todas las 'locuciones' EXCLUSIVAMENTE en {target_lang}.

RESTRICCIÓN DIALECTAL Y ACENTO: Utiliza exclusivamente vocabulario, modismos y construcciones gramaticales propios de {target_lang}. Si el idioma es Español de España, tienes PROHIBIDO usar "ustedes", "carro", "celular" o "computadora"; utiliza "vosotros", "coche", "móvil" u "ordenador". Si es Español Latinoamericano, evita el uso de "vosotros" o modismos peninsulares. Mantén un tono 100% nativo y natural de la región seleccionada.

AISLAMIENTO DE IDIOMAS (HARD LIMIT): Tienes PROHIBIDO incluir caracteres chinos o asiáticos en cualquier parte del JSON. El campo prompt_visual_ingles DEBE estar 100% en INGLÉS TÉCNICO sin excepciones. Los campos script_completo, locucion, prompt_visual_espanol y accion_visual DEBEN estar 100% en {target_lang}. NUNCA mezcles idiomas en una misma frase o campo.

LIMPIEZA DE SCRIPT (CRÍTICO): Tienes TERMINANTEMENTE PROHIBIDO incluir referencias técnicas como "@Image1", "@Audio1", "[ACTION]", "[CAMERA]", o cualquier tipo de etiqueta, corchete, almohadilla (#) o metadato dentro del campo 'script_completo' o 'locucion'. Estos campos deben contener ÚNICAMENTE el texto que será pronunciado por la voz.

Duración Total: La suma de todas las escenas debe ser EXACTAMENTE {total_duration} segundos. LÍMITES ESTRICTOS: Máximo 10s por escena. Mínimo 4s por escena. NUNCA 11, 12 o más. NUNCA 1, 2 o 3. (Si calculas 11s, divide en 6s+5s).

Modo de Audio Activo: {audio_mode}.

Si es 'lip-sync': La influencer HABLA directamente a cámara. Sus labios se mueven sincronizados.

Si es 'voice-over': La influencer NO HABLA visualmente. Su boca permanece CERRADA o con expresión natural relajada EN TODO MOMENTO. La voz se escucha clara, nítida y en primer plano como una narración en off (estilo locución de estudio) superpuesta al vídeo.

Si es 'mixed': Combina diálogos lip-sync y narración en off. Separa lógicamente cuándo habla a cámara y cuándo no.

Si es 'asmr': Sin voz normal. El audio debe hiper-amplificar los sonidos táctiles y de interacción física directa con el producto (roces, clics, pulverizaciones).

Si es 'silent' o 'ambient': Sin diálogos y sin foco en los objetos. Solo sonido ambiente pasivo del entorno de fondo.

Estilo de Montaje: {edit_style}. Adapta el ritmo de cortes siguiendo estas reglas:

REGLA DE LOCUCIÓN ESTRICTA (RITMO RÁPIDO UGC): El ritmo ideal es de 3.0 palabras por segundo para lograr un tono enérgico y fluido de TikTok. ESTE LÍMITE APLICA A CADA SUB-ESCENA INDIVIDUALMENTE. 
- Si una sub-escena dura 2 segundos, asigna unas 6 palabras.
- Si dura 3 segundos, asigna unas 9 palabras.
- Si dura 4 segundos, asigna unas 12 palabras.
Calcula matemáticamente antes de asignar el texto para que la locución sea rápida, dinámica y sin pausas antinaturales, pero que encaje perfectamente en el tiempo.

Si es 'standard': Modo Clásico. Ritmo orgánico con planos más largos (7-10s si es posible). El sistema aplicará un fundido suave (crossfade) entre clips en postproducción, por lo que busca que la acción visual sea continua, tranquila y fluida.

Si es 'fast-cuts': Ritmo dinámico y rápido. Introduce cortes y cambios de ángulo para captar la atención, pero manteniendo siempre la lógica narrativa (cero cortes arbitrarios).

Si es 'b-roll-focused': Alterna constantemente entre planos medios de la influencer y Extreme Close Ups (planos detalle) de las manos interactuando con el producto o mostrando su textura.

Guion Literal Obligatorio: Si se te proporciona un guion, tienes PROHIBIDO inventar o modificar el texto. Tu trabajo es tomar el texto exacto y segmentarlo lógicamente.

TONO ORGÁNICO UGC (ANTICOMERCIAL) — ¡CRÍTICO!:
PROHIBIDO usar lenguaje publicitario comercial, guiones de radio o frases de "teletienda". El guion debe sonar 100% nativo de TikTok (Storytime, POV). La influencer cuenta una experiencia casual y natural. ESTRICTA CONTINUIDAD NARRATIVA: Forman UNA SOLA CONVERSACIÓN FLUIDA, no anuncios independientes.

1. ARQUITECTURA DEL PROMPT VISUAL (Sintaxis CCR Obligatoria)
Cada prompt_visual_ingles DEBE empaquetar toda la historia del clip en INGLÉS TÉCNICO usando estrictamente este esquema. No omitas ninguna etiqueta:

[CAMERA]: Define tipo de lente (ej. 24mm iPhone lens), ángulo (eye-level), estabilidad y movimiento.

[CHARACTER]: Referencia obligatoria a @Image2 para identidad facial y @Image3 para geometría corporal. Describe ropa y peinado. Menciona el estado de la boca según el modo de audio.

[SCENE & AUDIO]: Define el espacio basado ESTRICTAMENTE en @Image1. REGLA STORYTIME: El entorno visual está anclado a @Image1. Aunque el guion narre eventos en otros lugares (fiestas, calle), la acción visual ocurre en el set de @Image1. Usa el {edit_style} para dar dinamismo mediante diferentes ángulos, acercamientos y cortes, pero siempre dentro de esa misma localización. OBLIGATORIO: Añade SIEMPRE una frase al final describiendo el audio ambiental (ej. "Ambient sound: distant traffic and wind").

[DIALOGUE]: Adapta el texto de esta etiqueta según el modo de audio. REGLA DE CONTINUIDAD VOCAL: Para mantener la misma voz en todos los clips, debes inyectar la huella vocal en los modos hablados:

Si es 'lip-sync' o 'mixed' (hablando en pantalla): "Spoken text in {target_lang}: 'Inserta el texto exacto'. VOICE PRINT: {voice_print}. STRICT CONSTRAINT: Lock vocal identity, pitch, and close-mic volume. Do not change speaker."

Si es 'voice-over': "Spoken text in {target_lang}: 'Inserta el texto exacto'. VOICE PRINT: {voice_print}. STRICT CONSTRAINT: Crisp studio voice-over narration overlay. Lock vocal identity and volume. Mouth remains completely closed. No lip-sync."

Si es 'asmr': "None. No speech. Mouth remains closed. ASMR audio mode: hyper-focus on crisp, amplified tactile physical interactions."

Si es 'silent' o 'ambient': "None. No speech. Mouth remains closed. Passive ambient background audio only."

[ACTION & TIMELINE]: Desglose temporal segundo a segundo. Describe vectores de movimiento y la interacción física detallada.

00s (Lógica Condicional de Arranque):
- PARA LA ESCENA 1: "00s (Dynamic Start): Inicia la acción en movimiento fluido desde el frame 0. Describe la pose y ángulo inicial libremente según la narrativa. TIENES ESTRICTAMENTE PROHIBIDO escribir la palabra '@Image1' dentro de esta etiqueta [ACTION & TIMELINE] para la escena 1."
- PARA ESCENAS 2 EN ADELANTE: Si el estilo es 'standard' (POV continuo), DEBES hacer un "00s (Match cut): Frame 0 continúa la pose exacta del final de la escena anterior". Si es 'fast-cuts' o 'b-roll-focused', haz un "00s (Hard cut): Nuevo ángulo, no copies la pose del clip anterior".

Resto del clip: Continúa describiendo la acción segundo a segundo.

[TECHNICAL RESTRAINTS]: Cierre exacto: "NO bokeh. Deep focus like amateur phone camera. Solid object physics enforced. NO melting text or shifting labels. NO MUSIC."

2. LITERALIDAD VISUAL Y FIDELIDAD FÍSICA (MECÁNICA AVANZADA)

Prioridad Corporal: Al referenciar @Image3, DEBES preservar EXACTAMENTE: tamaño de pecho/busto, ratio cintura-cadera, ancho de hombros, grosor de brazos. NO aplanar ni modificar proporciones.

Fidelidad de Pelo: Preservar EXACTAMENTE el COLOR y LARGO de pelo de @Image2.

Colisiones y Física Sólida (NO CLIPPING): Los objetos sólidos NO pueden atravesarse. Una mano no puede traspasar una caja ni el cristal.

Estabilidad de Etiquetas de Producto (CRÍTICO): Todo texto, logo o gráfico en la superficie de un producto (@Image4-6) DEBE permanecer FIJO en su posición original. Las etiquetas NO se deslizan, rotan, ni se derriten.

Orientación Lógica y Agarre: Describe EXACTAMENTE por dónde se agarra el objeto y qué parte interactúa (ej: "el dedo índice presiona el atomizador dorado de @Image4"). Prohibido presunciones abstractas como "usa el producto" o "se echa perfume" sin detallar los dedos y anclar el tag @Image.

Estabilidad: Todos los productos deben mantener su forma, tamaño y proporciones.

3. USO FLEXIBLE DE @IMAGE1 Y LÓGICA DE CONTINUIDAD

Regla de Oro (Anclaje de Set): @Image1 define SIEMPRE y de forma OBLIGATORIA la localización exacta, la iluminación y el vestuario. PROHIBIDO cambiar de set.

LÓGICA DE ARRANQUE PARA LA ESCENA 1 (Anti-Congelación):
@Image1 es tu "Location & Vibe Reference". NO te obliga a copiar la pose exacta de la influencer. Arranca el vídeo de forma fluida y natural con la pose que pida el guion.

LÓGICA DE ARRANQUE PARA ESCENAS 2 EN ADELANTE (Continuidad según {edit_style}):
Aquí @Image1 representa el último fotograma del clip anterior reinyectado por el sistema.
- Si {edit_style} es 'standard' / vlog (POV continuo): Tienes PROHIBIDO cambiar de plano. Ejecuta un match cut. El frame 0 debe ser la continuación física exacta de cómo terminó el clip anterior. La inercia del movimiento debe continuar sin saltos.
- Si {edit_style} es 'fast-cuts' o 'b-roll-focused' (Corte Creativo): Tienes libertad para ejecutar un hard cut en el frame 0. Cambia radicalmente de ángulo o tipo de plano manteniendo el mismo set y vestuario.

4. ESTRUCTURA JSON Y FEW-SHOT DE CALIDAD TÉCNICA
Devuelve EXCLUSIVAMENTE un JSON válido. Utiliza este ejemplo como estándar de oro para el ritmo y la continuidad:

JSON
{{
  "premisa": "Resumen global de la narrativa UGC.",
  "escenas": [
    {{
      "id": 1,
      "duracion": 6,
      "audio_mode": "lip-sync",
      "script_completo": "¡Hola! No sabéis lo que me ha llegado hoy.",
      "prompt_visual_ingles": "[CAMERA]: iPhone 15 Pro main lens, eye-level, handheld with natural micro-vibrations. [CHARACTER]: Female influencer using @Image2 for face identity and @Image3 for body geometry (enforcing exact bust volume and waist ratio). Wearing a casual top matching @Image1. Hair is long, dark brown. Mouth moves in perfect sync. [SCENE & AUDIO]: Bedroom environment from @Image1, warm natural light. Ambient sound: faint wind. [DIALOGUE]: Spoken Spanish text: \"¡Hola! No sabéis lo que me ha llegado hoy.\" VOICE PRINT: {voice_print}. STRICT CONSTRAINT: Lock vocal identity, pitch, and close-mic volume. Do not change speaker. [ACTION]: 00s (Arranque Dinámico): Action starts immediately in fluid motion from a new dynamic angle. 00-02s: Immediate continuous action. Right hand enters from the bottom frame; thumb and index finger grip the bare wooden base of the incense stick (@Image4). 02-06s: Speaker looks directly at lens, lips moving in sync with audio. The incense stick remains stable without clipping. [TECHNICAL RESTRAINTS]: NO bokeh. Deep focus like amateur phone camera. Solid object physics enforced. NO melting text or shifting labels. NO MUSIC.",
      "prompt_visual_espanol": "[CÁMARA]: Lente principal de iPhone... [SUJETO]: Influencer usando @Image2... [ESCENA Y AUDIO]: Habitación de @Image1... [DIÁLOGO]: Texto hablado... [ACCIÓN]: 00s: Arranque en movimiento fluido usando @Image1 como entorno. 00-02s: Acción continua inmediata, mano derecha entra por abajo... [RESTRICCIONES]: Física de objetos sólidos...",
      "guion_detallado": [
        {{
          "tiempo": "0-2s",
          "locucion": "¡Hola!",
          "accion_visual": "Arranque dinámico en movimiento fluido sin replicar imágenes previas. El pulgar y el índice de la mano derecha agarran la base de madera del incienso (@Image4). La malla de los dedos no atraviesa el objeto."
        }},
        {{
          "tiempo": "2-6s",
          "locucion": "No sabéis lo que me ha llegado hoy.",
          "accion_visual": "Contacto visual con la cámara, sincronización labial. La mano derecha mantiene el agarre estático sin deformaciones mientras habla."
        }}
      ]
    }}
  ]
}}
LISTA DE ERRORES CRÍTICOS (PENALIZACIÓN LÓGICA):
Si el JSON contiene alguno de estos errores, la generación es fallida:

Fuga de Idioma: Usar caracteres asiáticos o mezclar inglés y {target_lang} en los campos equivocados.

Morfismo y Ambigüedad: Describir acciones sin especificar el agarre exacto de la mano.

Inconsistencia de Entorno: Mover visualmente a la influencer fuera de @Image1.

Inconsistencia Fisonómica: Ignorar proporciones corporales o cambiar atributos de identidad de escena a escena.

Desconexión Temporal: Que el audio no encaje con la ación que ocurre en esos mismos segundos o que la etiqueta [DIALOGUE] no se corresponda con el audio_mode.
"""

        user_context = f"""
PRODUCTO: {product_name}
DETALLES: {product_details}
DESCRIPCION VISUAL PRODUCTO: {visual_description}
DESCRIPCION VISUAL IMAGEN BASE: {base_image_description}
INFLUENCER: {influencer_name}
REFERENCIAS ACTIVAS: {mapping_description}
GUÍA NARRATIVA: {story_guide}
DURACIÓN TOTAL SOLICITADA: {total_duration}s
MODO AUDIO: {audio_mode}
IDIOMA DE LOS GUIONES (OBLIGATORIO): {target_lang}
"""

        try:
            # Configuración para el cliente seleccionado
            kwargs = {
                "model": model,
                "messages": [
                    {"role": "system", "content": system_instructions},
                    {"role": "user", "content": user_context}
                ],
                "temperature": 0.2
            }
            
            # Solo añadir response_format si es compatible o necesario
            if provider.lower() in ["minimax", "groq", "gemini"]:
                kwargs["response_format"] = {"type": "json_object"}

            response = client.chat.completions.create(**kwargs)
            
            # Registrar coste
            if job_id and hasattr(response, "usage"):
                cost_tracker.log_token_cost(job_id, provider, model, response.usage.prompt_tokens, response.usage.completion_tokens)

            content = response.choices[0].message.content or ""
            
            with open(os.path.join(os.path.dirname(__file__), "..", "..", "debug.log"), "a") as f: f.write("Starting re.sub\n")
            # Limpieza de razonamiento (<think>)
            content = re.sub(r'<think>[\s\S]*?</think>\s*', '', content).strip()
            # Limpieza de markdown si el LLM lo incluyó
            content = re.sub(r'```json\s*|\s*```', '', content).strip()
            with open(os.path.join(os.path.dirname(__file__), "..", "..", "debug.log"), "a") as f: f.write("Finished re.sub\n")
            
            if not content:
                self._log(f"[Director v5.0] [ERROR] Respuesta vacía de {provider}")
                return {"error": f"El modelo {provider} devolvió una respuesta vacía."}

            try:
                data = json.loads(content)
                self._log(f"[Director v5.0] Plan generado con {provider}: {len(data.get('escenas', []))} clips.")
                data = self._validate_and_fix_plan(data, total_duration)
                return data
            except json.JSONDecodeError as je:
                # Intento de rescate si el JSON viene envuelto o mal formado
                match = re.search(r'(\{[\s\S]*\})', content)
                if match:
                    data = json.loads(match.group(1))
                    data = self._validate_and_fix_plan(data, total_duration)
                    return data
                self._log(f"[Director v5.0] Error parseando JSON de {provider}: {content[:100]}...")
                raise je

        except Exception as e:
            self._log(f"[Brain] Error en Director v5.0 ({provider}): {e}")
            return {"error": f"Fallo en la dirección de escena con {provider}: {str(e)}"}

    def _validate_and_fix_plan(self, plan: dict, total_duration: int) -> dict:
        """
        Validación post-LLM: Asegura que CADA escena tenga entre 4 y 10 segundos.
        Safety net por si el LLM ignora las instrucciones de duración.
        """
        scenes = plan.get("escenas", plan.get("clips", []))
        if not scenes:
            return plan

        fixed_scenes = []
        for scene in scenes:
            dur = scene.get("duracion", 5)
            if dur > 10:
                # Dividir en clips de tamaño equitativo
                num_parts = (dur + 9) // 10  # ceil division
                part_dur = dur // num_parts
                remainder = dur - (part_dur * num_parts)
                self._log(f"[Validator] ⚠️ Escena {scene.get('id','?')} tiene {dur}s > 10s → dividiendo en {num_parts} clips")
                for p in range(num_parts):
                    new_scene = dict(scene)  # copia superficial
                    new_scene["id"] = len(fixed_scenes) + 1
                    d = part_dur + (1 if p < remainder else 0)
                    new_scene["duracion"] = d
                    new_scene["_split_from"] = scene.get("id")
                    fixed_scenes.append(new_scene)
            elif dur < 4 and fixed_scenes:
                # Absorber en la escena anterior
                self._log(f"[Validator] ⚠️ Escena {scene.get('id','?')} tiene {dur}s < 4s → absorbiendo en escena anterior")
                prev = fixed_scenes[-1]
                prev["duracion"] = prev["duracion"] + dur
                # Si la absorción excede 10s, capamos a 10
                if prev["duracion"] > 10:
                    overflow = prev["duracion"] - 10
                    prev["duracion"] = 10
                    # Crear nueva mini-escena con el overflow solo si >= 4
                    if overflow >= 4:
                        overflow_scene = dict(scene)
                        overflow_scene["id"] = len(fixed_scenes) + 1
                        overflow_scene["duracion"] = overflow
                        fixed_scenes.append(overflow_scene)
            else:
                scene["id"] = len(fixed_scenes) + 1
                fixed_scenes.append(scene)

        # Re-numerar IDs y normalizar campos internos de cada escena
        for i, s in enumerate(fixed_scenes):
            s["id"] = i + 1
            # Normalizar guion
            if "script_completo" not in s:
                s["script_completo"] = s.get("script", s.get("locucion", s.get("text", s.get("texto", ""))))
            # Normalizar prompt visual
            if "prompt_visual_ingles" not in s:
                s["prompt_visual_ingles"] = s.get("prompt_visual", s.get("prompt", s.get("visual_prompt", "")))
            # Asegurar consistencia para el frontend y el backend
            s["script"] = s["script_completo"]
            s["prompt_visual"] = s["prompt_visual_ingles"]
            # También para escenas en español si existen
            if "prompt_visual_espanol" not in s:
                s["prompt_visual_espanol"] = s.get("prompt_visual_ingles", "")
            if "script_completo" not in s:
                s["script_completo"] = s.get("script", "")

        # Verificar suma total
        actual_sum = sum(s["duracion"] for s in fixed_scenes)
        if actual_sum != total_duration:
            diff = total_duration - actual_sum
            self._log(f"[Validator] ⚠️ Suma = {actual_sum}s vs esperado {total_duration}s (diff: {diff}s)")
            # Ajustar la última escena si la diferencia es pequeña
            if abs(diff) <= 3 and fixed_scenes:
                last = fixed_scenes[-1]
                new_dur = last["duracion"] + diff
                if 4 <= new_dur <= 10:
                    last["duracion"] = new_dur
                    self._log(f"[Validator] ✅ Ajustada última escena a {new_dur}s")

        plan["escenas"] = fixed_scenes
        # También normalizar clips por si acaso el frontend mira ahí
        plan["clips"] = fixed_scenes
        
        final_sum = sum(s["duracion"] for s in fixed_scenes)
        self._log(f"[Validator] ✅ Plan validado: {len(fixed_scenes)} escenas, {final_sum}s total, rango [{min(s['duracion'] for s in fixed_scenes)}-{max(s['duracion'] for s in fixed_scenes)}]s")
        return plan


    def search_product_info(self, product_name: str) -> str:
        """
        Genera una descripción detallada y ganchos de venta para un producto basado en su nombre.
        Usa el cliente directo de Gemini (Flash) para ahorrar costes.
        """
        prompt = f"""
        INVESTIGA Y GENERA UN BRIEFING DE MARKETING PARA: "{product_name}"
        
        Tu tarea es extraer los puntos clave que un Director de cine necesita para crear un anuncio viral.
        
        ESTRUCTURA REQUERIDA (Responde solo con esto):
        - PRODUCTO: (Breve descripción técnica)
        - BENEFICIOS CLAVE (USPs): (Menciona los 3 puntos más potentes)
        - ÁNGULOS DE VENTA (HOOKS): (Escribe 2-3 frases de entrada que llamen la atención)
        - SOCIAL PROOF: (Por qué es tendencia o qué dice la gente)
        
        REGLAS:
        - Idioma: CASTELLANO.
        - Formato: Lista técnica, concisa y con datos potentes.
        - Objetivo: Que el Director use esta información para escribir el guion final.
        """
        
        try:
            client, model = self._get_client_and_model("groq")
            if not client:
                # Fallback a gemini si no hay Groq
                client, model = self._get_client_and_model("gemini-flash")
            if not client:
                return f"Producto: {product_name}. Ideal para mejorar tu estilo de vida."

            response = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": "Eres un copywriter experto en ventas virales de TikTok Shop. No seas perezoso, escribe contenido extenso y detallado."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=600,
                temperature=1.0
            )
            res = response.choices[0].message.content.strip()
            self._log(f"\n[Brain] [INVESTIGACIÓN] Resultado para '{product_name}':\n{res}\n")
            return res
        except Exception as e:
            self._log(f"[Brain] Error investigando producto: {e}")
            return f"Producto: {product_name}. No se pudo investigar, rellena manualmente."

if __name__ == "__main__":
    b = Brain()
    self._log(f"[Test] API Key presente: {'Si' if b.api_key else 'No (modo mock)'}")
    
    # Test Hook
    hook = b.generate_sales_hook("Crema para piernas cansadas con efecto frío")
    self._log("Hook:", hook)
    
    # Test Director
    self._log("\n[Test] Probando Director...")
    dirs = b.generate_director_directives(
        "Crema Piernas Cansadas", 
        "Crema con mentol y árnica para aliviar la pesadez. Envase de 200ml.",
        "UGC style video of a person using crema piernas, high quality, natural motion."
    )
    self._log("Directivas:", json.dumps(dirs, indent=2, ensure_ascii=False))
