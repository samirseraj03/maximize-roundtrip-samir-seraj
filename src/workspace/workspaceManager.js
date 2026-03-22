import GLib from 'gi://GLib';
import Meta from 'gi://Meta';

import {
    CLEANUP_DELAY_MS,
    REDIRECT_DELAY_MS,
} from '../core/constants.js';

import {
    getState,
    clearRoundtripState,
    isInterestingWindow,
    isRoundtripState,
} from '../windows/windowState.js';

import {
    computeSavedGeometry,
    scheduleSavedGeometryRestore,
    schedulePendingGeometryRestore,
} from '../windows/windowGeometry.js';

import {
    getConnectorForMonitor,
    resolveMonitorByConnector,
} from '../monitors/monitorManager.js';

import {
    moveWindowToWorkspace,
    activateWorkspace,
    focusWindowSoon,
} from './workspaceNavigation.js';

import { cleanupWorkspace } from './workspaceCleanup.js';

export function sendToTempWorkspace(win, state, policy, log, options = {}) {
    const { follow = true, focus = true } = options;

    if (state.moved || state.inFlight) {
        log(`[ws] ida ignorada "${win.get_title()}" (moved=${state.moved}, inFlight=${state.inFlight})`);
        return;
    }

    policy.ensureFixedWorkspaces();

    const currentWorkspace = win.get_workspace();
    if (!currentWorkspace)
        return;

    const originWorkspace = policy.isFixedWorkspace(currentWorkspace)
        ? currentWorkspace
        : policy.getDefaultOriginWorkspace();

    const originIndex = originWorkspace.index();
    const monitorIndex = win.get_monitor();
    const monitorConnector = getConnectorForMonitor(monitorIndex);

    state.inFlight = true;
    state.originWorkspace = originWorkspace;
    state.originIndex = originIndex;
    state.originMonitorIndex = monitorIndex;
    state.originMonitorConnector = monitorConnector;
    state.savedGeometry = computeSavedGeometry(win, state, monitorIndex);

    try {
        const tempWorkspace = policy.allocateTempWorkspace(originWorkspace);
        const tempIndex = tempWorkspace.index();

        log(`[ws] ida "${win.get_title()}" ws:${originIndex} → temp ws:${tempIndex}`);

        state.tempWorkspace = tempWorkspace;
        state.moved = true;

        moveWindowToWorkspace(win, tempWorkspace, monitorIndex);
        log(`[ws] move confirm "${win.get_title()}" → ws:${tempIndex}`);

        if (follow)
            activateWorkspace(tempWorkspace, log, 'ida');

        if (focus && !win.minimized)
            focusWindowSoon(win, log, 'ida');
    } catch (e) {
        const message = e?.stack ?? e?.message ?? String(e);
        console.error(`maximize-roundtrip [ida]: ${message}`);
        clearRoundtripState(state);
    } finally {
        state.inFlight = false;
    }
}

export function restoreToOrigin(win, state, policy, fromClose, log) {
    if (!state.moved || state.inFlight)
        return;

    policy.ensureFixedWorkspaces();

    const originWorkspace = _resolveOriginWorkspace(state, policy);
    if (!originWorkspace) {
        log('[ws] vuelta: no existe origen fijo, limpiando');
        cleanupAfterRestore(state, policy, log);
        return;
    }

    const resolvedMonitor = resolveMonitorByConnector(
        state.originMonitorConnector,
        state.originMonitorIndex,
        log
    );

    log(`[ws] vuelta "${fromClose ? '[cerrada]' : win.get_title()}" → ws:${originWorkspace.index()}`);

    state.inFlight = true;

    try {
        if (!fromClose) {
            _attemptExitRoundtripState(win);
            moveWindowToWorkspace(win, originWorkspace, resolvedMonitor);
            activateWorkspace(originWorkspace, log, 'vuelta');

            if (!win.minimized)
                focusWindowSoon(win, log, 'vuelta');

            scheduleSavedGeometryRestore(win, state, resolvedMonitor, log);
        } else {
            activateWorkspace(originWorkspace, log, 'close');
        }
    } catch (e) {
        const message = e?.stack ?? e?.message ?? String(e);
        console.error(`maximize-roundtrip [vuelta]: ${message}`);
    } finally {
        state.inFlight = false;
        cleanupAfterRestore(state, policy, log);
    }
}

