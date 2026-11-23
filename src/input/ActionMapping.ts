import { Config } from "../config/Config";
import { Point } from "../utils/types";
import type { GamepadState, KeyState, PointerState, TouchState } from "./InputManager";

/** Device-independent player intent. */
export interface PlayerActions {
    /** Analog stick or WASD/Arrow normalized vector (magnitude 0..1) */
    moveVector: Point | null;
    /** Screen-space target when holding touch or mouse */
    attractorScreenPos: Point | null;
    /** Flick velocity in px/sec on touch release */
    swipeVelocityPx: Point | null;
    /** Screen-space position on non-swipe pointer/touch release */
    pointerReleasedScreenPos: Point | null;
    /** True on the frame LIDAR should fire (Space, double-tap, Gamepad A/RB) */
    fireLidar: boolean;
}

/** Raw device state consumed by the mapping. */
export interface InputSnapshot {
    pointer: PointerState;
    touchState: TouchState;
    gamepad: GamepadState;
    keys: Map<string, KeyState>;
    doubleTapped: boolean;
}

/** Key / button bindings. Edit here to remap. Gamepad indices follow the W3C "standard" mapping. */
export const ActionBindings = {
    fireLidar: { keys: [' '], gamepadButtons: [0, 5] }, // Space; A, RB
    moveLeft: { keys: ['a', 'A', 'ArrowLeft'] },
    moveRight: { keys: ['d', 'D', 'ArrowRight'] },
    moveUp: { keys: ['w', 'W', 'ArrowUp'] },
    moveDown: { keys: ['s', 'S', 'ArrowDown'] },
};

const anyKeyDown = (keys: Map<string, KeyState>, names: string[]) =>
    names.some(k => keys.get(k)?.isDown);

function resolveMoveVector(input: InputSnapshot): Point | null {
    // Gamepad stick (already deadzoned and rescaled to 0..1 magnitude)
    if (input.gamepad.connected) {
        const { x, y } = input.gamepad.leftStick;
        if (x !== 0 || y !== 0) return { x, y };
    }

    // Keyboard
    const kx = (anyKeyDown(input.keys, ActionBindings.moveRight.keys) ? 1 : 0)
        - (anyKeyDown(input.keys, ActionBindings.moveLeft.keys) ? 1 : 0);
    const ky = (anyKeyDown(input.keys, ActionBindings.moveDown.keys) ? 1 : 0)
        - (anyKeyDown(input.keys, ActionBindings.moveUp.keys) ? 1 : 0);
    if (kx === 0 && ky === 0) return null;
    const len = Math.hypot(kx, ky);
    return { x: kx / len, y: ky / len };
}

export function resolvePlayerActions(input: InputSnapshot): PlayerActions {
    const { pointer, touchState, gamepad, keys } = input;

    const fireBinding = ActionBindings.fireLidar;
    const fireLidar =
        fireBinding.keys.some(k => keys.get(k)?.justPressed) ||
        fireBinding.gamepadButtons.some(b => gamepad.justPressed[b]) ||
        input.doubleTapped;

    const attractorScreenPos = pointer.isDown ? { ...pointer.screen } : null;

    let swipeVelocityPx: Point | null = null;
    let pointerReleasedScreenPos: Point | null = null;
    if (!pointer.isDown && pointer.justReleased) {
        const recentSwipe = touchState.lastSwipeTime > 0 &&
            (performance.now() - touchState.lastSwipeTime) < Config.Movement.Gesture.swipeReleaseWindowInMs;
        if (recentSwipe) {
            swipeVelocityPx = {
                x: touchState.lastSwipeDirection.x * touchState.lastSwipeSpeedPixelsPerSecond,
                y: touchState.lastSwipeDirection.y * touchState.lastSwipeSpeedPixelsPerSecond,
            };
        } else {
            pointerReleasedScreenPos = { ...pointer.screen };
        }
    }

    return {
        moveVector: resolveMoveVector(input),
        attractorScreenPos,
        swipeVelocityPx,
        pointerReleasedScreenPos,
        fireLidar,
    };
}
