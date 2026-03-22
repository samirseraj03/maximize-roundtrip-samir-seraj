import Meta from 'gi://Meta';

export function getConnectorForMonitor(monitorIndex) {
    try {
        const logicalMonitors = Meta.MonitorManager.get().get_logical_monitors();

        if (monitorIndex >= 0 && monitorIndex < logicalMonitors.length) {
            const physical = logicalMonitors[monitorIndex].get_monitors();
            if (physical.length > 0)
                return physical[0].get_connector();
        }
    } catch (_) { }

    return null;
}

export function resolveMonitorByConnector(connector, fallbackIndex, log) {
    if (!connector)
        return fallbackIndex >= 0 ? fallbackIndex : global.display.get_primary_monitor();

    try {
        const logicalMonitors = Meta.MonitorManager.get().get_logical_monitors();

        for (let i = 0; i < logicalMonitors.length; i++) {
            if (logicalMonitors[i].get_monitors().some(m => m.get_connector() === connector))
                return i;
        }
    } catch (_) { }

    log(`[mon] conector "${connector}" no encontrado → usando primario`);
    return global.display.get_primary_monitor();
}

export function onMonitorsChanged(windowSignals, states, restoreToOriginFn, log) {
    const nMonitors = global.display.get_n_monitors();
    log(`[mon] cambiaron monitores: ${nMonitors} activos`);

    for (const [win] of windowSignals.entries()) {
        const state = states.get(win);
        if (!state || !state.moved || state.inFlight)
            continue;

        const resolvedMonitor = resolveMonitorByConnector(
            state.originMonitorConnector,
            state.originMonitorIndex,
            log
        );

        const monitorDisappeared =
            state.originMonitorIndex >= nMonitors &&
            state.originMonitorConnector !== null &&
            resolvedMonitor !== state.originMonitorIndex;

        if (monitorDisappeared) {
            log(`[mon] monitor "${state.originMonitorConnector}" desconectado → rescue "${win.get_title()}"`);
            restoreToOriginFn(win, state, false);
        }
    }
}
