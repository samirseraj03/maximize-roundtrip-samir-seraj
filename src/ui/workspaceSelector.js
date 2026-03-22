import GLib from 'gi://GLib';
import Clutter from 'gi://Clutter';
import St from 'gi://St';
import Shell from 'gi://Shell';
import Meta from 'gi://Meta';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import { SELECTOR_SHOW_DELAY_MS } from '../core/constants.js';
import { isInterestingWindow } from '../windows/windowState.js';

export class WorkspaceSelector {
    constructor(settings, log) {
        this._settings = settings;
        this._log = log;

        this._workspaceSwitchedId = 0;
        this._showTimeoutId = 0;
        this._modPollId = 0;
        this._capturedEventId = 0;

        this._active = false;
        this._selectedIndex = 0;
        this._mruIndex = 0;
        this._mruWorkspaces = [];

        this._overlay = null;
        this._panel = null;
        this._title = null;
        this._row = null;
        this._hint = null;
    }

    enable() {
        this._workspaceSwitchedId = global.workspace_manager.connect(
            'workspace-switched',
            () => this._onWorkspaceSwitched()
        );
        this._onWorkspaceSwitched();

        Main.wm.addKeybinding(
            'next-window',
            this._settings,
            Meta.KeyBindingFlags.IGNORE_AUTOREPEAT,
            Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW,
            () => this._trigger(false)
        );

        Main.wm.addKeybinding(
            'prev-window',
            this._settings,
            Meta.KeyBindingFlags.IGNORE_AUTOREPEAT,
            Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW,
            () => this._trigger(true)
        );

        this._capturedEventId = global.stage.connect(
            'captured-event',
            (_actor, event) => this._onCapturedEvent(event)
        );

        this._log('[kbd] WorkspaceSelector híbrido (no-modal) activado');
    }

    disable() {
        if (this._capturedEventId) {
            try { global.stage.disconnect(this._capturedEventId); } catch (_) { }
            this._capturedEventId = 0;
        }

        if (this._workspaceSwitchedId) {
            try { global.workspace_manager.disconnect(this._workspaceSwitchedId); } catch (_) { }
            this._workspaceSwitchedId = 0;
        }

        try { Main.wm.removeKeybinding('next-window'); } catch (_) { }
        try { Main.wm.removeKeybinding('prev-window'); } catch (_) { }

        this._finish();
        this._log('[kbd] WorkspaceSelector desactivado');
    }

    _onWorkspaceSwitched() {
        const activeIdx = this._getActiveWorkspaceIndex();
        this._mruWorkspaces = [
            activeIdx,
            ...this._mruWorkspaces.filter(idx => idx !== activeIdx)
        ];
    }

    _getMruList() {
        const count = this._getWorkspaceCount();
        const validMru = this._mruWorkspaces.filter(idx => idx < count);
        
        for (let i = 0; i < count; i++) {
            if (!validMru.includes(i)) validMru.push(i);
        }
        
        return validMru;
    }

    _trigger(backward) {
        this._altHeld = true;
        this._cancelQueuedShow();

        if (this._active) {
            if (backward) this._selectPrevMru();
            else this._selectNextMru();
            return;
        }

        const [, , mods] = global.get_pointer();
        const mod1 = Clutter.ModifierType.MOD1_MASK;
        const superMod = Clutter.ModifierType.SUPER_MASK;
        const altHeld = ((mods & mod1) !== 0) || ((mods & superMod) !== 0);

        const mru = this._getMruList();
        if (mru.length === 0) return;

        this._mruIndex = backward ? mru.length - 1 : (mru.length > 1 ? 1 : 0);
        this._selectedIndex = mru[this._mruIndex];

        if (!altHeld) {
            this._commit();
            return;
        }

        this._active = true;
        this._startUi(true); // Con fade (fade delay)
    }

    _queueShow() {
        this._cancelQueuedShow();
        this._showPreTimeoutId = GLib.timeout_add(
            GLib.PRIORITY_DEFAULT,
            150, // Solo mantener Alt pulsado 150ms hace que el UI nazca
            () => {
                this._showPreTimeoutId = 0;
                if (this._altHeld) this._show();
                return GLib.SOURCE_REMOVE;
            }
        );
    }

    _cancelQueuedShow() {
        if (this._showPreTimeoutId) {
            GLib.Source.remove(this._showPreTimeoutId);
            this._showPreTimeoutId = 0;
        }
    }

    _show() {
        if (this._active) return;
        this._active = true;
        
        this._mruIndex = 0;
        this._selectedIndex = this._getActiveWorkspaceIndex();
        
        this._startUi(false); // Ya esperamos, se muestra instantáneo
    }

