# Arquitectura de la Extensión

El código fuente de "Maximize Roundtrip" está organizado bajo un patrón de inyección de dependencias para aislar la lógica visual de la caótica API de Mutter y GNOME Shell.

## Estructura de Sub-módulos (`src/`)

El núcleo del código se divide en cinco responsabilidades principales:

### `1. core/`
**Estado Global y Configuraciones de Base**
* **`gnomeWorkspaceSettings.js`**: El corazón configurador que intercepta el inicio de la extensión para clavar (pin) el Workspace Principal 0 al usuario, forzando la directiva estática `dynamic-workspaces=false` en el entorno Mutter subyacente. Asegura que el entorno basal sea resistente a interacciones accidentales de creación de Workspaces desde el teclado.
* **`stateRegistry.js`**: Patrón Singleton que actúa como una base de memoria vital. Almacena silenciosamente la geometría, posición y el monitor exacto donde una ventana habitaba *antes* de sufrir una mutación de estado (maximizarse), actuando como salvavidas para su retorno ("Roundtrip").
* **`logger.js`**: Estandariza la salida de consola y facilita la depuración de componentes.

### `2. windows/`
**Ciclo de Vida de Actores Gráficos**
* **`windowTracker.js`**: El Director. Observa los eventos de la sesión como `size-changed` o `unmanaged`. Decide cuándo interrogar al `workspaceManager.js` para crear salas virtuales nuevas destinadas a albergar aplicaciones maximizadas, y de igual forma, cuando "regresarlas a casa" hacia Workspace 0.
* **`windowGeometry.js`**: Módulo puro de cálculo. Captura el instante preciso en el espacio bidimensional de Clutter (X,Y,W,H) de una ventana al iniciar su transformación y orquesta matemáticamente la interpolación para regresarla intacta a su sitio de partida.
* **`windowState.js`**: Intercepta a nivel lógico el flujo. Define el filtro de "Interés", ignorando menús desplegables, consolas flotantes (drop-down), pop-ups del sistema o ventanas fijas, para que no entren en el Roundtrip.

### `3. workspace/`
**Infraestructura de Salas Virtuales**
* **`workspaceManager.js`**: Abstrae las primitivas de GNOME Shell. Proveedor de índices estáticos y del mecanismo de inyección de nuevas salas.
* **`workspaceCleanup.js`**: El servicio de Limpieza. Instala un Timeout asíncrono pasivo que verifica en segundo plano que no existan Workspaces fantasma huérfanos sin ventanas. Si existen, reordena la pila completa de la dimensión para evitar que el usuario se pierda en cajas vacías.

### `4. ui/`
**Capa de Presentación e Iteración Directa**
* **`workspaceSelector.js`**: Destrona visual y funcionalmente al `Alt+Tab` de Mutter. Implementa de forma asíncrona un Head-Up Display interactivo (HUD) que extrae las miniaturas verdaderas de aplicaciones desde Clutter y las muestra en pantalla. Maneja historiales MRU y su propio sistema de entradas.
* **`minimizedIndicator.js`**: Dibuja restricciones y barras flotantes en el borde izquierdo de Workspace 0. Su lógica incluye interceptación en vivo del estado de "Minimized" de todos los actores en Meta, forzando actualizaciones activas de su DOM St.Widget para mostrar al usuario qué se esconde bajo el capó.

### `5. input/`
**Seguridad e Intercepción Nativa**
* **`altTabManager.js`**: Punto de entrada a nivel de GNOME Extensions. Purga el teclado de atajos conflictivos del `switch-applications` basal y permite inyectar nuestras rutinas personalizadas a la capa de `Main.wm`.
