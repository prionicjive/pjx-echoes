import { Game } from '../core/Game';

import * as planck from 'planck-js';
import * as PIXI from 'pixi.js';

type WallScaffold = {
    x: number;
    y: number;
    width: number;
    height: number;
    color: number;
}

type Wall = {
    body: planck.Body;
    sprite: PIXI.Graphics;
}

export class Level {
    // TODO Make as a "robust" wall object
    private walls: Wall[]; // TODO Consider what happens when we move to sprite instead of PIXI.Graphics
    constructor(world: planck.World, stage: PIXI.Container, levelMap: number[][]) {
        // TODO Reconsider when we might have more than just walls in a level
        this.walls = [];

        // Convert level map to level scaffold constructing simple wall objects.
        // Do calculation world (Meter) space and NOT pixels

        // Start with the level boundaries themselves
        const levelScaffold: WallScaffold[] = [
            { x: 0, y: -1, width: Game.Config.WorldDimensions.width, height: 1, color: 0xff0000 }, // Top
            { x: 0, y: Game.Config.WorldDimensions.height, width: Game.Config.WorldDimensions.width, height: 1, color: 0xff0000 }, // Bottom
            { x: -1, y: 0, width: 1, height: Game.Config.WorldDimensions.height, color: 0xff0000 }, // Left
            { x: Game.Config.WorldDimensions.width, y: 0, width: 1, height: Game.Config.WorldDimensions.height, color: 0xff0000 } // Right
        ];

        // Add the walls from the level map
        for (let y = 0; y < levelMap.length; y++) {
            for (let x = 0; x < levelMap[y].length; x++) {
                if (levelMap[y][x] === 1) {
                    levelScaffold.push({
                        x: x,
                        y: y,
                        width: 1,
                        height: 1,
                        color: 0x3d3d3d
                    });
                }
            }
        }

        levelScaffold.forEach(wallScaffold => {
            const { x, y, width, height, color } = wallScaffold;

            const wallBody = world.createBody();
            // TODO Refer to echoes and Box2D docs on how to be set up the tiles, fixtures and such
            // TODO Do we need to dispose of bodies and fixtures?
            // TODO HOw do we flag these as static?
            const center = new planck.Vec2(x + width / 2, y + height / 2);
            wallBody.createFixture(new planck.Box(width / 2, height / 2, center, 0), {
              restitution: 0.95,
              friction: 0
            });

            // TODO Figure out what to do when using an actual sprite with textures
            const sprite = new PIXI.Graphics();
            sprite
                .beginFill(color)
                .drawRect(
                    x * Game.Config.PixelsPerMeter, 
                    y * Game.Config.PixelsPerMeter, 
                    width * Game.Config.PixelsPerMeter, 
                    height * Game.Config.PixelsPerMeter
                )
                .endFill(); // TODO Fix deprecation

            sprite.x = wallBody.getPosition().x * Game.Config.PixelsPerMeter;
            sprite.y = wallBody.getPosition().y * Game.Config.PixelsPerMeter;
            stage.addChild(sprite);

            this.walls.push({ body: wallBody, sprite });
        });
    }

    update() {
        // TODO Read below...
        // If walls move (dynamic level), update here.
        // Normally walls don't move, so you can leave this empty.
    }
}
