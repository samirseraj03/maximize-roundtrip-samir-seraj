import GLib from 'gi://GLib';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';

import { STARTUP_GRACE_MS } from './src/core/constants.js';
import { createLogger } from './src/core/logger.js';
import { createRuntimeState, disposeRuntimeState } from './src/core/stateRegistry.js';
import { GnomeWorkspaceSettings } from './src/core/gnomeWorkspaceSettings.js';

import { createWorkspacePolicy } from './src/policy/workspacePolicy.js';
import { AltTabManager } from './src/input/altTabManager.js';
import { WorkspaceSelector } from './src/ui/workspaceSelector.js';
import { MinimizedIndicator } from './src/ui/minimizedIndicator.js';
import { trackWindow } from './src/windows/windowTracker.js';
import {
    normalizeFixedWorkspaceRoundtripWindows,
    redirectNewWindowToFixedWorkspace,
    restoreToOrigin,
} from './src/workspace/workspaceManager.js';
import { onMonitorsChanged } from './src/monitors/monitorManager.js';

/**
 * The root entrypoint for the Maximize Roundtrip extension spanning the GNOME lifecycle.
 * Instantiated natively by GNOME Shell when parsing metadata.json configurations.
 */
export default class MaximizeRoundtripExtension extends Extension {
    /**
     * Fired by Mutter when the user flips the toggle to activate the extension.
     * Hooks immediately into runtime and defers UI generation to circumvent Wayland graphical initialization races.
     */
    enable() {
        this._log = createLogger(this.metadata.uuid);
        this._runtime = createRuntimeState();
        this._gnomeWorkspaceSettings = new GnomeWorkspaceSettings(this._log, 1);
        this._policy = createWorkspacePolicy(this._log, this._gnomeWorkspaceSettings);

        this._altTab = null;
        this._workspaceSelector = null;
        this._minimizedIndicator = null;

        this._gnomeWorkspaceSettings.enableStaticBase();

        this._runtime.startupTimeoutId = GLib.timeout_add(
            GLib.PRIORITY_DEFAULT,
            STARTUP_GRACE_MS,
            () => {
                this._runtime.startupTimeoutId = 0;
                this._finishEnable();
                return GLib.SOURCE_REMOVE;
            }
        );

        this._log(`[ext] arranque diferido ${STARTUP_GRACE_MS}ms`);
    }

    /**
     * Delayed secondary startup phase triggered roughly ~1.5 seconds post-enable. 
     * Registers Alt+Tab injectors and mounts visual observers without breaking initial OS load times.
     * @private
     */
    _finishEnable() {
        if (!this._runtime || this._runtime.ready)
            return;

        this._policy.ensureFixedWorkspaces();
        this._runtime.ready = true;

        const settings = this.getSettings('org.gnome.shell.extensions.maximize-roundtrip');

        this._altTab = new AltTabManager(settings, m => this._log(m));
        this._altTab.enable();

        this._workspaceSelector = new WorkspaceSelector(settings, m => this._log(m));
        this._workspaceSelector.enable();

        this._minimizedIndicator = new MinimizedIndicator(settings, m => this._log(m));
        this._minimizedIndicator.enable();

        this._runtime.displaySignals.push(
            global.display.connect('window-created', (_display, win) => {
                trackWindow(
                    win,
                    this._runtime.windowSignals,
                    this._runtime.states,
                    this._policy,
                    m => this._log(m)
                );

                redirectNewWindowToFixedWorkspace(
                    win,
                    this._runtime.states,
                    this._policy,
                    m => this._log(m)
                );
            })
        );

        this._runtime.monitorSignal = Main.layoutManager.connect(
            'monitors-changed',
            () => onMonitorsChanged(
                this._runtime.windowSignals,
                this._runtime.states,
                (win, state, fromClose) =>
                    restoreToOrigin(win, state, this._policy, fromClose, m => this._log(m)),
                m => this._log(m)
            )
        );

        for (const actor of global.get_window_actors()) {
            const win = actor.get_meta_window();
            trackWindow(
                win,
                this._runtime.windowSignals,
                this._runtime.states,
                this._policy,
                m => this._log(m)
            );
        }

        normalizeFixedWorkspaceRoundtripWindows(
            this._runtime.windowSignals,
            this._runtime.states,
            this._policy,
            m => this._log(m)
        );

        this._log('[ext] activada');
    }

    /**
     * Core lifecycle hook triggered when the user turns the extension off or crashes out of the Session.
     * Flushes all active observers, UI instances, and cleanly rolls back configurations safely.
     */
    disable() {
        if (!this._runtime)
            return;

        const log = this._log;

        if (this._runtime.startupTimeoutId) {
            GLib.Source.remove(this._runtime.startupTimeoutId);
            this._runtime.startupTimeoutId = 0;
        }

        this._minimizedIndicator?.disable();
        this._minimizedIndicator = null;

        this._workspaceSelector?.disable();
        this._workspaceSelector = null;

        this._altTab?.disable();
        this._altTab = null;

        for (const id of this._runtime.displaySignals) {
            try {
                global.display.disconnect(id);
            } catch (_) { }
        }
        this._runtime.displaySignals = [];

        if (this._runtime.monitorSignal) {
            try {
                Main.layoutManager.disconnect(this._runtime.monitorSignal);
            } catch (_) { }
            this._runtime.monitorSignal = 0;
        }

        disposeRuntimeState(this._runtime);
        this._runtime = null;
        this._policy = null;

        this._gnomeWorkspaceSettings?.restore();
        this._gnomeWorkspaceSettings = null;

        log?.('[ext] desactivada');
    }
}
