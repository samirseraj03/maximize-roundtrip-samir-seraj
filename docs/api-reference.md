# API Reference

This document provides a concise list of exposed classes, services, and core functions for developers intending to modify or debug the extension logic.

*(Note: Internal JavaScript functions denoted with leading underscores `_` are private and should be accessed only through explicit wrapper routines).*

## 1. Core Services

### `stateRegistry.js: RoundtripStateRegistry`
Singleton manager maintaining the ephemeral coordinates of windows.
* `saveState(windowId, properties)`: Memorizes metadata (`x`, `y`, `width`, `height`, `workspaceIndex`, `monitorIndex`) against a window's UID.
* `getState(windowId)`: Retrieves the saved `properties` object.
* `deleteState(windowId)`: Flushes the state permanently from RAM.

### `gnomeWorkspaceSettings.js: GNOMEWorkspaceSettings`
Environment initializer manipulating DConf paths.
* `enforceStaticWorkspaces()`: Brutally overrides `dynamic-workspaces` (to `false`) and `num-workspaces` (to `1`). Emits warnings if permissions fail.
* `restoreOriginalSettings()`: Unbinds the extension configurations and restores the original GNOME preferences previously recorded during startup.

## 2. Windows Management

### `windowTracker.js: WindowTracker`
The primary class hooking into `global.display` window signals.
* `enable()`: Mounts listeners for `window-added`, `window-removed`, `size-changed`, and `unmanaged`.
* `_onWindowSizeChanged(metaWindow)`: The cornerstone logic hook. Determines if `metaWindow.maximized_horizontally` triggers the push to a new Workspace, or if contractions trigger a Roundtrip return.

### `windowGeometry.js`
Stateless utility module providing geometry computations.
* `captureGeometry(metaWindow)`: Returns an absolute coordinate Object containing the frame rect boundaries.
* `restoreGeometry(metaWindow, state)`: Forcefully moves a `Meta.Window` back to the spatial location defined in `state`.

## 3. UI and Interaction

### `workspaceSelector.js: WorkspaceSelector`
The Head-Up Display overlapping the screen during Alt+Tab interception.
* `enable()`: Connects passive `captured-event` listeners and native `Main.wm.addKeybinding` actions.
* `_trigger(backward)`: Invokes the asynchronous render of the interactive grid and starts polling for modifier key combinations.
* `_commit()`: Jumps immediately into the highlighted workspace thumbnail array index and flushes the canvas.

### `minimizedIndicator.js: MinimizedIndicator`
Tracks icon states and generates sidebar docking visuals.
* `_syncVisibility()`: Evaluates GSettings (`show-minimized-indicators`) and the current active Workspace ID to determine whether the transparent floating bar should be appended or withdrawn.
* `_updateIndicators()`: Iterates through `global.display.get_tab_list()` looking for `is_minimized() === true`, spawning StIcon Clutter items with attached activation click-events.