    _startUi(fade) {
        this._buildUi();
        this._render();

        const mod1 = Clutter.ModifierType.MOD1_MASK;
        const superMod = Clutter.ModifierType.SUPER_MASK;
        this._modPollId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 50, () => {
            if (!this._active) return GLib.SOURCE_REMOVE;
            const [, , cMods] = global.get_pointer();
            if (((cMods & mod1) === 0) && ((cMods & superMod) === 0)) {
                this._commit();
                return GLib.SOURCE_REMOVE;
            }
            return GLib.SOURCE_CONTINUE;
        });

        if (fade) {
            this._overlay.opacity = 0;
            this._showTimeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, SELECTOR_SHOW_DELAY_MS, () => {
                this._showTimeoutId = 0;
                if (this._overlay) this._overlay.opacity = 255;
                return GLib.SOURCE_REMOVE;
            });
        } else {
            this._overlay.opacity = 255;
        }
    }

    _onCapturedEvent(event) {
        const type = event.type();
        if (type === Clutter.EventType.KEY_PRESS) {
            return this._onKeyPress(event);
        } else if (type === Clutter.EventType.KEY_RELEASE) {
            return this._onKeyRelease(event);
        }
        
        if (!this._active) return Clutter.EVENT_PROPAGATE;
        return Clutter.EVENT_PROPAGATE;
    }

    _onKeyPress(event) {
        const symbol = event.get_key_symbol();
        
        const isAlt = symbol === Clutter.KEY_Alt_L || symbol === Clutter.KEY_Alt_R || symbol === Clutter.KEY_Meta_L || symbol === Clutter.KEY_Super_L;
        if (isAlt) {
            if (!this._altHeld) {
                this._altHeld = true;
                this._mruIndex = 0;
                this._queueShow();
            }
            // Importante dejar pasar el Alt a Wayland para que combos funcionen
            return Clutter.EVENT_PROPAGATE;
        }

        if (!this._active) return Clutter.EVENT_PROPAGATE;

        const mods = event.get_state();
        const isTab = symbol === Clutter.KEY_Tab || symbol === Clutter.KEY_ISO_Left_Tab;
        if (isTab) {
            const shiftHeld = (mods & Clutter.ModifierType.SHIFT_MASK) !== 0;
            if (shiftHeld) this._selectPrevMru();
            else this._selectNextMru();
            return Clutter.EVENT_STOP;
        }

        if (symbol === Clutter.KEY_Escape) {
            this._finish();
            return Clutter.EVENT_STOP;
        }

        if (symbol === Clutter.KEY_Return || symbol === Clutter.KEY_KP_Enter || symbol === Clutter.KEY_space) {
            this._commit();
            return Clutter.EVENT_STOP;
        }

        if (symbol === Clutter.KEY_Right || symbol === Clutter.KEY_Down) {
            this._selectNext();
            return Clutter.EVENT_STOP;
        }

        if (symbol === Clutter.KEY_Left || symbol === Clutter.KEY_Up) {
            this._selectPrev();
            return Clutter.EVENT_STOP;
        }

        return Clutter.EVENT_STOP;
    }

    _onKeyRelease(event) {
        const symbol = event.get_key_symbol();
        const isAlt = symbol === Clutter.KEY_Alt_L || symbol === Clutter.KEY_Alt_R || symbol === Clutter.KEY_Meta_L || symbol === Clutter.KEY_Super_L;
        
        if (isAlt) {
            this._altHeld = false;
            this._cancelQueuedShow();
        }

        if (!this._active) return Clutter.EVENT_PROPAGATE;

        if (symbol === Clutter.KEY_Tab || symbol === Clutter.KEY_ISO_Left_Tab ||
            symbol === Clutter.KEY_Left || symbol === Clutter.KEY_Right ||
            symbol === Clutter.KEY_Up || symbol === Clutter.KEY_Down ||
            symbol === Clutter.KEY_Shift_L || symbol === Clutter.KEY_Shift_R ||
            symbol === Clutter.KEY_Escape || symbol === Clutter.KEY_Return || 
            symbol === Clutter.KEY_KP_Enter || symbol === Clutter.KEY_space) {
            return Clutter.EVENT_STOP; 
        }
        
        this._commit();
        return Clutter.EVENT_STOP;
    }

    _buildUi() {
        this._overlay = new St.Widget({
            x_expand: true,
            y_expand: true,
            reactive: true, 
            layout_manager: new Clutter.BinLayout(),
        });

        this._overlay.connect('button-press-event', () => {
            this._commit();
            return Clutter.EVENT_STOP;
        });

        this._panel = new St.BoxLayout({
            vertical: true,
            reactive: true,
            style: `
                padding: 18px 22px;
                border-radius: 16px;
                background-color: rgba(24, 24, 28, 0.92);
                spacing: 12px;
                min-width: 320px;
            `,
        });

        this._panel.set_x_align(Clutter.ActorAlign.CENTER);
        this._panel.set_y_align(Clutter.ActorAlign.CENTER);

        this._title = new St.Label({
            text: 'Workspace',
            style: 'font-size: 16px; font-weight: bold; color: white;',
        });

        this._row = new St.BoxLayout({
            vertical: false,
            reactive: false,
            style: 'spacing: 10px;',
        });

        this._hint = new St.Label({
            text: 'Tab intercala · Suelta Alt para saltar',
            style: 'font-size: 12px; color: rgba(255,255,255,0.78);',
        });

        this._panel.add_child(this._title);
        this._panel.add_child(this._row);
        this._panel.add_child(this._hint);
        this._overlay.add_child(this._panel);

        Main.uiGroup.add_child(this._overlay);
        global.stage.set_key_focus(this._overlay);
    }

    _render() {
        if (!this._row) return;

        for (const child of this._row.get_children())
            child.destroy();

        const count = this._getWorkspaceCount();
        for (let i = 0; i < count; i++) {
            const ws = global.workspace_manager.get_workspace_by_index(i);
            const selected = i === this._selectedIndex;

            const wsBox = new St.BoxLayout({
                vertical: true,
                style: selected
                    ? 'padding: 12px; border-radius: 12px; background-color: rgba(255,255,255,0.15); border: 2px solid #4a90e2;'
                    : 'padding: 12px; border-radius: 12px; background-color: rgba(255,255,255,0.05); border: 2px solid transparent;',
                x_align: Clutter.ActorAlign.CENTER,
            });

            const numberLabel = new St.Label({
                text: `Workspace ${i + 1}`,
                style: selected ? 'font-weight: bold; color: white;' : 'color: rgba(255,255,255,0.7);',
                x_align: Clutter.ActorAlign.CENTER,
            });

            const iconsRow = new St.BoxLayout({
                vertical: false,
                style: 'spacing: 8px; margin-top: 8px;',
                x_align: Clutter.ActorAlign.CENTER,
            });

            if (ws) {
                const windows = ws.list_windows().filter(w => isInterestingWindow(w) && !w.is_on_all_workspaces());
                if (windows.length === 0) {
                    const emptyLabel = new St.Label({ text: 'Vacío', style: 'color: rgba(255,255,255,0.3); font-size: 11px;' });
                    iconsRow.add_child(emptyLabel);
                } else {
                    const tracker = Shell.WindowTracker.get_default();
                    for (const win of windows) {
                        try {
                            const app = tracker.get_window_app(win);
                            const icon = app ? app.create_icon_texture(24) : new St.Icon({ icon_name: 'application-x-executable', icon_size: 24 });
                            iconsRow.add_child(icon);
                        } catch (e) { }
                    }
                }
            }

            wsBox.add_child(numberLabel);
            wsBox.add_child(iconsRow);
            this._row.add_child(wsBox);
        }

        this._title.text = `Workspace Activo: ${this._selectedIndex + 1}`;
    }

    _selectNextMru() {
        const mru = this._getMruList();
        if (mru.length === 0) return;

        this._mruIndex = (this._mruIndex + 1) % mru.length;
        this._selectedIndex = mru[this._mruIndex];
        this._render();
    }

    _selectPrevMru() {
        const mru = this._getMruList();
        if (mru.length === 0) return;

        this._mruIndex = (this._mruIndex - 1 + mru.length) % mru.length;
        this._selectedIndex = mru[this._mruIndex];
        this._render();
    }

    _selectNext() {
        const count = this._getWorkspaceCount();
        if (count > 0) {
            this._selectedIndex = (this._selectedIndex + 1) % count;
            this._render();
        }
    }

    _selectPrev() {
        const count = this._getWorkspaceCount();
        if (count > 0) {
            this._selectedIndex = (this._selectedIndex - 1 + count) % count;
            this._render();
        }
    }

    _commit() {
        const ws = global.workspace_manager.get_workspace_by_index(this._selectedIndex);
        if (ws) {
            ws.activate(global.get_current_time());
            this._log(`[kbd] selector Alt → ws:${ws.index()}`);
        }
        this._finish();
    }

    _finish() {
        if (!this._active) return;
        this._active = false;
        this._altHeld = false;

        this._cancelQueuedShow();

        if (this._showTimeoutId) {
            GLib.Source.remove(this._showTimeoutId);
            this._showTimeoutId = 0;
        }

        if (this._modPollId) {
            GLib.Source.remove(this._modPollId);
            this._modPollId = 0;
        }

        if (this._overlay) {
            try { this._overlay.destroy(); } catch (_) { }
            this._overlay = null;
        }

        this._panel = null;
        this._title = null;
        this._row = null;
        this._hint = null;
    }

    _getWorkspaceCount() {
        return global.workspace_manager.get_n_workspaces();
    }

    _getActiveWorkspaceIndex() {
        const ws = global.workspace_manager.get_active_workspace();
        return ws ? ws.index() : 0;
    }
}
