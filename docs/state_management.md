# State Management: The "Roundtrip" Lifecycle

The "Roundtrip" concept introduces a paradigm where the Desktop dimension is no longer static—workspaces are treated as disposable, ephemeral containers for fullscreen applications.

Below is the state choreography coordinated between `windowTracker.js` and the `stateRegistry.js` vault.

## Transition States

### Phase A: Interception (Pre-Maximization)
The core engine relies on passive observation. When the user requests a "Maximize" operation (via icon clicking or keyboard shortcuts):
1. The OS (Mutter X11/Wayland) signals the start of the Meta state mutation via the `size-changed` event.
2. `windowTracker.js` intercepts this in real-time *before* the visual transition executes, freezes the layer, and strips the unique Meta window ID.
3. It asks `windowGeometry.js` to save the spatial coordinates `(X, Y, Width, Height, CurrentWorkspace, Monitor)` into an immutable `RoundtripState` structure.
4. The immutable log is appended to the `stateRegistry.js` Singleton, ensuring historical persistence.

### Phase B: Dispersion (Birth of Temporary Workspaces)
After securing a strict backup of the application's geometry, the engine dictates clearing the origin area:
1. The coordinator emits a synchronous command to `workspaceManager.js` to query GNOME’s native manager (`global.workspace_manager`), spawning an entirely new, empty dimension at the end of the workspace array.
2. Instantly, `windowTracker.js` orders the translocation of the Meta Window from its native home (Workspace 0) straight to this new index.
3. *Visual Result:* The user experiences the fluid GNOME sliding transition into a blank room alongside the newly maximized app.

### Phase C: Collection and Return (Roundtrip)
When the user finishes their work and requests a close or un-maximize command:
1. The event is caught inversely. `windowTracker.js` notices a state contraction of the `Maximized` flag.
2. It asynchronously checks `stateRegistry.js`: *"Do we have a flight recorded for this window ID?"*.
3. If true, the engine forcefully kicks the window box back into its native origin index (usually Workspace 0).
4. The system injects the strict original `(X, Y)` coordinates into the native `Meta.Window.move_frame` method.
5. The asynchronous Garbage Collector (`workspaceCleanup.js`) watches quietly. After a 350-millisecond tolerance delay, it destroys the empty ephemeral dimension to prevent clutter.
