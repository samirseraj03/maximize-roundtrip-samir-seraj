import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import { isInterestingWindow } from '../windows/windowState.js';

const WM_KEYBINDINGS_SCHEMA = 'org.gnome.desktop.wm.keybindings';
const SWITCH_APPS_KEY = 'switch-applications';
const SWITCH_APPS_BACK_KEY = 'switch-applications-backward';
const SWITCH_WINDOWS_KEY = 'switch-windows';
const SWITCH_WINDOWS_BACK_KEY = 'switch-windows-backward';

export class AltTabManager {
    constructor(settings, log) {
        this._settings = settings;
        this._log = log;

        this._wmKeybindingsSettings = null;
        this._origSwitchApps = null;
        this._origSwitchAppsBack = null;
        this._origSwitchWins = null;
        this._origSwitchWinsBack = null;
    }

    enable() {
        this._disableNativeAltTab();
        this._log('[kbd] Bindings nativos de Alt+Tab desactivados (WorkspaceSelector asume el control)');
    }

    disable() {
        this._restoreNativeAltTab();
        this._log('[kbd] Bindings nativos de Alt+Tab restaurados');
    }

    _disableNativeAltTab() {
        try {
            this._wmKeybindingsSettings = new Gio.Settings({
                schema_id: WM_KEYBINDINGS_SCHEMA,
            });

            this._origSwitchApps = this._wmKeybindingsSettings.get_strv(SWITCH_APPS_KEY);
            this._origSwitchAppsBack = this._wmKeybindingsSettings.get_strv(SWITCH_APPS_BACK_KEY);
            this._origSwitchWins = this._wmKeybindingsSettings.get_strv(SWITCH_WINDOWS_KEY);
            this._origSwitchWinsBack = this._wmKeybindingsSettings.get_strv(SWITCH_WINDOWS_BACK_KEY);

            this._wmKeybindingsSettings.set_strv(SWITCH_APPS_KEY, []);
            this._wmKeybindingsSettings.set_strv(SWITCH_APPS_BACK_KEY, []);
            this._wmKeybindingsSettings.set_strv(SWITCH_WINDOWS_KEY, []);
            this._wmKeybindingsSettings.set_strv(SWITCH_WINDOWS_BACK_KEY, []);
        } catch (e) {
            this._log(`[kbd] no se pudieron desactivar bindings nativos: ${e.message}`);
            this._wmKeybindingsSettings = null;
        }
    }

    _restoreNativeAltTab() {
        if (!this._wmKeybindingsSettings)
            return;

        try {
            if (this._origSwitchApps)
                this._wmKeybindingsSettings.set_strv(SWITCH_APPS_KEY, this._origSwitchApps);

            if (this._origSwitchAppsBack)
                this._wmKeybindingsSettings.set_strv(SWITCH_APPS_BACK_KEY, this._origSwitchAppsBack);

            if (this._origSwitchWins)
                this._wmKeybindingsSettings.set_strv(SWITCH_WINDOWS_KEY, this._origSwitchWins);

            if (this._origSwitchWinsBack)
                this._wmKeybindingsSettings.set_strv(SWITCH_WINDOWS_BACK_KEY, this._origSwitchWinsBack);
        } catch (_) { }

        this._wmKeybindingsSettings = null;
        this._origSwitchApps = null;
        this._origSwitchAppsBack = null;
        this._origSwitchWins = null;
        this._origSwitchWinsBack = null;
    }
}
