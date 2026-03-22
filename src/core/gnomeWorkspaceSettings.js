import Gio from 'gi://Gio';

const MUTTER_SCHEMA = 'org.gnome.mutter';
const WM_PREFS_SCHEMA = 'org.gnome.desktop.wm.preferences';

const DYNAMIC_WORKSPACES_KEY = 'dynamic-workspaces';
const NUM_WORKSPACES_KEY = 'num-workspaces';

/**
 * Manages the underlying Mutter and GNOME Workspace configurations.
 * This class forcefully injects rules to disable dynamic workspaces, enforcing a strict static origin.
 */
export class GnomeWorkspaceSettings {
    constructor(log, fixedWorkspaceCount = 1) {
        this._log = log;
        this._fixedWorkspaceCount = fixedWorkspaceCount;

        this._mutter = new Gio.Settings({ schema_id: MUTTER_SCHEMA });
        this._wmPrefs = new Gio.Settings({ schema_id: WM_PREFS_SCHEMA });

        this._origDynamic = null;
        this._origNum = null;
    }

    /**
     * Seizes control over GNOME's DConf registry to apply extension requirements.
     * Sets `dynamic-workspaces` to false and locks `num-workspaces` to the predefined count.
     */
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

    /**
     * Queries the active DConf keys for the currently allocated number of static workspaces.
     * Falls back to the live Session manager if the schema is unavailable.
     * @returns {number} The current static workspace count.
     */
    getWorkspaceCount() {
        try {
            return this._wmPrefs.get_int(NUM_WORKSPACES_KEY);
        } catch (_) {
            return global.workspace_manager.get_n_workspaces();
        }
    }

    /**
     * Imperatively changes the number of static workspaces authorized by GNOME Shell.
     * Will never shrink the dimension array below the fixed root minimum (usually 1).
     * @param {number} count - The desired number of active workspaces.
     */
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

    /**
     * Condition-based workspace creation. Only invokes an upward geometry change if the
     * desired count is higher than the currently active sum.
     * @param {number} count - The minimum number of workspaces the system must possess.
     */
    ensureWorkspaceCount(count) {
        const current = this.getWorkspaceCount();
        if (current < count)
            this.setWorkspaceCount(count);
    }

    /**
     * Synchronizes the DConf key settings array to perfectly match the current physical
     * live instances running within the global workspace manager.
     * @param {number} minimum - The fallback minimum index allowed.
     */
    syncConfiguredCountToActual(minimum = this._fixedWorkspaceCount) {
        const actual = global.workspace_manager.get_n_workspaces();
        this.setWorkspaceCount(Math.max(minimum, actual));
    }

    /**
     * Unbinds the extension and heals the environment. Reverts the `dynamic-workspaces` and
     * `num-workspaces` configurations back to the initial profile recorded before the extension launched.
     */
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
