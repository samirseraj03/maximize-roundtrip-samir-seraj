import Gio from 'gi://Gio';

const MUTTER_SCHEMA = 'org.gnome.mutter';
const WM_PREFS_SCHEMA = 'org.gnome.desktop.wm.preferences';

const DYNAMIC_WORKSPACES_KEY = 'dynamic-workspaces';
const NUM_WORKSPACES_KEY = 'num-workspaces';

export class GnomeWorkspaceSettings {
    constructor(log, fixedWorkspaceCount = 1) {
        this._log = log;
        this._fixedWorkspaceCount = fixedWorkspaceCount;

        this._mutter = new Gio.Settings({ schema_id: MUTTER_SCHEMA });
        this._wmPrefs = new Gio.Settings({ schema_id: WM_PREFS_SCHEMA });

        this._origDynamic = null;
        this._origNum = null;
    }

    enableStaticBase() {
        try {
            this._origDynamic = this._mutter.get_boolean(DYNAMIC_WORKSPACES_KEY);
            this._origNum = this._wmPrefs.get_int(NUM_WORKSPACES_KEY);

            this._mutter.set_boolean(DYNAMIC_WORKSPACES_KEY, false);
            this.setWorkspaceCount(this._fixedWorkspaceCount);

            this._log(`[gnome] dynamic-workspaces=false, num-workspaces=${this._fixedWorkspaceCount}`);
        } catch (e) {
            const message = e?.stack ?? e?.message ?? String(e);
            console.error(`maximize-roundtrip [enableStaticBase]: ${message}`);
        }
    }

    getWorkspaceCount() {
        try {
            return this._wmPrefs.get_int(NUM_WORKSPACES_KEY);
        } catch (_) {
            return global.workspace_manager.get_n_workspaces();
        }
    }

    setWorkspaceCount(count) {
        const safeCount = Math.max(this._fixedWorkspaceCount, count);

        try {
            this._wmPrefs.set_int(NUM_WORKSPACES_KEY, safeCount);
            this._log(`[gnome] num-workspaces=${safeCount}`);
        } catch (e) {
            const message = e?.stack ?? e?.message ?? String(e);
            console.error(`maximize-roundtrip [setWorkspaceCount]: ${message}`);
        }
    }

    ensureWorkspaceCount(count) {
        const current = this.getWorkspaceCount();
        if (current < count)
            this.setWorkspaceCount(count);
    }

    syncConfiguredCountToActual(minimum = this._fixedWorkspaceCount) {
        const actual = global.workspace_manager.get_n_workspaces();
        this.setWorkspaceCount(Math.max(minimum, actual));
    }

    restore() {
        try {
            if (this._origDynamic !== null)
                this._mutter.set_boolean(DYNAMIC_WORKSPACES_KEY, this._origDynamic);

            if (this._origNum !== null)
                this._wmPrefs.set_int(NUM_WORKSPACES_KEY, this._origNum);

            this._log('[gnome] workspace settings restaurados');
        } catch (e) {
            const message = e?.stack ?? e?.message ?? String(e);
            console.error(`maximize-roundtrip [restore workspace settings]: ${message}`);
        }

        this._origDynamic = null;
        this._origNum = null;
    }
}
