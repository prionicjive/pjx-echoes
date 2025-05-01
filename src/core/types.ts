import * as planck from 'planck';
import * as PIXI from 'pixi.js';

export interface RenderableGeometry {
    id: string;
    body: planck.Body;
    graphics: PIXI.Graphics | null;
}