# User Guide

Welcome to **Maximize Roundtrip**! This guide outlines how to adapt your workflow to the extension's philosophy and solutions to common questions.

## The 3-Step Quick Start
1. **The Safe Zone:** Leave all your un-maximized, floating windows (Chats, music, terminals) in the same place. **Always stay in Workspace 0.**
2. **Deep Focus:** When you need to read a long PDF or work on a single file, simply grab the window and maximize it (using the title bar icon or pressing `Super+Up`). 
   - *Result: The window will gracefully disappear and you will slide into a brand new Workspace alone with that app.*
3. **Roundtrip Return:** Tired of focusing? Drag the window downwards, un-maximize it, or close it. 
   - *Result: You will instantly slide back to Workspace 0. Your messy origin desktop is exactly as you left it, and the temporary workspace vanishes.*

## Keyboard Shortcuts
The extension seamlessly integrates with native GNOME but supersedes application rotation:
* **`Alt` + `Tab`**: Instantly swaps between your full-screen workspaces and back to your origin desktop.
* **`Alt` (Hold) + `Tab` (Tap repeatedly)**: Opens the chronological HUD visualizer so you can see miniatures of your workspaces and navigate linearly through history.
* **`Super` + `Up` / `Down`**: Native GNOME shortcut. Maximizing / Restoring a window will trigger the Roundtrip automation immediately.

## Troubleshooting & FAQ

**Q: I try generating new workspaces pressing `Super+PageDown`, but nothing happens!**
**A:** This is by design. Maximize Roundtrip dynamically controls your workspace count based entirely on your Maximized windows. Because it forcibly locks GNOME dynamically to `num-workspaces=1`, manual empty spaces are disabled. Only maximizing an app creates a new room.

**Q: I used Alt+Tab but the workspace screen froze!**
**A:** Make sure you are using the latest cloned repository version. This was a common Wayland issue that has been patched entirely in our new Hybrid Asynchronous Keyboard Capture. If the UI gets stuck, simply click anywhere on your mouse to dismiss the box.

**Q: Where can I see minimized windows?**
**A:** If you reside on your main desktop (Workspace 0) and minimize a window, a slick vertical bar will emerge on the far left edge of your screen portraying the icon of the hidden application. You can toggle this visual helper from the Extension GNOME Settings app.
