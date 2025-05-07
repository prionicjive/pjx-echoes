/**
 * Shared type definitions for game entities and other structures in pjx-echoes.
 * Keeps interfaces and types consistent across the codebase.
 *
 * @module types
 */

import * as planck from 'planck';
import * as PIXI from 'pixi.js';

// TODO Could be refactored
export type EntityType = 'PLAYER' | 'SENTRY' | 'WALL' | 'FINISH' | 'TORCH' | 'FUEL';

export interface Entity {
    id: string;
    sprite: PIXI.Sprite;
    body: planck.Body | null;
}

export type EntityUserData = {
    type: EntityType;
    id: string;
    sprite: PIXI.Sprite;
    body: planck.Body | null;
}