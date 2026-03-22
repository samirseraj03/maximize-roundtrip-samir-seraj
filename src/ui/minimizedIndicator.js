import GLib from 'gi://GLib';
import Clutter from 'gi://Clutter';
import St from 'gi://St';
import Shell from 'gi://Shell';
import Meta from 'gi://Meta';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { isInterestingWindow } from '../windows/windowState.js';

export class MinimizedIndicator {
    constructor(settings, log) {
        this._settings = settings;
        this._log = log;

        this._enabled = false;
        this._signals = [];
        this._windowSignals = new Map();
        this._icons = new Map(); // win -> St.Button

        this._container = null;
        this._box = null;
    }

    enable() {
        if (this._enabled) return;
        this._enabled = true;

        this._buildUi();
        this._connectSignals();
        this._syncVisibility();
        this._syncWindows();

        this._log('[ui] Indicador de minimizados activado');
    }

    disable() {
        if (!this._enabled) return;
        this._enabled = false;

        this._disconnectSignals();
        for (const win of this._windowSignals.keys()) {
            this._untrackWindow(win);
        }

        if (this._container) {
            try { this._container.destroy(); } catch (_) { }
            this._container = null;
            this._box = null;
        }

        this._icons.clear();
        this._log('[ui] Indicador de minimizados desactivado');
    }

    _buildUi() {
        this._container = new St.Widget({
            x_expand: false,
            y_expand: true,
            reactive: false,
            layout_manager: new Clutter.BinLayout(),
            x_align: Clutter.ActorAlign.START,
            y_align: Clutter.ActorAlign.CENTER,
            style: 'margin-left: 8px;'
        });

        this._container.add_constraint(new Clutter.BindConstraint({
            source: global.stage,
            coordinate: Clutter.BindCoordinate.HEIGHT,
            offset: 0
        }));
        
        this._container.add_constraint(new Clutter.BindConstraint({
            source: global.stage,
            coordinate: Clutter.BindCoordinate.Y,
            offset: 0
        }));

        this._box = new St.BoxLayout({
            vertical: true,
            reactive: true,
            style: `
                padding: 10px;
                border-radius: 12px;
                background-color: rgba(24, 24, 28, 0.7);
                spacing: 8px;
            `
        });

        this._container.add_child(this._box);
        Main.uiGroup.add_child(this._container);
    }

    _connectSignals() {
        this._signals.push(
            this._settings.connect('changed::show-minimized-indicators', () => this._syncVisibility())
        );

        this._signals.push(
            global.workspace_manager.connect('workspace-switched', () => this._syncVisibility())
        );

        this._signals.push(
            global.display.connect('window-created', (_display, win) => this._trackWindow(win))
        );
    }

    _disconnectSignals() {
        for (const id of this._signals) {
            try { global.workspace_manager.disconnect(id); } catch (_) { }
            try { global.display.disconnect(id); } catch (_) { }
            try { this._settings.disconnect(id); } catch (_) { }
        }
        this._signals = [];
    }

    _syncVisibility() {
        if (!this._container) return;

        let showSetting = true;
        try {
            showSetting = this._settings.get_boolean('show-minimized-indicators');
        } catch (e) {
            this._log('[ui] Warning: schema no recargado por GNOME, asumiendo show=true. Reinicia sesión.');
        }

        const activeWs = global.workspace_manager.get_active_workspace_index();
        const shouldShow = showSetting && activeWs === 0 && this._icons.size > 0;

        if (shouldShow) {
            this._container.show();
        } else {
            this._container.hide();
        }
    }

    _syncWindows() {
        const windows = global.get_window_actors().map(a => a.get_meta_window());
        for (const win of windows) {
            this._trackWindow(win);
        }
    }

    _trackWindow(win) {
        if (!win || this._windowSignals.has(win) || !isInterestingWindow(win))
            return;

        const ids = [];
        ids.push(win.connect('notify::minimized', () => this._onWindowStateChanged(win)));
        ids.push(win.connect('unmanaged', () => this._untrackWindow(win)));

        this._windowSignals.set(win, ids);
        this._onWindowStateChanged(win);
    }

    _untrackWindow(win) {
        const ids = this._windowSignals.get(win) || [];
        for (const id of ids) {
            try { win.disconnect(id); } catch (_) { }
        }
        this._windowSignals.delete(win);
        this._removeIcon(win);
    }

    _onWindowStateChanged(win) {
        let minimized = false;
        try {
            minimized = win.minimized;
        } catch (_) { return; }

        if (minimized) {
            this._addIcon(win);
        } else {
            this._removeIcon(win);
        }
    }

    _addIcon(win) {
        if (this._icons.has(win) || !this._box) return;

        const tracker = Shell.WindowTracker.get_default();
        const app = tracker.get_window_app(win);
        let iconNode = null;

        if (app) {
            iconNode = app.create_icon_texture(32);
        } else {
            iconNode = new St.Icon({
                icon_name: 'application-x-executable',
                icon_size: 32
            });
        }

        const button = new St.Button({
            child: iconNode,
            reactive: true,
            can_focus: true,
            style: `
                border-radius: 8px;
                padding: 4px;
            `
        });

        button.connect('clicked', () => {
            try {
                win.unminimize();
                win.activate(global.get_current_time());
            } catch (_) {}
        });

        // Hover effect pseudo-class
        button.connect('notify::hover', () => {
            if (button.hover) {
                button.set_style('border-radius: 8px; padding: 4px; background-color: rgba(255,255,255,0.15);');
            } else {
                button.set_style('border-radius: 8px; padding: 4px;');
            }
        });

        this._icons.set(win, button);
        this._box.add_child(button);
        this._syncVisibility();
    }

    _removeIcon(win) {
        const button = this._icons.get(win);
        if (button) {
            try { button.destroy(); } catch (_) { }
            this._icons.delete(win);
        }
        this._syncVisibility();
    }
}
