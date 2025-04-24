// InputManager.ts
/**
 * Handles translating mouse clicks into in-game actions.
 * Decouples input logic from rendering and physics details.
 * 
 * @module InputManager
 */

import { Player } from '../entities/Player.ts';

/**
 * Simple structure for 2D positions (pixels).
 * Used for both screen and level-relative coordinates.
 * 
 * @typedef {Object} Position
 * @property {number} x - The x-coordinate.
 * @property {number} y - The y-coordinate.
 */
interface Position {
    x: number;
    y: number;
}

/**
 * Manages all input logic for the game.
 * Responsible for translating user actions (like mouse clicks)
 * into in-game effects, keeping input code clean and separate
 * from rendering or physics logic.
 * 
 * @class InputManager
 */
export class InputManager {
    /**
     * Handles mouse clicks by converting screen coordinates to level-relative coordinates,
     * then applies an impulse to the player in that direction.
     * 
     * @method handleMouseClick
     * @param {Player} player - The player entity to apply the impulse to.
     * @param {Position} screenPosition - The mouse position on the screen (in pixels).
     * @param {Position} levelPosition - The current offset of the level container (in pixels).
     */
    handleMouseClick(player: Player, screenPosition: Position, levelPosition: Position) {
        // Convert screen click to level-relative position
        const levelRelativePositionInPixels = {
            x: screenPosition.x - levelPosition.x,
            y: screenPosition.y - levelPosition.y
        };

        // Apply the calculated impulse to the player
        player.applyImpulseTowards(levelRelativePositionInPixels);
    }
}