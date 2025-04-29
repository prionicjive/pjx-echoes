// Level.ts
/**
 * Handles procedural level generation, wall and finish tile creation, and rendering.
 * Converts a numeric map into physics bodies and sprites for gameplay.
 *
 * @module Level
 */

import { Config } from '../core/Config';
import { PhysicsUtils } from '../utils/PhysicsUtils';
import { Entity, PhysicalEntity } from './types';
import * as planck from 'planck';
import * as PIXI from 'pixi.js';
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
    torchesContainer: PIXI.Container;
    fuelTilesContainer: PIXI.Container;
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
    private torches: Entity[];
    private fuelTiles: PhysicalEntity[];

    /**
     * Creates a new Level instance, generating walls and finish tiles from the given map.
     *
     * @param {planck.World} world - The Planck.js world to add walls and tiles to.
     * @param {LevelContainers} levelContainers - Where to add sprites for the various level entities for rendering go.
     * @param {number[][]} levelMap - 2D array representing the map layout (1 = wall, 0 = open).
     * @param {string[]} validSpaces - Array of valid open tile positions as "x,y" strings.
     * @param {Segment[]} edgesList - List of valid edges.
     */
    constructor(world: planck.World, levelContainers: LevelContainers, levelMap: number[][], validSpaces: string[], edgesList: Segment[]) {
        // Store references to wall and finish tile entities
        this.walls = [];
        this.finishTiles = [];
        this.torches = [];
        this.fuelTiles = [];

        // Convert level map to a list of wall/boundary objects (scaffolding)
        // All calculations in world (meter) space, not pixels
        // TODO: Consider breaking generative steps into helper functions for clarity

        // Start with the outer boundaries of the level
        const wallScaffolding: WallScaffold[] = [];

        // Add walls from the map (1 = wall)
        // TODO MAY not actually need this!
        for (let y = 0; y < levelMap.length; y++) {
            for (let x = 0; x < levelMap[y].length; x++) {
                if (levelMap[y][x] === 1) {
                    wallScaffolding.push({
                        x: x,
                        y: y,
                        width: Config.Wall.size,
                        height: Config.Wall.size,
                        color: Config.Wall.color
                    });
                }
            }
        }

        // Create sprites for each wall (If we determine that to be the case)
        if (Config.Debug.drawWalls) {
            wallScaffolding.forEach(wallScaffold => {
                const { x, y, width, height, color } = wallScaffold;

                // Create a sprite for the wall
                const sprite = PIXI.Sprite.from(Config.Textures.wall);
                sprite.x = x * Config.PixelsPerMeter;
                sprite.y = y * Config.PixelsPerMeter;
                sprite.width = width * Config.PixelsPerMeter;
                sprite.height = height * Config.PixelsPerMeter;
                sprite.tint = color;
                
                levelContainers.wallsContainer.addChild(sprite);

                // Store wall entity for future reference (could be useful for collision, etc.)
                this.walls.push({ sprite });
            });
        }

        // Also, while iterating, draw the edges of the walls
        const edgeGraphics = new PIXI.Graphics();

        let drawEdges = Config.Debug.drawEdges;

        for (const edge of edgesList){
            // Draw the edge
            if (drawEdges){
                edgeGraphics.moveTo(edge.a.x * Config.PixelsPerMeter, edge.a.y * Config.PixelsPerMeter);
                edgeGraphics.lineTo(edge.b.x * Config.PixelsPerMeter, edge.b.y * Config.PixelsPerMeter);
                edgeGraphics.stroke({width:Config.Boundaries.thickness, color: Config.Boundaries.color});
            }
        }

        // Create single body and multiple fixtures for all the edges of the level
        // No need to hold on to return value
        PhysicsUtils.createLevelEdgesBody(world, { 
            edges: edgesList, 
            edgeFixture: {
                restitution: 0.95,
                friction: 0,
                userData: { type: Config.Physics.Collision.typeWall },
                filterCategoryBits: Config.Physics.Collision.categoryWall,
                filterMaskBits: Config.Physics.Collision.categoryPlayer
            } 
        });

        if (drawEdges) {
            // Add the renderer edges to the proper container
            levelContainers.edgesContainer.addChild(edgeGraphics);
        }
        
        // Randomly place finish tiles in open spaces for the player to reach
        // TODO Lots of code duplication here that could be addressed
        const numFinishTiles = Math.ceil(validSpaces.length * Config.FinishTilesDensity);
        for (let i = 0; i < numFinishTiles; i++) {
            // Pick a random open space
            const [x, y] = validSpaces[Math.floor(Math.random() * validSpaces.length)].split(",");
            const width = Config.Finish.size;
            const height = Config.Finish.size;
            const color = Config.Finish.color;

            // Create a sprite for the finish tile
            const sprite = PIXI.Sprite.from(Config.Textures.finish);
            sprite.x = Number(x) * Config.PixelsPerMeter;
            sprite.y = Number(y) * Config.PixelsPerMeter;
            sprite.width = width * Config.PixelsPerMeter;
            sprite.height = height * Config.PixelsPerMeter;
            sprite.tint = color;
            levelContainers.finishTilesContainer.addChild(sprite);

            // Create a static body for the finish tile
            const finishBody = PhysicsUtils.createBoxBody(
                world, {
                    type: 'static',
                    position: new planck.Vec2(Number(x), Number(y)),
                    box: { width, height },
                    fixture: {
                        isSensor: true,
                        restitution: 0,
                        friction: 0,
                        userData: {
                            type: Config.Physics.Collision.typeFinish,
                        },
                        filterCategoryBits: Config.Physics.Collision.categoryFinish,
                        filterMaskBits: Config.Physics.Collision.categoryPlayer
                    }
                }
            );

            this.finishTiles.push({ body: finishBody, sprite });
        }

        // Randomly place torches in open spaces for the player to reach
        // TODO Lots of code duplication here that could be addressed
        const numTorches = Math.ceil(validSpaces.length * Config.TorchesDensity);
        for (let i = 0; i < numTorches; i++) {
            // Pick a random open space
            const [x, y] = validSpaces[Math.floor(Math.random() * validSpaces.length)].split(",");
            const width = Config.Torch.size;
            const height = Config.Torch.size;
            const color = Config.Torch.color;

            // Create a sprite for the finish tile
            const sprite = PIXI.Sprite.from(Config.Textures.torch);
            sprite.x = Number(x) * Config.PixelsPerMeter;
            sprite.y = Number(y) * Config.PixelsPerMeter;
            sprite.width = width * Config.PixelsPerMeter;
            sprite.height = height * Config.PixelsPerMeter;
            sprite.tint = color;
            
            // TODO Not showing sprite for torches, might want to reconsider
            //levelContainers.torchesContainer.addChild(sprite);

            this.torches.push({ sprite });
        }

        // Randomly place fuel tiles in open spaces for the player to reach
        // TODO Lots of code duplication here that could be addressed
        const numFuelTiles = Math.ceil(validSpaces.length * Config.FuelTileDensity);
        for (let i = 0; i < numFuelTiles; i++) {
            // Pick a random open space
            const [x, y] = validSpaces[Math.floor(Math.random() * validSpaces.length)].split(",");
            const width = Config.Fuel.size;
            const height = Config.Fuel.size;
            const color = Config.Fuel.color;

            // Create a sprite for the finish tile
            const sprite = PIXI.Sprite.from(Config.Textures.fuel);
            sprite.x = Number(x) * Config.PixelsPerMeter;
            sprite.y = Number(y) * Config.PixelsPerMeter;
            sprite.width = width * Config.PixelsPerMeter;
            sprite.height = height * Config.PixelsPerMeter;
            sprite.tint = color;
            levelContainers.fuelTilesContainer.addChild(sprite);

            // Create a static body for the finish tile
            const fuelBody = PhysicsUtils.createBoxBody(world, {
                position: new planck.Vec2(Number(x), Number(y)),
                box: { width, height },
                fixture: {
                    isSensor: true,
                    restitution: 0,
                    friction: 0,
                    userData: {
                        type: Config.Physics.Collision.typeFuel,
                        sprite,
                        index: i
                    },
                    filterCategoryBits: Config.Physics.Collision.categoryFuel,
                    filterMaskBits: Config.Physics.Collision.categoryPlayer
                }
            });
            this.fuelTiles.push({ body: fuelBody, sprite });
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
     * Returns all torch entities in the level.
     * @returns {Entity[]} Array of torch entities.
     */
    getTorches(): Entity[] {
        return this.torches;
    }

    /**
     * Returns all fuel tile entities in the level.
     * @returns {Entity[]} Array of fuel tile entities.
     */
    getFuelTiles(): Entity[] {
        return this.fuelTiles;
    }

    /**
     * Updates all entities in the level (e.g., for animation or effects).
     * Currently a stub; expand as needed for future features.
     */
    update() {
        // Placeholder for future logic (e.g., animated tiles)
    }
}
