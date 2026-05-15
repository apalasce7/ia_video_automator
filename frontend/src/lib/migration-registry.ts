/**
 * Registro de Migración - UGC Automator
 * 
 * Marca aquí los módulos y funciones que ya han sido trasladados de page.tsx
 * hacia la nueva estructura de Next.js App Router (Fase 3+).
 *
 * EJEMPLOS DE ESTADOS:
 * [x] = Migrado y probado
 * [/] = En proceso
 * [ ] = Pendiente
 *
 * MÓDULOS DE DATOS:
 * [x] Tipos extraídos a lib/types.ts
 * [x] fetchJobs y polling extraído a hooks/useJobs.ts
 * [x] fetchInfluencers extraído a hooks/useInfluencers.ts
 * [x] checkHealth extraído a hooks/useBackendStatus.ts
 * [x] Funciones HTTP fetch envueltas en lib/api.ts
 *
 * COMPONENTES DE UI:
 * [ ] Traducción y sistema DeepL (refs liveValues, dirtyTags) -> montaje/SceneEditor
 * [ ] Formularios de Creación (25 variables de estado) -> estudio/ugc/page.tsx
 * [ ] Aprobación de Escenas -> montaje/ApprovalPanel
 * [ ] Análisis de TikTok -> estudio/TikTokAnalyzer
 * [ ] Búsqueda de Productos -> estudio/ProductSection
 * 
 * NOTA: Esta lista previene funciones 'zombie' y permite seguir el estado del monolito.
 */
