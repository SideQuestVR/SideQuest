import { screen, BrowserWindow, BrowserWindowConstructorOptions, Display, Rectangle } from 'electron';
import { StateStorage } from './state-storage';

type WindowMode = 'normal' | 'maximized';

interface WorkingArea {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface WindowState {
    width?: number;
    height?: number;
    x?: number;
    y?: number;
    mode?: WindowMode;
    display?: number;
}

function defaultWindowState(): WindowState {
    return {
        width: 1024,
        height: 768,
        mode: 'normal',
    };
}

export class AppWindow {
    private static WINDOW_STATE_ITEM_KEY = 'windowState';

    private _window: BrowserWindow;
    private isClosing = false;

    public get window(): BrowserWindow {
        return this._window;
    }

    constructor(private stateStorage: StateStorage) {
        const state = this.stateStorage.getItem<WindowState>(AppWindow.WINDOW_STATE_ITEM_KEY, undefined);
        this.createWindow(state);
        this.registerListeners();
    }

    private createWindow(state?: WindowState) {
        const [windowState, hasMultipleDisplays] = this.restoreWindowState(state);

        const isMaximized = windowState.mode === 'maximized';
        const showAfterSetup = isMaximized;

        const options: BrowserWindowConstructorOptions = {
            width: windowState.width,
            height: windowState.height,
            x: windowState.x,
            y: windowState.y,
            minWidth: 800,
            minHeight: 480,
            show: !showAfterSetup,
            frame: false,
            webPreferences: {
                webviewTag: true,
                nodeIntegration: true,
                contextIsolation: false,
            },
        };
        this._window = new BrowserWindow(options);

        // (Electron 4 regression): when running on multiple displays where the target display
        // to open the window has a larger resolution than the primary display, the window will not size
        // correctly unless we set the bounds again
        const isMacintosh = process.platform === 'darwin';
        if (isMacintosh && hasMultipleDisplays) {
            const hasAllBoundsValues = [windowState.width, windowState.height, windowState.x, windowState.y].every(
                value => typeof value === 'number'
            );
            if (hasAllBoundsValues) {
                this._window.setBounds({
                    width: windowState.width,
                    height: windowState.height,
                    x: windowState.x,
                    y: windowState.y,
                });
            }
        }

        if (isMaximized) {
            this._window.maximize();

            if (!this._window.isVisible()) {
                this._window.show();
            }
        }
    }

    private registerListeners() {
        this._window.on('close', e => {
            if (!this.isClosing) {
                e.preventDefault();
                this.isClosing = true;
                this.saveWindowState();
                this._window.close();
            }
        });
    }

    public saveWindowState() {
        this.stateStorage.setItem(AppWindow.WINDOW_STATE_ITEM_KEY, this.serializeWindowState());
    }

    private getWorkingArea(display: Display): WorkingArea | undefined {
        if (display.workArea.width > 0 && display.workArea.height > 0) {
            return display.workArea;
        }

        if (display.bounds.width > 0 && display.bounds.height > 0) {
            return display.bounds;
        }

        return undefined;
    }

    private validateWindowState(state: WindowState, displays: Display[]): WindowState {
        if (
            typeof state.x !== 'number' ||
            typeof state.y !== 'number' ||
            typeof state.width !== 'number' ||
            typeof state.height !== 'number'
        ) {
            return undefined;
        }

        if (state.width <= 0 || state.height <= 0) {
            return undefined;
        }

        if (displays.length === 1) {
            const displayWorkingArea = this.getWorkingArea(displays[0]);
            if (displayWorkingArea) {
                const ensureStateInDisplayWorkingArea = () => {
                    const isTooFarLeft = state.x < displayWorkingArea.x;
                    if (isTooFarLeft) {
                        state.x = displayWorkingArea.x;
                    }
                    const isTooFarUp = state.y < displayWorkingArea.y;
                    if (isTooFarUp) {
                        state.y = displayWorkingArea.y;
                    }
                };
                ensureStateInDisplayWorkingArea();
                const isTooWide = state.width > displayWorkingArea.width;
                if (isTooWide) {
                    state.width = displayWorkingArea.width;
                }
                const isTooTall = state.height > displayWorkingArea.height;
                if (isTooTall) {
                    state.height = displayWorkingArea.height;
                }
                const isTooFarRight = state.x > displayWorkingArea.x + displayWorkingArea.width - 128;
                if (isTooFarRight) {
                    state.x = displayWorkingArea.x + displayWorkingArea.width - 128;
                }
                const isTooFarDown = state.y > displayWorkingArea.y + displayWorkingArea.height - 128;
                if (isTooFarDown) {
                    state.y = displayWorkingArea.y + displayWorkingArea.height - 128;
                }
                ensureStateInDisplayWorkingArea();
            }
            return state;
        } else {
            const display = screen.getDisplayMatching({ x: state.x, y: state.y, width: state.width, height: state.height });
            const displayWorkingArea = this.getWorkingArea(display);
            if (
                display &&
                displayWorkingArea &&
                state.x + state.width > displayWorkingArea.x &&
                state.y + state.height > displayWorkingArea.y &&
                state.x < displayWorkingArea.x + displayWorkingArea.width &&
                state.y < displayWorkingArea.y + displayWorkingArea.height
            ) {
                return state;
            } else {
                return undefined;
            }
        }
    }

    getBounds(): Rectangle {
        const pos = this._window.getPosition();
        const dimension = this._window.getSize();
        return { x: pos[0], y: pos[1], width: dimension[0], height: dimension[1] };
    }

    serializeWindowState(): WindowState {
        if (!this._window) {
            return defaultWindowState();
        }

        const display = screen.getDisplayMatching(this.getBounds());
        const mode: WindowMode = this._window.isMaximized() ? 'maximized' : 'normal';
        const bounds = mode === 'normal' ? this.getBounds() : this._window.getNormalBounds();
        const state: WindowState = {
            mode,
            x: bounds.x,
            y: bounds.y,
            width: bounds.width,
            height: bounds.height,
            display: display ? display.id : undefined,
        };
        return state;
    }

    private restoreWindowState(state?: WindowState): [WindowState, boolean] {
        const displays = screen.getAllDisplays();
        const hasMultipleDisplays = displays.length > 1;
        if (state) {
            state = this.validateWindowState(state, displays);
        }
        return [state || defaultWindowState(), hasMultipleDisplays];
    }
}
