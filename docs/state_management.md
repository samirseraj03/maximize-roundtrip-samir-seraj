# State Lifecycle: El "Roundtrip"

El concepto de "Ida y Vuelta" introduce un paradigma donde el Desktop ya no trata a las dimensiones de pantalla como estáticas, sino como contenedores descartables efímeros para aplicaciones Fullscreen.

A continuación se detalla la coreografía de estados, coordinada entre el `windowTracker.js` y el patrón de memoria `stateRegistry.js`.

## Estados de Transición

### Fase A: Intercepción (Pre-Maximización)
El motor principal basa su lógica en la observación pasiva. El usuario decide que necesita concentración plena e invoca una orden de "Maximizar" (haciendo click en el icono cuadrado o mediante atajo de teclado nativo).
1. El Sistema Operativo (Mutter X11/Wayland) informa del inicio de mutación del estado Meta mediante el evento emitido `size-changed`.
2. El `windowTracker.js` intercepta esta llamada en tiempo real *antes* de que ocurra la transición visual, inmoviliza la capa y extrae el identificador Meta único de la ventana.
3. Solicita a `windowGeometry.js` que salve las coordenadas espaciales `(X, Y, Ancho, Alto, WorkspaceActual, Monitor)` en una estructura inmutable llamada `RoundtripState`.
4. El registro inmutable es anexado al Singleton `stateRegistry.js`, asegurando un historial histórico individual por cada PID maximizado.

### Fase B: Dispersión (Nacimiento de Workspaces Temporales)
Tras salvar un backup de la geometría real de la aplicación, es imperativo despejar el área del origin:
1. El coordinador emite una orden sincrónica al `workspaceManager.js` para pedirle al gestor nativo de GNOME (`global.workspace_manager`) que instancie la creación de una dimensión enteramente nueva y vacía, apilada al final del *Array* virtual.
2. Inmediatamente terminada la instancia, el `windowTracker.js` ordena la translocación de la Meta Window desde su hogar natal (Workspace 0) directo hacia este nuevo Workspace Temporal. 
3. *Resultado Visual:* El usuario experimentará la fluida transición de deslizamiento propia del entorno de GNOME hacia un cuarto virtual liso con la nueva aplicación en Fullscreen.

### Fase C: Recolección y Retorno
El usuario finaliza la edición de su documento/película en la caja virtual y solicita el cierre o la des-maximización nativa:
1. El evento es interceptado inversamente. `windowTracker.js` nota una contracción del flag de `Maximized`.
2. Consulta asíncronamente a `stateRegistry.js`: *"¿Tenemos un vuelo registrado para esta ID de ventana?"*.
3. Si lo existe, inmediatamente arranca el motor del Roundtrip: El manejador transloca automáticamente la caja desde su dimensión vacía superior de vuelta al índice nativo inicial (usualmente Workspace 0).
4. El sistema inyecta en su `Meta.Window.move_frame` estricto las coordenadas (X, Y) originarias guardadas previamente.
5. El *Garbage Collector* o Barrendero Asíncrono (`workspaceCleanup.js`) vigila y tras un retraso tolerante de 350 milisegundos destruye la dimensión efímera vacía para no estorbar el esquema del usuario.
