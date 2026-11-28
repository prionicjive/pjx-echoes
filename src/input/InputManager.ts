import { Config } from "../config/Config";
import { Point } from "../utils/types";
import { GestureRecognizer } from "./GestureRecognizer";
import { PlayerActions, resolvePlayerActions } from "./ActionMapping";

export interface PointerState {
    screen: Point,
    world: Point,
    isDown: boolean,
    justReleased: boolean,
}

export interface TouchState {
    active: boolean,
    startTime: number,
    startPos: { x: number, y: number },
    lastPos: { x: number, y: number },
    history: { x: number, y: number, time: number }[],
    lastSwipeTime: number,
    lastSwipeSpeedPixelsPerSecond: number,
    lastSwipeDirection: { x: number, y: number },
}

export interface KeyState {
    isDown: boolean,
    justPressed: boolean,
    justReleased: boolean,
}

export interface KeysState {
    keys: Map<string, KeyState>
}

export interface GamepadState {
    connected: boolean;
    /** Left stick after radial deadzone, rescaled so magnitude spans 0..1 */
    leftStick: { x: number; y: number };
    /** Indexed by standard-mapping button index */
    isDown: boolean[];
    justPressed: boolean[];
    /** Analog value (0..1) per button; triggers report pull depth here */
    buttonValues: number[];
}

export class InputManager {
    private pointer: PointerState = {
        screen: { x: 0, y: 0 },
        world: { x: 0, y: 0 },
        isDown: false,
        justReleased: false,
    };

    private touchState: TouchState = {
        active: false,
        startTime: 0,
        startPos: { x: 0, y: 0 },
        lastPos: { x: 0, y: 0 },
        history: [],
        lastSwipeTime: 0,
        lastSwipeSpeedPixelsPerSecond: 0,
        lastSwipeDirection: { x: 0, y: 0 },
    };

    private keysState: KeysState = {
        keys: new Map<string, KeyState>()
    }

    private lastTapTime = 0;
    private doubleTapped = false;

    private gamepadState: GamepadState = {
        connected: false,
        leftStick: { x: 0, y: 0 },
        isDown: [],
        justPressed: [],
        buttonValues: [],
    };
    private prevPadButtons: boolean[] = [];

    // Stick snap-back filter state (see isStickSnapBack)
    private stickPrevMag = 0;
    private stickLastPollTime = 0;
    private stickWindowUntil = 0;
    private stickDir: { x: number; y: number } | null = null;

    // Zoom input (consumed per frame through ActionMapping)
    private zoomImpulse = 0;       // Accumulated log-zoom from wheel + pinch since last frame()
    private activeTouches = 0;     // Fingers currently on the screen
    private pinching = false;      // 2+ fingers down
    private lastPinchDist = 0;
    // After a pinch begins, ignore single-finger input until ALL fingers lift so the remaining
    // finger can't become an attractor, swipe, tap or release-stop
    private suppressUntilAllUp = false;

