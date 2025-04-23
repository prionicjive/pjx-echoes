import { Player } from '../entities/Player.ts';

export class InputManager {
    private player: Player | null = null;
    private boundPointerDown: (e: MouseEvent) => void;

    constructor() {
        this.boundPointerDown = this.onPointerDown.bind(this);
    }
    
    reset(player: Player) {
        this.player = player;

        // Remove listener (if existing) and re-add listening
        console.log("Remove and add listener");
        window.removeEventListener('mousedown', this.boundPointerDown)
        window.addEventListener('mousedown', this.boundPointerDown);
    }

    onPointerDown(e: MouseEvent) {
        console.log("CLICK!");
        // TODO Look into best way to map screen-to-world coordinates for camera and Box2D usage
        const x = e.clientX;
        const y = e.clientY;

        this.player?.applyImpulseTowards({ x, y });
    }
}
