import { Ball } from '../entities/Ball.ts';

export class InputManager {
    private ball: Ball;
    
    constructor(ball: Ball) {
        this.ball = ball;

        // TODO Can this be converted to an arrow function?
        window.addEventListener('mousedown', this.onPointerDown.bind(this));
    }

    onPointerDown(e: MouseEvent) {
        // TODO Look into best way to map screen-to-world coordinates for camera and Box2D usage
        const x = e.clientX;
        const y = e.clientY;

        this.ball.applyImpulseTowards({ x, y });
    }
}
