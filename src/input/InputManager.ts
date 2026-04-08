import { Config } from "../config/Config";
import { Point } from "../utils/types";
import { GestureRecognizer } from "./GestureRecognizer";

export interface PointerState {
    screen: Point,
    world: Point,
    isDown: boolean,
    justReleased: boolean,
};

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

    constructor(canvas: HTMLCanvasElement) {
        canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
        canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
        canvas.addEventListener('mousemove', this.onMouseMove.bind(this));

        canvas.addEventListener('touchstart', this.onTouchStart.bind(this));
        canvas.addEventListener('touchend', this.onTouchEnd.bind(this));
        canvas.addEventListener('touchmove', this.onTouchMove.bind(this));

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

    private onTouchStart(e: TouchEvent) {
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

    private onTouchEnd() {
        this.pointer.isDown = false;
        this.pointer.justReleased = true;
        this.touchState.active = false;
    }

    private onTouchMove(e: TouchEvent) {
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

    // Call once per frame to reset "just pressed / released" flags
    public update() {
        this.pointer.justReleased = false;

        this.keysState.keys.forEach((keyState) => {
            keyState.justPressed = false;
            keyState.justReleased = false;
        });
    }

    public getPointerState(): PointerState { return { ...this.pointer }; }
    public getTouchState(): TouchState { return { ...this.touchState }; }
    public getKeysState(): KeysState { return { ...this.keysState }; }
}
