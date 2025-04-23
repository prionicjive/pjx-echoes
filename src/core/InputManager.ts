import { Player } from '../entities/Player.ts';

interface Position {
    x: number;
    y: number;
}

export class InputManager {
    handleMouseClick(player: Player, screenPosition: Position, levelPosition: Position) {
        const levelRelativePositionInPixels = {
            x: screenPosition.x - levelPosition.x,
            y: screenPosition.y - levelPosition.y
        };

        player.applyImpulseTowards(levelRelativePositionInPixels);
    }
}
