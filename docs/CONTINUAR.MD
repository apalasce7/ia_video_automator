# 🚀 Ruta de Evolución: UGC Automator (v2.5)

Este documento centraliza el estado actual del sistema, los hitos alcanzados y la hoja de ruta técnica para las próximas fases de escalado.

## ✅ Hitos Alcanzados (Q2 2026)

### 1. Restauración del Editor Modular & Mirroring
- **Edición Granular:** Implementado el renderizado dinámico `parseSections` que divide el prompt visual en cajas independientes (Action, Dialogue, Camera, etc.).
- **Dualidad de Traducción:** Sistema de dos botones (Script vs Prompt) totalmente funcional con protección de diálogos (`PROTECTED_SPOKEN_TEXT`).
- **Modo Espejo (Mirroring):** Sincronización bidireccional entre el campo `[DIALOGUE]` del prompt y el Script de locución.
- **Persistencia de Ediciones:** Implementado el sistema de `dirtyTagsRef` para que las traducciones automáticas no sobrescriban cambios manuales del usuario.

### 2. Estabilización Lingüística y Fonética (NUEVO)
- **Acentuación Nativa:** El sistema ahora distingue entre **Castellano (ES)** y **Latinoamericano (MX)**, además de EN, FR, DE, IT y PT.
- **Voice Print Dinámico:** La huella vocal ya no es estática; se genera en tiempo real por proyecto para asegurar que la modelo hable con el acento y vocabulario regional correcto (evitando el "tuteo" en España o el "vosotros" en LATAM).
- **Refuerzo en Wavespeed:** Inyección automática de `accent_constraint` en el pipeline de Seedance 2.0.

### 3. Arquitectura de Almacenamiento & Limpieza
- **Centralización Multimedia:** Todos los activos residen en subcarpetas organizadas (`base_images`, `seedance_videos`, etc.).
- **Migración Exitosa:** Todos los proyectos antiguos han sido parcheados para apuntar a la nueva estructura de carpetas.
- **Purga Profunda:** Endpoint de eliminación que limpia tanto la base de datos como los archivos físicos asociados.

---

## 🛠️ Próximos Pasos (Nuevos Desafíos)

### 1. Subtítulos Dinámicos "Estilo Viral"
- [ ] Integrar **Whisper** (vía Groq/OpenAI) para generar transcripciones precisas.
- [ ] Renderizar subtítulos directamente en el vídeo mediante FFmpeg con estilos CSS/ASS (colores vibrantes, fuentes TikTok).

### 2. Gestión de Créditos y Wallet
- [ ] Implementar un sistema de `CostTracker` real que descuente créditos de Wavespeed/MiniMax por cada generación exitosa.
- [ ] Interfaz de "Wallet" en el dashboard para que el usuario vea su saldo de producción.

### 3. Multi-Cuentas y Publicación Directa
- [ ] Integrar la API de TikTok para subir los vídeos ensamblados directamente desde el "Archivo Historial".
- [ ] Soporte para múltiples perfiles de TikTok Shop.

### 4. Pulido de UI/UX
- [ ] Eliminar los últimos scrollbars internos detectados en el `ResultModal`.
- [ ] Mejorar la transición visual al "Rebobinar" escenas para que se sienta como un "Time Travel" de producción.

---

## 📌 Guía Rápida para el Desarrollador
- **Backend:** `main.py` gestiona la orquestación. Los prompts dinámicos viven en `modules/brain.py`.
- **Frontend:** La lógica principal reside en `page.tsx`, apoyada por componentes modulares en `/components`.
- **Regla de Oro:** Antes de modificar acentos o idiomas, verificar el mapeo en `brain.py` y `wavespeed_client.py`.
