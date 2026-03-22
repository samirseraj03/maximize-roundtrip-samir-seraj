import GLib from 'gi://GLib';
import Meta from 'gi://Meta';

import { DEBOUNCE_MS } from '../core/constants.js';

import {
    getState,
    isInterestingWindow,
    isRoundtripState,
    rememberNormalGeometry,
} from './windowState.js';

import {
    sendToTempWorkspace,
    restoreToOrigin,
    restoreToOriginMinimized,
    schedulePendingGeometryRestore,
    cleanupAfterRestore,
} from '../workspace/workspaceManager.js';

export function trackWindow(win, windowSignals, states, policy, log) {
    if (!win) return;
    if (windowSignals.has(win)) return;
    if (!isInterestingWindow(win)) return;

    const ids = [];
    ids.push(win.connect('notify::maximized-horizontally', () => queueEvaluate(win, states, windowSignals, policy, log)));
    ids.push(win.connect('notify::maximized-vertically', () => queueEvaluate(win, states, windowSignals, policy, log)));
    ids.push(win.connect('notify::fullscreen', () => queueEvaluate(win, states, windowSignals, policy, log)));
    ids.push(win.connect('notify::minimized', () => onMinimizedChanged(win, states, windowSignals, policy, log)));
    ids.push(win.connect('workspace-changed', () => onWorkspaceChanged(win, states, log)));
    ids.push(win.connect('size-changed', () => onGeometryChanged(win, states)));
    ids.push(win.connect('position-changed', () => onGeometryChanged(win, states)));
    ids.push(win.connect('unmanaged', () => onUnmanaged(win, windowSignals, states, policy, log)));

    windowSignals.set(win, ids);

    const state = getState(states, win);
    rememberNormalGeometry(win, state);
    state.lastRoundtrip = isRoundtripState(win);
}

export function disconnectWindow(win, windowSignals, states) {
    const ids = windowSignals.get(win) ?? [];
    for (const id of ids) {
        try {
            win.disconnect(id);
        } catch (_) { }
    }

    windowSignals.delete(win);

    const state = states.get(win);
    if (state) {
        if (state.timeoutId)
            GLib.Source.remove(state.timeoutId);

        if (state.geometryTimeoutId)
            GLib.Source.remove(state.geometryTimeoutId);
    }

    states.delete(win);
}

function onGeometryChanged(win, states) {
    const state = getState(states, win);
    rememberNormalGeometry(win, state);
}

function queueEvaluate(win, states, windowSignals, policy, log) {
    const state = getState(states, win);

    if (state.timeoutId)
        GLib.Source.remove(state.timeoutId);

    state.timeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, DEBOUNCE_MS, () => {
        state.timeoutId = 0;
        evaluateWindow(win, states, windowSignals, policy, log);
        return GLib.SOURCE_REMOVE;
    });
}

function evaluateWindow(win, states, windowSignals, policy, log) {
    if (!windowSignals.has(win))
        return;

    const state = getState(states, win);
    const nowRoundtrip = isRoundtripState(win);
    const wasRoundtrip = state.lastRoundtrip;

    if (!nowRoundtrip)
        rememberNormalGeometry(win, state);

    state.lastRoundtrip = nowRoundtrip;

    try {
        if (win.minimized) {
            log(`[sig] "${win.get_title()}" minimizada: ignorando cambio maximized/fullscreen`);
            return;
        }
    } catch (_) { }

    if (nowRoundtrip && !wasRoundtrip) {
        sendToTempWorkspace(win, state, policy, log);
        return;
    }

    if (!nowRoundtrip && wasRoundtrip) {
        restoreToOrigin(win, state, policy, false, log);
    }
}

function onMinimizedChanged(win, states, windowSignals, policy, log) {
    const state = getState(states, win);

    let minimized = false;
    try {
        minimized = win.minimized;
    } catch (_) {
        return;
    }

    if (minimized) {
        if (!state.moved) {
            log(`[sig] "${win.get_title()}" minimizada sin roundtrip`);
            return;
        }

        log(`[sig] "${win.get_title()}" minimizada con roundtrip → fijo/origen sin desminimizar`);
        restoreToOriginMinimized(win, state, policy, log);
        state.lastRoundtrip = false;
        return;
    }

    if (!state.pendingExitRoundtrip && !state.pendingRestoreGeometry) {
        rememberNormalGeometry(win, state);
        return;
    }

    log(`[sig] "${win.get_title()}" desminimizada → aplicar salida de roundtrip`);

    try {
        if (state.pendingExitRoundtrip) {
            if (win.fullscreen)
                win.unmake_fullscreen();

            if (win.maximized_horizontally || win.maximized_vertically)
                win.unmaximize(Meta.MaximizeFlags.BOTH);

            state.pendingExitRoundtrip = false;
        }
    } catch (_) { }

    schedulePendingGeometryRestore(win, state, log);
}

function onWorkspaceChanged(win, states, log) {
    const state = states.get(win);
    if (!state)
        return;

    rememberNormalGeometry(win, state);

    if (!state.moved || state.inFlight)
        return;

    const currentWorkspace = win.get_workspace();
    if (!currentWorkspace)
        return;

    if (state.tempWorkspace &&
        currentWorkspace !== state.tempWorkspace &&
        !isRoundtripState(win)) {
        log(`[sig] "${win.get_title()}" movida manualmente → cancelando roundtrip`);
        cleanupAfterRestore(state, {
            isTempWorkspace: ws => ws === state.tempWorkspace,
            unregisterTempWorkspace: () => { },
            getFixedWorkspaceCount: () => 1,
            isFixedWorkspace: () => false,
            syncConfiguredWorkspaceCount: () => { },
        }, log);
    }
}

function onUnmanaged(win, windowSignals, states, policy, log) {
    const state = states.get(win);

    if (state?.moved) {
        log(`[sig] "${win.get_title()}" cerrada con roundtrip activo → volver al origen`);
        restoreToOrigin(win, state, policy, true, log);
    }

    disconnectWindow(win, windowSignals, states);
}
