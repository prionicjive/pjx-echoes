// InputManager.ts
/**
 * Handles translating mouse clicks into in-game actions.
 * Decouples input logic from rendering and physics details.
 * 
 * @module InputManager
 */

import { Player } from './Player.ts';
import { Config } from './Config.ts';
import { Point } from '../utils/types.ts';
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
     * Handles mouse clicks or touch events by converting screen coordinates to level-relative coordinates,
     * then applies an impulse to the player in that direction)
     */
    handleClickOrTouch(player: Player, levelRelativePointInPixels: Point) {
        if (Config.Movement.towardsPoint) {
            // Apply an impulse toward the point
            player.applyImpulseTowards(levelRelativePointInPixels);
        } else {
            // Apply an impulse away from the point
            player.applyImpulseAwayFrom(levelRelativePointInPixels);
        }
    }
}