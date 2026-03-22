# Changelog

All notable changes to the `Maximize Roundtrip` extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project loosely adheres to Semantic Versioning.

## [1.1.0] - 2026-03-22
### Added
- **Minimized Applications Sidebar (Workspace 0)**: Implemented `MinimizedIndicator.js` to draw a transparent dock populated with icons corresponding to hidden/minimized applications.
- **GNOME Setting Schemas**: Implemented `org.gnome.shell.extensions.maximize-roundtrip.show-minimized-indicators` boolean key to toggle the sidebar functionality on and off.
- **Visual Application Extraction**: `WorkspaceSelector` now displays real `Meta.Window` thumbnail icons mapped directly beneath their respective Workspace number badges.

### Changed
- **Architectural Rewrite (`WorkspaceSelector`)**: Replaced standard blocking `Main.pushModal` UI injections with a hybrid `global.stage.connect` asynchronous listener. This resolves critical Wayland race conditions that were indefinitely deadlocking the system's keystrokes.
- **Documentation Overhaul**: Translated entirely to standardized English SDK rules. Separated READMEs (`README.md` and `README_es.md`) and instituted a `/docs` architecture.
- **Source Code Language**: Restructured JS files to utilize strictly English JSDoc-style comments for technical maintainability. 

### Fixed
- **Ghost Workspace Issue**: Prevented `unmanaged` close signals from incorrectly purging the ephemeral clean-up loop tracking. Empty virtual rooms are successfully parsed and swept 350ms after an active full-screen window closes.
- **Modifier Freeze Bug**: Deactivated leftover `Main.popModal` orphaned commands rendering the interface invincible when Alt keys were rapidly tapped.

## [1.0.0] - Initial Fork / Release
### Added
- Fundamental functionality intercepting `size-changed` and routing maximized frames dynamically across new indices.
- Aggression locks into GNOME DConf setting `dynamic-workspaces=false` mapping `num-workspaces=1` permanently to the origin index upon enable.
- Alt+Tab disabling of `switch-applications` key-bindings for a chronological history jump.
