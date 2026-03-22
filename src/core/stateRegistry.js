import GLib from 'gi://GLib';

export function createRuntimeState() {
    return {
        displaySignals: [],
        windowSignals: new Map(),
        states: new Map(),
        monitorSignal: 0,
        startupTimeoutId: 0,
        ready: false,
    };
}

export function disposeRuntimeState(runtime) {
    for (const [win, ids] of runtime.windowSignals.entries()) {
        for (const id of ids) {
            try {
                win.disconnect(id);
            } catch (_) { }
        }
    }
    runtime.windowSignals.clear();

    for (const state of runtime.states.values()) {
        if (state.timeoutId)
            GLib.Source.remove(state.timeoutId);

        if (state.cleanupTimeoutId)
            GLib.Source.remove(state.cleanupTimeoutId);

        if (state.geometryTimeoutId)
            GLib.Source.remove(state.geometryTimeoutId);

    }
    runtime.states.clear();

    runtime.ready = false;
}