    constructor(canvas: HTMLCanvasElement) {
        // Own all touch gestures on the canvas (no browser page zoom / scroll / double-tap zoom)
        canvas.style.touchAction = 'none';
        canvas.addEventListener('wheel', this.onWheel.bind(this), { passive: false });
        canvas.addEventListener('gesturestart', e => e.preventDefault()); // iOS Safari page pinch

        canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
        canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
        canvas.addEventListener('mousemove', this.onMouseMove.bind(this));

        canvas.addEventListener('touchstart', this.onTouchStart.bind(this));
        canvas.addEventListener('touchend', this.onTouchEnd.bind(this));
        canvas.addEventListener('touchcancel', this.onTouchEnd.bind(this));
        canvas.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });

        window.addEventListener('keydown', this.onKeyDown.bind(this));
        window.addEventListener('keyup', this.onKeyUp.bind(this));
    }

    private onMouseDown(e: MouseEvent) {
        this.pointer.isDown = true;
        this.pointer.justReleased = false;
        this.updatePointerScreen(e);
    }

    private onMouseUp(e: MouseEvent) {
        this.pointer.isDown = false;
        this.pointer.justReleased = true;
        this.updatePointerScreen(e);
    }

    private onMouseMove(e: MouseEvent) {
        if (!this.touchState.active) {
            this.updatePointerScreen(e);
        }
    }

    private updatePointerScreen(e: MouseEvent) {
        this.pointer.screen = { x: e.clientX, y: e.clientY };
    }

    private onWheel(e: WheelEvent) {
        e.preventDefault(); // Also swallows trackpad pinch (ctrlKey wheel) so the page doesn't zoom
        const Z = Config.Camera.Zoom;
        const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1; // lines / pages -> px
        const dy = Math.max(-Z.wheelMaxDelta, Math.min(Z.wheelMaxDelta, e.deltaY * unit));
        this.zoomImpulse -= dy * Z.wheelSensitivity; // Scroll up (negative deltaY) = zoom in
    }

    private touchDistance(e: TouchEvent): number {
        const a = e.touches[0], b = e.touches[1];
        return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    }

    /** Two or more fingers down: cancel single-finger state silently (no release, swipe or tap). */
    private beginPinch(e: TouchEvent) {
        this.pinching = true;
        this.suppressUntilAllUp = true;
        this.lastPinchDist = this.touchDistance(e);
        this.pointer.isDown = false;
        this.pointer.justReleased = false;
        this.touchState.active = false;
        this.touchState.history = [];
        this.touchState.lastSwipeTime = 0;
        this.touchState.lastSwipeSpeedPixelsPerSecond = 0;
        this.touchState.lastSwipeDirection = { x: 0, y: 0 };
        this.lastTapTime = 0;
        this.doubleTapped = false;
    }

    private onTouchStart(e: TouchEvent) {
        this.activeTouches = e.touches.length;
        if (e.touches.length >= 2) {
            this.beginPinch(e);
            return;
        }
        if (this.suppressUntilAllUp) return;

        this.touchState.active = true;

        const touch = e.touches[0];
        this.pointer.isDown = true;
        this.pointer.justReleased = false;
        this.pointer.screen = { x: touch.clientX, y: touch.clientY };

        const now = performance.now();
        this.touchState.startTime = now;
        this.touchState.startPos = { x: touch.clientX, y: touch.clientY };
        this.touchState.lastPos = { x: touch.clientX, y: touch.clientY };
        this.touchState.history = [{ x: touch.clientX, y: touch.clientY, time: now }];
        this.touchState.lastSwipeTime = 0;
        this.touchState.lastSwipeSpeedPixelsPerSecond = 0;
        this.touchState.lastSwipeDirection = { x: 0, y: 0 };
    }

    private onTouchEnd(e: TouchEvent) {
        this.activeTouches = e.touches.length;
        if (this.suppressUntilAllUp) {
            this.pinching = e.touches.length >= 2;
            if (this.pinching) this.lastPinchDist = this.touchDistance(e); // Re-baseline on finger set change
            if (e.touches.length === 0) this.suppressUntilAllUp = false;
            return;
        }

        this.pointer.isDown = false;
        this.pointer.justReleased = true;
        this.touchState.active = false;

        // Only a short, non-swipe touch counts as a tap
        const dx = this.touchState.lastPos.x - this.touchState.startPos.x;
        const dy = this.touchState.lastPos.y - this.touchState.startPos.y;
        const isTap = Math.hypot(dx, dy) < Config.Movement.Gesture.tapMaxDistancePx
            && this.touchState.lastSwipeTime === 0;
        if (!isTap) {
            this.lastTapTime = 0;
            return;
        }

        const now = performance.now();
        if (now - this.lastTapTime <= Config.Movement.Gesture.doubleTapMaxIntervalMs) {
            this.doubleTapped = true;
        }
        this.lastTapTime = now;
    }

    private onTouchMove(e: TouchEvent) {
        if (this.suppressUntilAllUp) {
            e.preventDefault();
            if (this.pinching && e.touches.length >= 2) {
                const d = this.touchDistance(e);
                if (this.lastPinchDist > 0 && d > 0) {
                    this.zoomImpulse += Math.log(d / this.lastPinchDist) * Config.Camera.Zoom.pinchSensitivity;
                }
                this.lastPinchDist = d;
            }
            return;
        }
        if (!this.touchState.active) return;
        const touch = e.touches[0];
        const now = performance.now();

        // Maintain sliding history window
        this.touchState.history.push({ x: touch.clientX, y: touch.clientY, time: now });
        this.touchState.history = this.touchState.history.filter(
            pt => now - pt.time <= Config.Movement.Gesture.swipeReleaseWindowInMs
        );

        // Detect swipe
        const swipe = GestureRecognizer.detectSwipe(
            this.touchState.history,
            Config.Movement.Gesture.minSwipeDistance,
            Config.Movement.Gesture.swipeSpeedPixelsPerSecondThreshold
        );
        if (swipe) {
            this.touchState.lastSwipeTime = swipe.time;
            this.touchState.lastSwipeSpeedPixelsPerSecond = swipe.speedPixelsPerSecond;
            this.touchState.lastSwipeDirection = swipe.direction;
        }

        this.touchState.lastPos = { x: touch.clientX, y: touch.clientY };
        this.pointer.screen = { x: touch.clientX, y: touch.clientY };
    }

    private onKeyDown(e: KeyboardEvent) {
        const keyState = this.keysState.keys.get(e.key);
        if (keyState && keyState.isDown) {
            keyState.isDown = true;
            keyState.justPressed = false;
            keyState.justReleased = false;
        } else {
            this.keysState.keys.set(e.key, { isDown: true, justPressed: true, justReleased: false });
        }
    }

    private onKeyUp(e: KeyboardEvent) {
        this.keysState.keys.set(e.key, { isDown: false, justPressed: false, justReleased: true });
    }

    /** Call at the start of each frame (before reading input). Diffs button state against the previous poll. */
    public pollGamepad() {
        const pads = navigator.getGamepads?.() ?? [];
        const pad = Array.from(pads).find(p => p && p.connected) ?? null;
        if (!pad) {
            this.gamepadState = { connected: false, leftStick: { x: 0, y: 0 }, isDown: [], justPressed: [], buttonValues: [] };
            this.prevPadButtons = [];
            this.resetStickFilter();
            return;
        }

        const isDown = pad.buttons.map(b => b.pressed);
        const justPressed = isDown.map((down, i) => down && !this.prevPadButtons[i]);
        const buttonValues = pad.buttons.map(b => b.value);
        this.prevPadButtons = isDown;

        // Radial deadzone, rescaled so output is smooth from 0 at the edge of the deadzone
        const rx = pad.axes[0] ?? 0;
        const ry = pad.axes[1] ?? 0;
        const mag = Math.hypot(rx, ry);
        const dz = Config.Movement.Gamepad.stickDeadzone;
        let leftStick = { x: 0, y: 0 };
        if (mag > dz && !this.isStickSnapBack(rx, ry, mag, dz)) {
            const scaled = Math.min(1, (mag - dz) / (1 - dz));
            leftStick = { x: (rx / mag) * scaled, y: (ry / mag) * scaled };
        }

        this.gamepadState = { connected: true, leftStick, isDown, justPressed, buttonValues };
    }

    /**
     * Snap-back filter. Must be called once per poll with the raw (pre-deadzone) stick.
     * A rapid drop toward center opens a short window; while open, readings pointing away from the
     * last stick direction with magnitude below `maxMagnitude` are the spring-back overshoot and are
     * suppressed. A stronger push (intentional throw) or window expiry resumes normal input.
     * Returns true when this reading should be treated as zero.
     */
    private isStickSnapBack(rx: number, ry: number, mag: number, dz: number): boolean {
        const cfg = Config.Movement.Gamepad.SnapBack;
        const now = performance.now();
        const dt = Math.max(0.001, (now - this.stickLastPollTime) / 1000);
        const prevMag = this.stickPrevMag;
        this.stickLastPollTime = now;
        this.stickPrevMag = mag;
        if (!cfg.enabled) return false;

        // Rapid drop from an active tilt toward center opens the window (not re-extended while open)
        if (now >= this.stickWindowUntil && prevMag > dz && (prevMag - mag) / dt >= cfg.releaseDropPerSecond) {
            this.stickWindowUntil = now + cfg.windowMs;
        }

        const windowOpen = now < this.stickWindowUntil;
        if (!windowOpen) {
            this.stickDir = mag > dz ? { x: rx / mag, y: ry / mag } : null;
            return false;
        }
        if (mag >= cfg.maxMagnitude) {
            // Intentional throw: close the window and follow the stick again
            this.stickWindowUntil = 0;
            this.stickDir = { x: rx / mag, y: ry / mag };
            return false;
        }
        if (this.stickDir && mag > dz) {
            const dot = (rx / mag) * this.stickDir.x + (ry / mag) * this.stickDir.y;
            if (dot < Math.cos(cfg.minReversalAngleDeg * Math.PI / 180)) return true;
            this.stickDir = { x: rx / mag, y: ry / mag };
        }
        return false;
    }

    private resetStickFilter() {
        this.stickPrevMag = 0;
        this.stickLastPollTime = performance.now();
        this.stickWindowUntil = 0;
        this.stickDir = null;
    }

    // Call once per frame to reset "just pressed / released" flags
    public update() {
        this.pointer.justReleased = false;
        this.doubleTapped = false;
        this.zoomImpulse = 0;

        this.keysState.keys.forEach((keyState) => {
            keyState.justPressed = false;
            keyState.justReleased = false;
        });
    }

    /**
     * Drops buffered pointer/touch/tap state and pending edge flags. Called when input unlocks
     * after a transition so nothing queued during it (or a still-held pointer) acts on the new level.
     * Held keys and the gamepad stick are live state and are intentionally left alone.
     */
    public clearState() {
        this.pointer.isDown = false;
        this.pointer.justReleased = false;
        this.touchState.active = false;
        this.touchState.history = [];
        this.touchState.lastSwipeTime = 0;
        this.touchState.lastSwipeSpeedPixelsPerSecond = 0;
        this.touchState.lastSwipeDirection = { x: 0, y: 0 };
        this.lastTapTime = 0;
        this.doubleTapped = false;
        this.pinching = false;
        this.suppressUntilAllUp = this.activeTouches > 0; // A finger held through the lock stays ignored
        this.resetStickFilter();
        this.update();
    }

    public getPointerState(): PointerState { return { ...this.pointer }; }
    public getTouchState(): TouchState { return { ...this.touchState }; }
    public getKeysState(): KeysState { return { ...this.keysState }; }
    public getGamepadState(): GamepadState { return { ...this.gamepadState, leftStick: { ...this.gamepadState.leftStick } }; }
    public getActions(): PlayerActions {
        return resolvePlayerActions({
            pointer: this.getPointerState(),
            touchState: this.getTouchState(),
            gamepad: this.getGamepadState(),
            keys: this.keysState.keys,
            doubleTapped: this.doubleTapped,
            zoomImpulse: this.zoomImpulse,
        });
    }
    public isDoubleTapped(): boolean { return this.doubleTapped; }
    /** True if any gamepad button went down on the latest poll (allocation-free; for audio unlock nudges). */
    public anyGamepadButtonJustPressed(): boolean { return this.gamepadState.justPressed.some(Boolean); }
}
