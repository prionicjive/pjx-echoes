/**
 * Shared type definitions for game entities and other structures in pjx-echoes.
 * Keeps interfaces and types consistent across the codebase.
 *
 * @module types
 */

import * as planck from 'planck';
import * as PIXI from 'pixi.js';

/**
 * Represents a game entity with a physics body and a PIXI sprite.
 * Used as a contract for objects managed by the game world (e.g., Player, Wall, FinishTile).
 * @property {planck.Body} body - The Planck.js physics body for simulation and collisions.
 * @property {PIXI.Sprite} sprite - The PIXI.js sprite for rendering.
 */
export interface Entity {
    body: planck.Body;
    sprite: PIXI.Sprite;
}