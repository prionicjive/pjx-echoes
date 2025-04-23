import * as planck from 'planck';
import * as PIXI from 'pixi.js';

export interface Entity {
    body: planck.Body;
    sprite: PIXI.Graphics;
}