export function restoreToOriginMinimized(win, state, policy, log) {
    if (!state.moved || state.inFlight)
        return;

    policy.ensureFixedWorkspaces();

    const originWorkspace = _resolveOriginWorkspace(state, policy);
    if (!originWorkspace) {
        log('[ws] vuelta minimizada: no existe origen fijo, limpiando');
        cleanupAfterRestore(state, policy, log);
        return;
    }

    const resolvedMonitor = resolveMonitorByConnector(
        state.originMonitorConnector,
        state.originMonitorIndex,
        log
    );

    log(`[ws] vuelta minimizada "${win.get_title()}" → ws:${originWorkspace.index()}`);

    state.inFlight = true;
    state.pendingRestoreGeometry = state.savedGeometry ? { ...state.savedGeometry } : null;
    state.pendingRestoreMonitor = resolvedMonitor;

    try {
        state.pendingExitRoundtrip = _attemptExitRoundtripState(win);
        moveWindowToWorkspace(win, originWorkspace, resolvedMonitor);
        activateWorkspace(originWorkspace, log, 'minimize');
    } catch (e) {
        const message = e?.stack ?? e?.message ?? String(e);
        console.error(`maximize-roundtrip [vuelta minimizada]: ${message}`);
    } finally {
        state.inFlight = false;
        cleanupAfterRestore(state, policy, log);
    }
}

export function cleanupAfterRestore(state, policy, log) {
    const tempWorkspace = state.tempWorkspace;

    clearRoundtripState(state);

    if (state.cleanupTimeoutId)
        GLib.Source.remove(state.cleanupTimeoutId);

    state.cleanupTimeoutId = GLib.timeout_add(
        GLib.PRIORITY_DEFAULT,
        CLEANUP_DELAY_MS,
        () => {
            state.cleanupTimeoutId = 0;
            cleanupWorkspace(policy, tempWorkspace, log);
            return GLib.SOURCE_REMOVE;
        }
    );
}

export function normalizeFixedWorkspaceRoundtripWindows(windowSignals, states, policy, log) {
    policy.ensureFixedWorkspaces();

    for (const [win] of windowSignals.entries()) {
        try {
            if (!win || win.minimized)
                continue;

            if (!isInterestingWindow(win))
                continue;

            const ws = win.get_workspace();
            if (!policy.isFixedWorkspace(ws))
                continue;

            if (!isRoundtripState(win))
                continue;

            const state = getState(states, win);
            if (state.moved || state.inFlight)
                continue;

            log(`[ws] startup normaliza "${win.get_title()}" grande en fijo ws:${ws.index()} → temp`);
            sendToTempWorkspace(win, state, policy, log, { follow: false, focus: false });
        } catch (e) {
            const message = e?.stack ?? e?.message ?? String(e);
            console.error(`maximize-roundtrip [normalize fixed ws]: ${message}`);
        }
    }
}

export function redirectNewWindowToFixedWorkspace(win, states, policy, log) {
    GLib.timeout_add(GLib.PRIORITY_DEFAULT, REDIRECT_DELAY_MS, () => {
        try {
            if (!win || win.is_on_all_workspaces())
                return GLib.SOURCE_REMOVE;

            const winWs = win.get_workspace();
            if (!winWs || !policy.isTempWorkspace(winWs))
                return GLib.SOURCE_REMOVE;

            const fixedWs = policy.getFixedWorkspaceForNewWindows();
            if (fixedWs && fixedWs !== winWs) {
                log(`[ext] redirigiendo nueva ventana "${win.get_title()}" temp ws:${winWs.index()} → fijo ws:${fixedWs.index()}`);
                win.change_workspace(fixedWs);
            }
        } catch (e) {
            const message = e?.stack ?? e?.message ?? String(e);
            console.error(`maximize-roundtrip [redirect new window]: ${message}`);
        }

        return GLib.SOURCE_REMOVE;
    });
}

export { schedulePendingGeometryRestore };


function _resolveOriginWorkspace(state, policy) {
    if (state.originWorkspace && policy.isFixedWorkspace(state.originWorkspace))
        return state.originWorkspace;

    return policy.getDefaultOriginWorkspace();
}

function _attemptExitRoundtripState(win) {
    try {
        if (win.fullscreen)
            win.unmake_fullscreen();

        if (win.maximized_horizontally || win.maximized_vertically)
            win.unmaximize(Meta.MaximizeFlags.BOTH);
    } catch (_) { }

    return isRoundtripState(win);
}
