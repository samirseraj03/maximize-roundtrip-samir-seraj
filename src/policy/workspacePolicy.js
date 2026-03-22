import { FIXED_WORKSPACE_COUNT } from '../core/constants.js';

export class WorkspacePolicy {
    constructor(log, gnomeWorkspaceSettings, fixedWorkspaceCount = FIXED_WORKSPACE_COUNT) {
        this._log = log;
        this._gnome = gnomeWorkspaceSettings;
        this._fixedWorkspaceCount = fixedWorkspaceCount;
        this._tempWorkspaces = new Set();
    }

    ensureFixedWorkspaces() {
        this._gnome.ensureWorkspaceCount(this._fixedWorkspaceCount);
        this._pruneTempWorkspaces();
    }

    getFixedWorkspaceCount() {
        return this._fixedWorkspaceCount;
    }

    isFixedWorkspace(workspace) {
        if (!workspace)
            return false;

        const index = workspace.index();
        return index >= 0 && index < this._fixedWorkspaceCount;
    }

    isTempWorkspace(workspace) {
        if (!workspace)
            return false;

        this._pruneTempWorkspaces();
        return this._tempWorkspaces.has(workspace);
    }

    registerTempWorkspace(workspace) {
        if (!workspace || this.isFixedWorkspace(workspace))
            return;

        this._tempWorkspaces.add(workspace);
        this._log(`[policy] temp registrado ws:${workspace.index()}`);
    }

    unregisterTempWorkspace(workspace) {
        if (!workspace)
            return;

        this._tempWorkspaces.delete(workspace);
    }

    getPrimaryFixedWorkspace() {
        this.ensureFixedWorkspaces();
        return global.workspace_manager.get_workspace_by_index(0);
    }

    getDefaultOriginWorkspace() {
        return this.getPrimaryFixedWorkspace();
    }

    getFixedWorkspaceForNewWindows() {
        return this.getPrimaryFixedWorkspace();
    }

    allocateTempWorkspace(originWorkspace = null) {
        this.ensureFixedWorkspaces();

        const wm = global.workspace_manager;
        const ws = wm.append_new_workspace(false, global.get_current_time());

        this._gnome.setWorkspaceCount(wm.get_n_workspaces());

        const idx = ws.index();
        this._log(
            `[policy] temp CREADO ws:${idx} origin:${originWorkspace?.index?.() ?? 0}`
        );

        this._tempWorkspaces.add(ws);
        return ws;
    }

    syncConfiguredWorkspaceCount() {
        this._pruneTempWorkspaces();
        this._gnome.syncConfiguredCountToActual(this._fixedWorkspaceCount);
    }

    _pruneTempWorkspaces() {
        const wm = global.workspace_manager;
        const alive = new Set();

        for (let i = 0; i < wm.get_n_workspaces(); i++)
            alive.add(wm.get_workspace_by_index(i));

        for (const ws of [...this._tempWorkspaces]) {
            if (!alive.has(ws))
                this._tempWorkspaces.delete(ws);
        }
    }
}

export function createWorkspacePolicy(log, gnomeWorkspaceSettings) {
    return new WorkspacePolicy(log, gnomeWorkspaceSettings);
}
