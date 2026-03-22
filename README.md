# Maximize Roundtrip (GNOME Shell Extension)

[![GNOME Version](https://img.shields.io/badge/GNOME-45%2B-blue)](https://gnome.org)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![Languages](https://img.shields.io/badge/Languages-ES%20%7C%20EN-orange)](#) 

> 🇪🇸 **¿Hablas Español?** Lee la versión en español en [README_es.md](README_es.md).

**Maximize Roundtrip** is a productivity GNOME Shell Extension that completely redesigns how you interact with maximized application windows and virtual workspaces. It automatically moves full-screen tasks to their own dedicated workspaces while keeping your primary desktop clean and untouched.

![Main functionality showcase](docs/images/placeholder_showcase.gif)  
*(Insert your showcase GIF here)*

---

## ⚡ Quick Start & Installation

To easily install the extension from the source code, simply clone the repository and compile the schemas.

1. **Clone the repository:**
   ```bash
   git clone https://github.com/samirseraj03/maximize-roundtrip ~/.local/share/gnome-shell/extensions/maximize-roundtrip@samir-seraj
   cd ~/.local/share/gnome-shell/extensions/maximize-roundtrip@samir-seraj
   ```
2. **Compile the settings schemas:**
   ```bash
   glib-compile-schemas schemas/
   ```
3. **Restart GNOME Shell:**
   * **Wayland:** Log out of your session and log back in.
   * **X11:** Press `Alt+F2`, type `r`, and hit `Enter`.
4. **Enable the Extension:**
   Use the GNOME Extensions App or the terminal:
   ```bash
   gnome-extensions enable maximize-roundtrip@samir-seraj
   ```

---

## 🧠 Philosophy: The "Roundtrip" Concept

Traditional desktop environments pile windows on top of each other. When you maximize an application, it covers your terminal, your unread chats, and your floating windows. 

**Maximize Roundtrip changes this paradigm by enforcing a single, fixed Origin Workspace (Workspace 0).**

All your floating, stacked, and small windows live permanently in the Origin Workspace. 
* **The Outward Trip:** When you maximize an application to focus deeply on it, the extension intercepts this event, asks GNOME for a completely new, empty Workspace on the fly, and moves the maximized app there. 
* **The Return Trip:** When you are done focusing and decide to restore, un-maximize, or close the application, the extension magically teleports the window back to its exact original `(X, Y)` position in the Origin Workspace, immediately destroying the empty temporary workspace. 

This naturally creates a **Roundtrip lifecycle**, ensuring your primary desktop remains uncluttered while giving full-screen tasks the space they deserve.

---

## 🎮 Usage and Features

### 1. Most Recently Used (MRU) Workspace Switcher
The extension intelligently disables GNOME's native `Alt+Tab` (switch-applications) and replaces it with an asynchronous **MRU Workspace Selector**.

![Alt Tab Workspace Selector](docs/images/placeholder_alttab.gif)  
*(Insert your Alt+Tab GIF here)*

- **Quick Swap:** A fast press of `Alt+Tab` instantly swaps your view between your current fullscreen workspace and your previous workspace (usually your main desktop).
- **Visual HUD:** If you hold `Alt` (or your Mod key), a head-up display appears in the center of the screen, displaying the actual icons of the applications running in each workspace. 
- You can cycle through the chronological history of workspaces simply by tapping `Tab` or mapping it with the arrow keys. 
- *Note: It uses a non-modal Clutter hybrid architecture, providing absolute safety against Wayland modal freezes.*

### 2. Minimized Apps Left-Dock Indicator
Tired of minimizing floating windows and losing track of them in Workspace 0? 

![Minimized Indicator Dock](docs/images/placeholder_minimized.gif)  
*(Insert your minimized panel GIF here)*

If enabled, a sleek, vertically aligned dock will appear on the left edge of Workspace 0. This dock actively listens for minimized applications and creates clickable visual representations of their icons. Once you click the icon, the application restores gracefully.

---

## ⚙️ Configuration & Under The Hood

To make this dynamic "Maximized = New Workspace" ecosystem flow perfectly, **the extension claims ownership of your Workspace tracking.** 

When enabled, the extension forcefully injects the following properties into Mutter's DConf registry:
* `org.gnome.mutter dynamic-workspaces` 👉 `false` (Disables GNOME's default dynamic creator).
* `org.gnome.desktop.wm.preferences num-workspaces` 👉 `1` (Locks down your Origin Workspace).

> **Warning:** You cannot create empty workspaces manually via GNOME shortcuts while the extension is enabled. The entire virtual dimension is automatically handled by the lifecycle of maximized windows!

---

## 📚 Technical Documentation

Are you a developer or looking to contribute to the codebase? Please refer to the `/docs` folder for exhaustive technical designs and API references:

* [Architecture Overview](docs/architecture.md)
* [State Management & The Roundtrip Lifecycle](docs/state_management.md)
* [Input Handling & Wayland Mechanics](docs/input_handling.md)
* [API Reference](docs/api-reference.md)
* [Changelog](docs/changelog.md)

---

## 🛠️ Technologies Used
- **JavaScript (ES6+)** with GJS (GNOME JavaScript bindings).
- **Clutter / St (Shell Toolkit)** for DOM-like UI rendering.
- **Mutter & Meta** for native window manager control and X11/Wayland abstraction.
- **GLib / Gio** for asynchronous IO, configurations, and loop timeouts.

---
**License:** GPL-3.0