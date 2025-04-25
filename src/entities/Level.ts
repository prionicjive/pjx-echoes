// Level.ts
/**
 * Handles procedural level generation, wall and finish tile creation, and rendering.
 * Converts a numeric map into physics bodies and sprites for gameplay.
 *
 * @module Level
 */

import { Game } from '../core/Game';
import { Entity, PhysicalEntity } from './types';
import * as planck from 'planck';
import * as PIXI from 'pixi.js';
import { MathUtils } from '../utils/MathUtils';
import { Segment } from '../utils/types';

/**
 * Describes a wall or boundary to be created in the level.
 * Used as an intermediate step before creating physics bodies and sprites.
 * @typedef {Object} WallScaffold
 * @property {number} x - X position (in world units)
 * @property {number} y - Y position (in world units)
 * @property {number} width - Width (in world units)
 * @property {number} height - Height (in world units)
 * @property {number} color - Tint color for the wall
 */
type WallScaffold = {
    x: number;
    y: number;
    width: number;
    height: number;
    color: number;
}

type LevelContainers = {
    wallsContainer: PIXI.Container;
    finishTilesContainer: PIXI.Container;
    edgesContainer: PIXI.Container;
}

/**
 * The Level class generates and manages all static entities for a level,
 * including walls and finish tiles. Handles conversion from map data to
 * physics and rendering objects.
 */
export class Level {
    private walls: Entity[];
    private finishTiles: PhysicalEntity[];

    /**
     * Creates a new Level instance, generating walls and finish tiles from the given map.
     *
     * @param {planck.World} world - The Planck.js world to add walls and tiles to.
     * @param {LevelContainers} levelContainers - Where to add sprites for the various level entities for rendering go.
     * @param {number[][]} levelMap - 2D array representing the map layout (1 = wall, 0 = open).
     * @param {string[]} openSpaces - Array of open tile positions as "x,y" strings.
     * @param {Segment[][][]} validEdgesLookupTable - Precomputed lookup table for valid edges.
     */
    constructor(world: planck.World, levelContainers: LevelContainers, levelMap: number[][], openSpaces: string[], validEdgesLookupTable: Segment[][][]) {
        // Store references to wall and finish tile entities
        this.walls = [];
        this.finishTiles = [];

        // Convert level map to a list of wall/boundary objects (scaffolding)
        // All calculations in world (meter) space, not pixels
        // TODO: Consider breaking generative steps into helper functions for clarity

        // Start with the outer boundaries of the level
        const wallScaffolding: WallScaffold[] = [];

        // Add walls from the map (1 = wall)
        for (let y = 0; y < levelMap.length; y++) {
            for (let x = 0; x < levelMap[y].length; x++) {
                if (levelMap[y][x] === 1) {
                    wallScaffolding.push({
                        x: x,
                        y: y,
                        width: Game.Config.Wall.size,
                        height: Game.Config.Wall.size,
                        color: Game.Config.Wall.color
                    });
                }
            }
        }

        // Create sprites for each wall
        wallScaffolding.forEach(wallScaffold => {
            const { x, y, width, height, color } = wallScaffold;

            // Create a sprite for the wall
            const sprite = PIXI.Sprite.from(Game.Config.Textures.wall);
            sprite.x = x * Game.Config.PixelsPerMeter;
            sprite.y = y * Game.Config.PixelsPerMeter;
            sprite.width = width * Game.Config.PixelsPerMeter;
            sprite.height = height * Game.Config.PixelsPerMeter;
            sprite.tint = color;
            
            //levelContainers.wallsContainer.addChild(sprite);

            // Store wall entity for future reference (could be useful for collision, etc.)
            this.walls.push({ sprite });
        });

        // Create single body and multiple fixtures for all the edges of the level
        const levelBody = world.createBody();

        // Also, while iterating, draw the edges of the walls
        const edgeGraphics = new PIXI.Graphics();

        for (let y = 0; y < validEdgesLookupTable.length; y++) {
            for (let x = 0; x < validEdgesLookupTable[0].length; x++) {
                // Find valid edges for each tile and add them to the master list of edges
                const validEdges: Segment[] = validEdgesLookupTable[y][x];
                validEdges.forEach(edge => {
                    // Draw the edge
                    edgeGraphics.moveTo(edge.a.x * Game.Config.PixelsPerMeter, edge.a.y * Game.Config.PixelsPerMeter);
                    edgeGraphics.lineTo(edge.b.x * Game.Config.PixelsPerMeter, edge.b.y * Game.Config.PixelsPerMeter);
                    edgeGraphics.stroke({width:Game.Config.Boundaries.thickness, color: Game.Config.Boundaries.color});

                    // Create a fixture for the edge
                    const shape = new planck.Edge(edge.a, edge.b);
                    levelBody.createFixture(
                        shape, {
                            restitution: 0.95,
                            friction: 0,
                            userData: "WALL",
                            filterCategoryBits: Game.Config.Physics.Collision.categoryWall,
                            filterMaskBits: Game.Config.Physics.Collision.categoryPlayer
                        }
                    );
                });
            }
        }

        // Add the renderer edges to the proper container
        levelContainers.edgesContainer.addChild(edgeGraphics);

        // Randomly place finish tiles in open spaces for the player to reach
        const numFinishTiles = MathUtils.getRandomInt(Game.Config.FinishTiles.min, Game.Config.FinishTiles.max);
        for (let i = 0; i < numFinishTiles; i++) {
            // Pick a random open space
            const [x, y] = openSpaces[Math.floor(Math.random() * openSpaces.length)].split(",");
            const width = Game.Config.Finish.size;
            const height = Game.Config.Finish.size;
            const color = Game.Config.Finish.color;

            // Create a static body for the finish tile
            const finishBody = world.createBody(new planck.Vec2(Number(x), Number(y)));
            finishBody.createFixture(
                new planck.Box(
                    width / 2,
                    height / 2,
                    new planck.Vec2(width / 2, height / 2),
                    0
                ), {
                restitution: 0,
                friction: 0,
                userData: "FINISH",
                filterCategoryBits: Game.Config.Physics.Collision.categoryFinish,
                filterMaskBits: Game.Config.Physics.Collision.categoryPlayer
            });

            // Create a sprite for the finish tile
            const sprite = PIXI.Sprite.from(Game.Config.Textures.finish);
            sprite.x = Number(x) * Game.Config.PixelsPerMeter;
            sprite.y = Number(y) * Game.Config.PixelsPerMeter;
            sprite.width = width * Game.Config.PixelsPerMeter;
            sprite.height = height * Game.Config.PixelsPerMeter;
            sprite.tint = color;
            levelContainers.finishTilesContainer.addChild(sprite);

            this.finishTiles.push({ body: finishBody, sprite });
        }
    }

    /**
     * Returns all wall entities in the level.
     * @returns {Entity[]} Array of wall entities.
     */
    getWalls(): Entity[] {
        return this.walls;
    }

    /**
     * Returns all finish tile entities in the level.
     * @returns {PhysicalEntity[]} Array of finish tile entities.
     */
    getFinishTiles(): PhysicalEntity[] {
        return this.finishTiles;
    }

    /**
     * Updates all entities in the level (e.g., for animation or effects).
     * Currently a stub; expand as needed for future features.
     */
    update() {
        // Placeholder for future logic (e.g., animated tiles)
    }
}
