import GLib from 'gi://GLib';

import {
    DEFAULT_WIDTH,
    DEFAULT_HEIGHT,
    GEOMETRY_RESTORE_DELAY_MS,
} from '../core/constants.js';

import { isRoundtripState } from './windowState.js';

export function computeSavedGeometry(win, state, monitorIndex) {
    if (state.lastNormalGeometry)
        return { ...state.lastNormalGeometry };

    try {
        if (!isRoundtripState(win)) {
            const frame = win.get_frame_rect();
            if (frame.width >= 400 && frame.height >= 300) {
                return {
                    x: frame.x,
                    y: frame.y,
                    width: frame.width,
                    height: frame.height,
                };
            }
        }
    } catch (_) { }

    return centeredGeometry(win, monitorIndex);
}

export function scheduleSavedGeometryRestore(win, state, monitorIndex, log) {
    if (!state.savedGeometry)
        return;

    const geo = { ...state.savedGeometry };

    _scheduleGeometryRestore(win, state, geo, monitorIndex, log, '[ws] geometría restaurada', () => { });
}

export function schedulePendingGeometryRestore(win, state, log) {
    if (!state.pendingRestoreGeometry)
        return;

    const geo = { ...state.pendingRestoreGeometry };
    const monitorIndex = state.pendingRestoreMonitor;

    _scheduleGeometryRestore(
        win,
        state,
        geo,
        monitorIndex,
        log,
        '[ws] geometría post-minimize restaurada',
        () => {
            state.pendingRestoreGeometry = null;
            state.pendingRestoreMonitor = -1;
            state.pendingExitRoundtrip = false;
        }
    );
}

export function clampToMonitor(win, geo, monitorIndex, log) {
    try {
        const workArea = win.get_work_area_for_monitor(monitorIndex);
        const w = Math.min(geo.width, workArea.width);
        const h = Math.min(geo.height, workArea.height);

        const inBounds =
            geo.x >= workArea.x &&
            geo.y >= workArea.y &&
            geo.x + geo.width <= workArea.x + workArea.width &&
            geo.y + geo.height <= workArea.y + workArea.height;

        if (!inBounds) {
            log('[ws] geometría fuera del monitor, recentrando');
            return {
                x: workArea.x + Math.floor((workArea.width - w) / 2),
                y: workArea.y + Math.floor((workArea.height - h) / 2),
                width: w,
                height: h,
            };
        }

        return {
            x: geo.x,
            y: geo.y,
            width: w,
            height: h,
        };
    } catch (_) {
        return geo;
    }
}

export function centeredGeometry(win, monitorIndex) {
    try {
        const workArea = win.get_work_area_for_monitor(monitorIndex);
        return {
            x: workArea.x + Math.floor((workArea.width - DEFAULT_WIDTH) / 2),
            y: workArea.y + Math.floor((workArea.height - DEFAULT_HEIGHT) / 2),
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
        };
    } catch (_) {
        return { x: 100, y: 100, width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT };
    }
}

function _scheduleGeometryRestore(win, state, geo, monitorIndex, log, prefix, afterApply) {
    if (state.geometryTimeoutId)
        GLib.Source.remove(state.geometryTimeoutId);

    state.geometryTimeoutId = GLib.timeout_add(
        GLib.PRIORITY_DEFAULT,
        GEOMETRY_RESTORE_DELAY_MS,
        () => {
            state.geometryTimeoutId = 0;

            try {
                if (win.minimized)
                    return GLib.SOURCE_REMOVE;

                const clamped = clampToMonitor(win, geo, monitorIndex, log);
                win.move_resize_frame(false, clamped.x, clamped.y, clamped.width, clamped.height);
                afterApply();

                log(`${prefix}: ${clamped.width}x${clamped.height} en (${clamped.x},${clamped.y})`);
            } catch (e) {
                const message = e?.stack ?? e?.message ?? String(e);
                console.error(`maximize-roundtrip [geometry restore]: ${message}`);
            }

            return GLib.SOURCE_REMOVE;
        }
    );
}
