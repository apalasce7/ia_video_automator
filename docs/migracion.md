### Especificación de Producto: UGC Automator v2 (Reestructuración)

**1. Navegación y Estructura Base**

* **Menú Lateral Izquierdo (Fijo/Colapsable):**
* Influencers
* Estudio de Creación
* Mesa de Montaje
* Archivo Historial
* Settings


* **Navegación Superior:** Avatar de usuario (derecha) para acceso rápido a cuenta.

**2. Autenticación y Cuentas (Auth)**

* **Login:** Email/Contraseña, "Recuperar contraseña", y SSO (Google, TikTok).
* **Registro:** Nombre, Email, Contraseña, Aceptación de Términos. Redirección automática al Estudio de Creación/Anuncio UGC.

**3. Sección: Influencers**

* **Gestión:** Crear y modificar perfiles.
* **Campos Requeridos:** Foto de Cara, Foto de Cuerpo (hoja de personaje), Género, Timbre de voz.
* **Lógica Backend:** Estos datos alimentarán `backend/main.py` para generar dinámicamente el *Voice Print* (ej. *25-year-old female, native Castilian Spanish...*) al configurar un nuevo proyecto y se complementaran con los datos seleccionados en la creacion de un nuevo proyecto en la seccion Estudio de Creación.

**4. Sección: Estudio de Creación (Nuevos Flujos)**
Al ingresar, el usuario seleccionará entre 3 rutas de creación antes de ver el editor:

1. **Anuncio UGC:** Formato actual de venta/producto. Mantiene los campos actuales (URL o imagen para imagen base, Identidad (modelo), Imagenes Producto, Nombre producto, hook producto, Guion opcional, Motor IA), narrativa y guion (igual) y motor de produccion (igual). (Es decir se traslada todo lo unico que la creacion de la modelo es en otra seccion aquí solo se selecciona el influencer)
2. **Clonar Referencia:** Replicación de un video base aplicando la modelo y escenario del usuario y añadiendo tambien todos los campos necesarios como en el apartado de Anuncio UGC. Los que se consideran necesarios.
3. **Generación Libre:** Video guiado por prompt (ej. "chica llorando"), sin enfoque de venta. con opcion de añadir un texto abajo del video y añadiendo tambien todos los campos necesarios como en el apartado de Anuncio UGC. Los que se consideran necesarios.

* *Nota:* Se integrarán los parámetros de proyecto actuales (fotos, hook, narrativa) según la ruta seleccionada y el resto de parametros para generar el *Voice Print* (tono de voz, volumne cecano al microfono o lejano, ritmo, etc)
* *Ejemplo Voice Print:* 25-year-old female, native Castilian Spanish from Spain, energetic UGC tone, slightly raspy timbre, close-mic volume, consistent mid-range pitch, conversational pacing.

**5. Mesa de Montaje vs. Archivo Historial**

* **Mesa de Montaje:** Espacio de trabajo exclusivo para proyectos inacabados o borradores en curso.
* **Archivo Historial:** Repositorio de videos generados y finalizados.
* **Flujo de Reedición:** Al seleccionar "Modificar" en un proyecto del Historial, no se sobrescribe; se crea un nuevo borrador en la Mesa de Montaje.

**6. Configuración y Facturación**

* **Menú de Usuario (Avatar):**
* Mi Perfil.
* Plan/Créditos (consumo actual).
* Facturación (Métodos de pago tipo Stripe, descarga de facturas, Upgrade/Downgrade de planes Free/Pro/Agency).
* Cerrar Sesión.


* **Settings (Menú Lateral):**
* Idioma.
* Modo Claro/Oscuro.
* Plantillas de Prompts por defecto.