// MathUtils.ts
/**
 * A collection of math utility functions for pjx-echoes.
 * Used for random number generation and other handy math tricks.
 *
 * @module MathUtils
 */

/**
 * MathUtils provides static helper functions for math operations commonly needed in the game.
 */
export class MathUtils {
    /**
     * Returns a random integer between min (inclusive) and max (exclusive).
     * Great for picking random tiles, directions, or other game elements.
     *
     * @param {number} min - The minimum value (inclusive).
     * @param {number} max - The maximum value (exclusive).
     * @returns {number} A random integer in [min, max).
     */
    static getRandomInt(min: number, max: number): number {
        // Ensure min and max are integers
        min = Math.ceil(min);
        max = Math.floor(max);
        // Generate random integer in the range [min, max)
        return Math.floor(Math.random() * (max - min)) + min;
    }
}