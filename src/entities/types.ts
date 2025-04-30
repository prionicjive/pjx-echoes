/**
 * Shared type definitions for game entities and other structures in pjx-echoes.
 * Keeps interfaces and types consistent across the codebase.
 *
 * @module types
 */

import * as planck from 'planck';
import * as PIXI from 'pixi.js';

// TODO Could be refactored

export interface GraphicalPhysicsEntity {
    id: string;
    body: planck.Body;
    graphics: PIXI.Graphics | null;
}

// TODO Could be refactored

/**
 * Represents a game entity with a physics body and a PIXI sprite.
 * Used as a contract for objects managed by the game world (e.g., Player, FinishTile).
 * @property {planck.Body} body - The Planck.js physics body for simulation and collisions.
 * @property {PIXI.Sprite} sprite - The PIXI.js sprite for rendering.
 */
export interface PhysicalEntity {
    id: string;
    body: planck.Body;
    sprite: PIXI.Sprite;
}

// TODO Could be refactored

/**
 * Represents a game entity with a PIXI sprite.
 * Used as a contract for objects managed by the game world.
 * @property {PIXI.Sprite} sprite - The PIXI.js sprite for rendering.
 */
export interface Entity {
    id: string;
    sprite: PIXI.Sprite;
}

// TODO Could be refactored
export type EntityType = 'WALL' | 'FINISH' | 'TORCH' | 'FUEL';

export interface BaseEntityDescriptor {
    type: EntityType;
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    color?: number;
    // Optionally, add more fields for extensibility
    [key: string]: any;
}

export type EntityUserData = {
    type: EntityType;
    id: string;
    sprite: PIXI.Sprite;
}