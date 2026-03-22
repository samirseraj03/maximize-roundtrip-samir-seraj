# Interceptación de Teclado y Eventos de Entrada Híbrida

La extensión rescinde del comportamiento clásico de `Alt+Tab` en GNOME Shell para habilitar un selector visual inter-workspaces. La sobreescritura nativa del teclado en gestores de composición modernos (como Wayland) presenta desafíos únicos que la extensión resuelve mediante un diseño de interceptación de entrada **Híbrido No-Modal**.

## ¿Por qué evitar Modal Grabs?
En arquitecturas previas y extensiones clásicas, secuestrar un atajo global de teclado (como Alt+Tab) dependía de inyectar un *Modal Grab* (ej. `Main.pushModal`). Un Modal Grab exige a Clutter robar absolutamente todo el foco de punteros y teclado enfocando los eventos únicamente en un *Actor* visual específico.
Bajo protocolos estrictos de Wayland, este método es susceptible a *Race Conditions*:
- Si un usuario interactúa con su teclado a mayor velocidad que el hilo de renderizado de JS (ej. soltando la tecla modificadora *antes* de que se active el grab).
- Wayland congelará el estado del puntero y del modificador físico, ocasionando que la interfaz jamás reciba el evento `KeyRelease`. El sistema asume falsamente que el modificador central sigue manteniéndose presionado, congelando irrevocablemente la entrada de la sesión del usuario.

## Solución: Captura Híbrida Asíncrona

Para eludir bloqueos asíncronos y mantener la fluidez operativa original del sistema, `WorkspaceSelector.js` disocia la presión física de la tecla (`KeyPress`) respecto a su liberación (`KeyRelease`).

### 1. Inyección de Atajos (Press)
En lugar de capturar el teclado crudo, la extensión dialoga directamente con el Window Manager nativo (Mutter) enmascarando las directivas `next-window` y `prev-window`.
* **Mecanismo:** `Main.wm.addKeybinding()`
* **Objetivo:** Esto garantiza que el sistema operativo central reconozca de manera segura (y bloquee hacia las aplicaciones debajo) el intento de usar `Alt+Tab` o su reverso. Cada activación cíclica simplemente avanza el puntero MRU de la extensión, dibujando o recargando la interfaz visual pasiva sin robar el teclado base.

### 2. Observación de Tela Abierta (Release)
Saber en qué milisegundo el usuario ha dictaminado su selección interactiva soltando definitivamente la tecla `Alt`/`Super` requiere un "Oído Absoluto" sobre todos los eventos globales sin entorpecerlos:
* **Mecanismo:** `global.stage.connect('captured-event')`
* **Objetivo:** Se inyecta un *listener* asíncrono pasivo sobre el lienzo general de GNOME (Stage). Al ser de grado *Captured*, lee la señal cruda antes de ramificarse hacia abajo.
* Si visualiza que se soltó pertinentemente una tecla clave (`Type === KEY_RELEASE` & No es una tecla de navegación como las Flechas), procesa la mutación asumiendo el "Commit". 
* **Ventaja:** Como no es Modal, si el usuario decide clickear fuera del entorno o Wayland se des-sincroniza, no existen bloqueos destructivos de E/S. El cursor y las aplicaciones bajo el HUD continúan vivas y recibiendo *event_propagate*.

### 3. Temporizador Activo de Seguridad a Nivel Puntero
Como red de mitigación secundaria (Fallback), un `GLib.timeout_add` consulta cíclicamente (50ms) a `global.get_pointer()` la máscara bit de modificadores del Asiento Virtual, forzando la remoción imperativa del selector visual si los Flags `MOD1_MASK` o `SUPER_MASK` desaparecen del hardware.
