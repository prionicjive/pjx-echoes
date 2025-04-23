import { Game } from '../core/Game';

import * as planck from 'planck-js';
import * as PIXI from 'pixi.js';
import { MathUtils } from '../utils/MathUtils';

type WallScaffold = {
    x: number;
    y: number;
    width: number;
    height: number;
    color: number;
}

type LevelEntity = {
    body: planck.Body;
    sprite: PIXI.Graphics;
}

export class Level {
    // TODO Make as a "robust" wall object
    private walls: LevelEntity[]; // TODO Consider what happens when we move to sprite instead of PIXI.Graphics
    private finishTiles: LevelEntity[];

    constructor(world: planck.World, stage: PIXI.Container | undefined, levelMap: number[][], openSpaces: string[]) {
        // TODO Reconsider when we might have more than just walls in a level
        this.walls = [];
        this.finishTiles = [];

        // Convert level map to level scaffold constructing simple wall objects.
        // Do calculation world (Meter) space and NOT pixels
        // TODO Break all these generative steps into their own functions

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
                        color: 0x3d3d3d // TODO Choose a better color or make it configurable
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
              friction: 0,
              userData: "WALL",
              filterCategoryBits: Game.Config.Physics.CategoryWall,
              filterMaskBits: Game.Config.Physics.CategoryPlayer
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
            stage?.addChild(sprite);

            // TODO Don't really need this now but could be useful later
            this.walls.push({ body: wallBody, sprite });
        });

        // TODO Add finish tiles for the player to reach
        // TODO Figure out how many to randomly generate
        const numFinishTiles = MathUtils.getRandomInt(Game.Config.FinishTiles.min, Game.Config.FinishTiles.max);
        for (let i = 0; i < numFinishTiles; i++) {
            const [x, y] = openSpaces[Math.floor(Math.random() * openSpaces.length)].split(",");
            const width = 1;
            const height = 1;
            const color = 0x00ff00; // TODO Choose a better color or make it configurable

            // TODO Refer to echoes and Box2D docs on how to be set up the tiles, fixtures and such
            // TODO Do we need to dispose of bodies and fixtures?
            // TODO HOw do we flag these as static?
            const finishBody = world.createBody();
            const center = new planck.Vec2(Number(x) + width / 2, Number(y) + height / 2);
            finishBody.createFixture(new planck.Box(width / 2, height / 2, center, 0), {
                isSensor: true,
                userData: "FINISH",
                filterCategoryBits: Game.Config.Physics.CategoryFinish,
                filterMaskBits: Game.Config.Physics.CategoryPlayer,
            });

            // TODO Figure out what to do when using an actual sprite with textures
            const sprite = new PIXI.Graphics();
            sprite
                .beginFill(color)
                .drawRect(
                    Number(x) * Game.Config.PixelsPerMeter, 
                    Number(y) * Game.Config.PixelsPerMeter, 
                    width * Game.Config.PixelsPerMeter, 
                    height * Game.Config.PixelsPerMeter
                )
                .endFill(); // TODO Fix deprecation

            sprite.x = finishBody.getPosition().x * Game.Config.PixelsPerMeter;
            sprite.y = finishBody.getPosition().y * Game.Config.PixelsPerMeter;
            stage?.addChild(sprite);

            // TODO Don't really need this now but could be useful later
        this.finishTiles.push({ body: finishBody, sprite });
        }

        // TODO Add other entities
    }

    update() {
        // TODO Read below...
        // If walls move (dynamic level), update here.
        // Normally walls don't move, so you can leave this empty.
    }
}
