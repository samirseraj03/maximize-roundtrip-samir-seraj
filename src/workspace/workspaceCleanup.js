import { isInterestingWindow } from '../windows/windowState.js';

export function cleanupWorkspace(policy, workspace, log) {
    if (!workspace)
        return;

    if (!policy.isTempWorkspace(workspace))
        return;

    if (!_workspaceExists(workspace)) {
        policy.unregisterTempWorkspace(workspace);
        policy.syncConfiguredWorkspaceCount();
        return;
    }

    const index = workspace.index();

    const remaining = workspace.list_windows().filter(win => {
        if (!isInterestingWindow(win))
            return false;

        if (win.is_on_all_workspaces())
            return false;

        return true;
    });

    if (remaining.length > 0) {
        log(`[ws] temp ws:${index} tiene ${remaining.length} ventana(s), no se borra`);
        return;
    }

    if (global.workspace_manager.get_n_workspaces() <= policy.getFixedWorkspaceCount()) {
        log('[ws] no se borra temp: solo quedan workspaces fijos');
        return;
    }

    try {
        global.workspace_manager.remove_workspace(workspace, global.get_current_time());
        policy.unregisterTempWorkspace(workspace);
        policy.syncConfiguredWorkspaceCount();
        log(`[ws] temp eliminado ws:${index}`);
    } catch (e) {
        const message = e?.stack ?? e?.message ?? String(e);
        console.error(`maximize-roundtrip [cleanup]: ${message}`);
    }
}

function _workspaceExists(workspace) {
    const wm = global.workspace_manager;

    for (let i = 0; i < wm.get_n_workspaces(); i++) {
        if (wm.get_workspace_by_index(i) === workspace)
            return true;
    }

    return false;
}
