import GLib from 'gi://GLib';

export function moveWindowToWorkspace(win, workspace, monitorIndex) {
    win.change_workspace(workspace);

    if (monitorIndex >= 0 && monitorIndex < global.display.get_n_monitors()) {
        if (win.get_monitor() !== monitorIndex)
            win.move_to_monitor(monitorIndex);
    }
}

export function activateWorkspace(workspace, log, reason) {
    try {
        workspace.activate(global.get_current_time());
        log(`[ext] activate ws:${workspace.index()} reason:${reason}`);
    } catch (e) {
        const message = e?.stack ?? e?.message ?? String(e);
        console.error(`maximize-roundtrip [activate workspace ${reason}]: ${message}`);
    }
}

export function focusWindowSoon(win, log, reason) {
    GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
        try {
            if (!win.minimized) {
                win.activate(global.get_current_time());
                log(`[ext] focus "${win.get_title()}" reason:${reason}`);
            }
        } catch (e) {
            const message = e?.stack ?? e?.message ?? String(e);
            console.error(`maximize-roundtrip [focus ${reason}]: ${message}`);
        }

        return GLib.SOURCE_REMOVE;
    });
}
