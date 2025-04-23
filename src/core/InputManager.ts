import { Player } from '../entities/Player.ts';
import * as PIXI from 'pixi.js'; // TODO We shouldn't need to have PIXI here

// TODO This whole class feels UGLY, should we even have it?
export class InputManager {
    private player: Player | null = null;
    private levelContainer: PIXI.Container | null = null; // TODO This feels UGLY to have here
    private boundPointerDown: (e: MouseEvent) => void;

    constructor() {
        this.boundPointerDown = this.onPointerDown.bind(this);
    }
    
    reset(player: Player, levelContainer: PIXI.Container) {
        this.player = player;
        this.levelContainer = levelContainer;

        // Remove listener (if existing) and re-add listening
        window.removeEventListener('mousedown', this.boundPointerDown)
        window.addEventListener('mousedown', this.boundPointerDown);
    }

    onPointerDown(e: MouseEvent) {    
        // Take into account camera positioning in relation to the screen
        if (this.levelContainer) {
            const screenRelativePositionInPixels = {
                x: e.clientX,
                y: e.clientY
            };

            const levelRelativePositionInPixels = {
                x: screenRelativePositionInPixels.x - this.levelContainer?.x,
                y: screenRelativePositionInPixels.y - this.levelContainer?.y
            };

            this.player?.applyImpulseTowards(levelRelativePositionInPixels);
        }
    }
}
