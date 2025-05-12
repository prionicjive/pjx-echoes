import { SwipeGesture } from "./SwipeGesture";
import { Point } from "../utils/types";

export interface PointerState {
    screen: Point,
    world: Point,
    isDown: boolean,
    justReleased: boolean,
};

export interface SwipeState {
    velocityX: number,
    velocityY: number,
    detected: boolean,
};

export class InputManager {
    private pointer: PointerState = {
        screen: { x: 0, y: 0 },
        world: { x: 0, y: 0 },
        isDown: false,
        justReleased: false,
    };

    private isTouchActive: boolean = false;
    private swipeGesture: SwipeGesture = new SwipeGesture();
    private swipe: SwipeState = {
        velocityX: 0,
        velocityY: 0,
        detected: false,
    };
    // Add more state as needed (keyboard, gamepad, etc.)

    constructor(canvas: HTMLCanvasElement) {
        // Register mouse events
        canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
        canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
        canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    
        // Register touch events
        canvas.addEventListener('touchstart', this.onTouchStart.bind(this));
        canvas.addEventListener('touchend', this.onTouchEnd.bind(this));
    
        // TODO Add keyboard/gamepad events if needed
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
        if (!this.isTouchActive) {
            // Additional logic that only happens when we aren't in touch mode
            this.updatePointerScreen(e);
        }
    }
    
    private onTouchStart(e: TouchEvent) {
        this.isTouchActive = true;

        // Set pointer position to first touch
        const touch = e.touches[0];
        this.pointer.isDown = true;
        this.pointer.justReleased = false;
        this.pointer.screen = { x: touch.clientX, y: touch.clientY };

        // Pass touch position to swipe gesture
        this.swipeGesture.onTouchStart(touch.clientX, touch.clientY);
    }
    
    private onTouchEnd(e: TouchEvent) {
        this.isTouchActive = false;

        this.pointer.isDown = false;
        this.pointer.justReleased = true;
        
        // Handle swipe gesture end and set this.swipe
        const touch = e.changedTouches[0];
        const swipe = this.swipeGesture.onTouchEnd(touch.clientX, touch.clientY);
        if (swipe) {
            this.swipe.velocityX = swipe.velocityX;
            this.swipe.velocityY = swipe.velocityY;
            this.swipe.detected = true;
        }
    }

    private updatePointerScreen(e: MouseEvent) {
        this.pointer.screen = { x: e.clientX, y: e.clientY };
        // TODO Update pointer.world if you have a screen-to-world transform
    }

    // Call this once per frame to reset "justReleased" flags
    public update() {
        this.pointer.justReleased = false;
        this.swipe.detected = false;
    }

    // Public API for World/Player
    public getPointerState(): PointerState { return { ...this.pointer }; }
    public getSwipeState(): SwipeState { return { ...this.swipe }; }
    public getIsTouchActive(): boolean { return this.isTouchActive; }
    
    // TODO Add more getters as needed
}