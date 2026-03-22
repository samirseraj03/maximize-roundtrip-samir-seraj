# Keyboard Interception and Hybrid Event Catching

The extension rescinds the classic behavior of `Alt+Tab` in GNOME Shell to enable a visual inter-workspace selector. Overwriting the native keyboard compositor behavior on modern displays (like Wayland) presents unique challenges that the extension resolves by utilizing a **Hybrid Non-Modal** interception design.

## Why avoid Modal Grabs?
In legacy architectures and classic extensions, hijacking a global keyboard shortcut (like Alt+Tab) relied on injecting a *Modal Grab* (e.g., `Main.pushModal`). A Modal Grab commands Clutter to steal absolutely all pointer and keyboard focus events, funneling them strictly into a specific visual *Actor*.
Under stringent Wayland protocols, this method is fundamentally susceptible to *Race Conditions*:
- If a user interacts with their keyboard faster than the JS rendering thread (e.g., releasing the modifier key *before* the modal grabs the focus).
- Wayland will aggressively freeze the pointer and physical modifier states, causing the interface to never receive the `KeyRelease` event. The system falsely assumes the central modifier remains pressed, irrevocably freezing the user session's input layer.

## The Solution: Asynchronous Hybrid Capture

To circumvent asynchronous deadlocks and preserve the original operational fluidity of the system, `WorkspaceSelector.js` dissociates the physical key press (`KeyPress`) from its release (`KeyRelease`).

### 1. Shortcut Injection (Press)
Instead of capturing raw keyboard IO, the extension dialogues directly with the native Window Manager (Mutter) by masking the `next-window` and `prev-window` directives.
* **Mechanism:** `Main.wm.addKeybinding()`
* **Objective:** This guarantees that the core OS recognizes (and cleanly blocks downward to applications) the intent to trigger `Alt+Tab` or its reverse. Each cyclic activation simply advances the MRU pointer of the extension, drawing or reloading the passive visual UI without violently stealing baseline keyboard focus.

### 2. Open Canvas Monitoring (Release)
Knowing the exact millisecond the user has decreed their interactive selection by finally releasing the `Alt`/`Super` key requires an "Absolute Pitch" across all global events without suffocating them:
* **Mechanism:** `global.stage.connect('captured-event')`
* **Objective:** A passive asynchronous listener is injected into the general GNOME canvas (Stage). Being of *Captured* grade, it reads the raw signal before it branches downwards.
* If it visualizes that a pertinent key was released (`Type === KEY_RELEASE` & not an arrow/navigation key), it processes the mutation assuming a "Commit".
* **Advantage:** Since it is not Modal, if the user decides to click entirely outside the environment or Wayland desynchronizes, there are no destructive I/O deadlocks. The cursor and the applications beneath the HUD remain alive and receive all `event_propagate` actions freely.

### 3. Pointer-Level Active Security Timer
As a secondary mitigation net (Fallback loop), a `GLib.timeout_add` cyclically polls (every 50ms) `global.get_pointer()` for the bitmask of modifiers on the Virtual Seat. This forces an imperative removal of the visual selector should the `MOD1_MASK` or `SUPER_MASK` flags disappear natively from the peripheral hardware.
