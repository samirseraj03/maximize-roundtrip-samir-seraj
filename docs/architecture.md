# Architecture Overview

This extension is built on principles of dependency injection, isolating its visual logic from Mutter's underlying system APIs. It is divided into 5 clear sub-domains housed under the `src/` directory.

## Directory Structure

### `1. core/`
**Global state and fundamentals**
* **`gnomeWorkspaceSettings.js`**: Core module that aggressively forces GNOME into Static Workspace mode (`dynamic-workspaces=false` and `num-workspaces=1`) by injecting DConf keys on startup. Ensuring this base environment is critical for the extension to safely assume control over workspace creation.
* **`stateRegistry.js`**: A Singleton memory vault. It silently saves the absolute `(X, Y, Width, Height)` geometry and monitor index of a given window *before* a state mutation (like maximizing) happens, allowing the system to restore it during the "Roundtrip".
* **`logger.js`**: Standardizes console output and debugging tags.

### `2. windows/`
**Window Actor Lifecycle**
* **`windowTracker.js`**: The Director. Listens to Mutter session events such as `size-changed` or `unmanaged`. It decides when to query `workspaceManager.js` to spawn virtual rooms for maximized apps, and when to pull them back home.
* **`windowGeometry.js`**: Pure mathematics module. Captures the precise 2D spatial coordinates of a window in the Clutter space and orchestrates mathematical interpolation to return it unharmed.
* **`windowState.js`**: Filters out unimportant actors like drop-downs, system popups, or fixed-layout shells, preventing them from joining the Roundtrip ecosystem.

### `3. workspace/`
**Virtual Room Infrastructure**
* **`workspaceManager.js`**: Abstracts GNOME Shell primitives. Acts as a provider of static indices and mechanism for injecting new workspaces into the native array.
* **`workspaceCleanup.js`**: The asynchronous Garbage Collector. Installs a passive timeout that background-checks for orphaned, windowless ghost workspaces. Destroys them seamlessly to keep the array healthy.

### `4. ui/`
**Presentation and User Interaction**
* **`workspaceSelector.js`**: Usurps the throne of Mutter’s `Alt+Tab`. Asynchronously implements an interactive HUD that grabs live application thumbnails from Clutter. Manages MRU (Most Recently Used) histories.
* **`minimizedIndicator.js`**: Draws layout constraints and floating app-icons at the left edge of Workspace 0. Dynamically intercepts the "Minimized" state of all Meta actors, forcing its own DOM to update to represent hidden apps.

### `5. input/`
**Native Key Interception**
* **`altTabManager.js`**: Disables Mutter’s native binding for `switch-applications` so that `workspaceSelector` doesn't fight the operating system for keyboard focus.
