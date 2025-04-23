import { Game } from '../core/Game';
import { Entity } from './types';

import * as planck from 'planck';
import * as PIXI from 'pixi.js';
import { MathUtils } from '../utils/MathUtils';

type WallScaffold = {
    x: number;
    y: number;
    width: number;
    height: number;
    color: number;
}

export class Level {
    private walls: Entity[];
    private finishTiles: Entity[];

    constructor(world: planck.World, levelContainer: PIXI.Container | null, levelMap: number[][], openSpaces: string[]) {
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
                        width: Game.Config.Wall.size,
                        height: Game.Config.Wall.size,
                        color: Game.Config.Wall.color
                    });
                }
            }
        }

        levelScaffold.forEach(wallScaffold => {
            const { x, y, width, height, color } = wallScaffold;
            
            const wallBody = world.createBody();
            
            const center = new planck.Vec2(x + width / 2, y + height / 2);
            wallBody.createFixture(new planck.Box(width / 2, height / 2, center, 0), {
              restitution: 0.95,
              friction: 0,
              userData: "WALL",
              filterCategoryBits: Game.Config.Physics.Collision.categoryWall,
              filterMaskBits: Game.Config.Physics.Collision.categoryPlayer
            });

            // TODO Figure out what to do when using an actual sprite with textures
            const sprite = new PIXI.Graphics();
            sprite
                .rect(
                    x * Game.Config.PixelsPerMeter, 
                    y * Game.Config.PixelsPerMeter, 
                    width * Game.Config.PixelsPerMeter, 
                    height * Game.Config.PixelsPerMeter
                )
                .fill(color);

            sprite.x = wallBody.getPosition().x * Game.Config.PixelsPerMeter;
            sprite.y = wallBody.getPosition().y * Game.Config.PixelsPerMeter;
            levelContainer?.addChild(sprite);

            // TODO Don't really need this now but could be useful later
            this.walls.push({ body: wallBody, sprite });
        });

        // Add finish tiles for the player to reach
        const numFinishTiles = MathUtils.getRandomInt(Game.Config.FinishTiles.min, Game.Config.FinishTiles.max);
        for (let i = 0; i < numFinishTiles; i++) {
            const [x, y] = openSpaces[Math.floor(Math.random() * openSpaces.length)].split(",");
            const width = Game.Config.Finish.size;
            const height = Game.Config.Finish.size;
            const color = Game.Config.Finish.color;

            const finishBody = world.createBody();
            const center = new planck.Vec2(Number(x) + width / 2, Number(y) + height / 2);
            finishBody.createFixture(new planck.Box(width / 2, height / 2, center, 0), {
                isSensor: true,
                userData: "FINISH",
                filterCategoryBits: Game.Config.Physics.Collision.categoryFinish,
                filterMaskBits: Game.Config.Physics.Collision.categoryPlayer,
            });

            // TODO Figure out what to do when using an actual sprite with textures
            const sprite = new PIXI.Graphics();
            sprite
                .rect(
                    Number(x) * Game.Config.PixelsPerMeter, 
                    Number(y) * Game.Config.PixelsPerMeter, 
                    width * Game.Config.PixelsPerMeter, 
                    height * Game.Config.PixelsPerMeter
                )
                .fill(color);

            sprite.x = finishBody.getPosition().x * Game.Config.PixelsPerMeter;
            sprite.y = finishBody.getPosition().y * Game.Config.PixelsPerMeter;
            levelContainer?.addChild(sprite);

            // TODO Don't really need this now but could be useful later
        this.finishTiles.push({ body: finishBody, sprite });
        }

        // TODO Add other entities
    }

    update() {
        // If walls move or other entities move (Ex: dynamic level), update here
    }
}
