import Meta from 'gi://Meta';

export const TRACKED_TYPES = new Set([
    Meta.WindowType.NORMAL,
    Meta.WindowType.DIALOG,
    Meta.WindowType.MODAL_DIALOG,
]);

export function getState(states, win) {
    if (!states.has(win)) {
        states.set(win, {
            timeoutId: 0,
            cleanupTimeoutId: 0,
            geometryTimeoutId: 0,

            lastRoundtrip: false,
            moved: false,
            inFlight: false,

            originWorkspace: null,
            originIndex: -1,
            originMonitorIndex: -1,
            originMonitorConnector: null,

            savedGeometry: null,
            lastNormalGeometry: null,
            tempWorkspace: null,

            pendingRestoreGeometry: null,
            pendingRestoreMonitor: -1,
            pendingExitRoundtrip: false,
        });
    }

    return states.get(win);
}

export function clearRoundtripState(state) {
    state.moved = false;
    state.inFlight = false;
    state.lastRoundtrip = false;

    state.originWorkspace = null;
    state.originIndex = -1;
    state.originMonitorIndex = -1;
    state.originMonitorConnector = null;

    state.savedGeometry = null;
    state.tempWorkspace = null;
}

export function isInterestingWindow(win) {
    try {
        if (!TRACKED_TYPES.has(win.get_window_type()))
            return false;

        if (win.is_on_all_workspaces())
            return false;

        return true;
    } catch (_) {
        return false;
    }
}

export function isRoundtripState(win) {
    try {
        return (win.maximized_horizontally && win.maximized_vertically) || win.fullscreen;
    } catch (_) {
        return false;
    }
}

export function rememberNormalGeometry(win, state) {
    try {
        if (!win || win.minimized)
            return;

        if (isRoundtripState(win))
            return;

        const frame = win.get_frame_rect();
        if (frame.width < 100 || frame.height < 100)
            return;

        state.lastNormalGeometry = {
            x: frame.x,
            y: frame.y,
            width: frame.width,
            height: frame.height,
        };
    } catch (_) { }
}
