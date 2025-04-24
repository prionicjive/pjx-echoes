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
            { x: 0, y: -1, width: Game.Config.LevelDimensions.width, height: 1, color: 0xff0000 }, // Top
            { x: 0, y: Game.Config.LevelDimensions.height, width: Game.Config.LevelDimensions.width, height: 1, color: 0xff0000 }, // Bottom
            { x: -1, y: 0, width: 1, height: Game.Config.LevelDimensions.height, color: 0xff0000 }, // Left
            { x: Game.Config.LevelDimensions.width, y: 0, width: 1, height: Game.Config.LevelDimensions.height, color: 0xff0000 } // Right
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
            
            const wallBody = world.createBody(new planck.Vec2(x, y));
            
            wallBody.createFixture(
                new planck.Box(
                    width / 2, 
                    height / 2, 
                    new planck.Vec2(width / 2, height / 2), 
                    0
                ), {
                restitution: 0.95,
                friction: 0,
                userData: "WALL",
                filterCategoryBits: Game.Config.Physics.Collision.categoryWall,
                filterMaskBits: Game.Config.Physics.Collision.categoryPlayer
            });

            // Create sprite
            const sprite = PIXI.Sprite.from(Game.Config.Textures.wall);
            sprite.x = wallBody.getPosition().x * Game.Config.PixelsPerMeter;
            sprite.y = wallBody.getPosition().y * Game.Config.PixelsPerMeter;
            sprite.width = width * Game.Config.PixelsPerMeter;
            sprite.height = height * Game.Config.PixelsPerMeter;
            sprite.tint = color;
            
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

            const finishBody = world.createBody(new planck.Vec2(Number(x), Number(y)));

            finishBody.createFixture(
                new planck.Box(
                    width / 2, 
                    height / 2, 
                    new planck.Vec2(width / 2, height / 2), 
                    0
                ), {
                isSensor: true,
                userData: "FINISH",
                filterCategoryBits: Game.Config.Physics.Collision.categoryFinish,
                filterMaskBits: Game.Config.Physics.Collision.categoryPlayer,
            });

            // Create sprite
            const sprite = PIXI.Sprite.from(Game.Config.Textures.finish);
            sprite.x = finishBody.getPosition().x * Game.Config.PixelsPerMeter;
            sprite.y = finishBody.getPosition().y * Game.Config.PixelsPerMeter;
            sprite.width = width * Game.Config.PixelsPerMeter;
            sprite.height = height * Game.Config.PixelsPerMeter;
            sprite.tint = color;


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
