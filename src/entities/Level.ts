// Level.ts
/**
 * Handles procedural level generation, wall and finish tile creation, and rendering.
 * Converts a numeric map into physics bodies and sprites for gameplay.
 *
 * @module Level
 */

import { Config } from '../core/Config';
import { PhysicsUtils } from '../utils/PhysicsUtils';
import { Entity, PhysicalEntity, GraphicalPhysicsEntity } from './types';
import * as planck from 'planck';
import * as PIXI from 'pixi.js';
import { Segment } from '../utils/types';
import { SpriteUtils } from '../utils/SpriteUtils';
import { EntityFactory } from './EntityFactory';


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
    private edgesEntity: GraphicalPhysicsEntity;
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
        // Store references to the various level entities
        this.walls = [];
        this.finishTiles = [];
        this.torches = [];
        this.fuelTiles = [];

        // Create the edges collision data and (optionally) render it
        this.edgesEntity = this.createEdgesEntity(world, levelContainers, edgesList);

        // Create sprites for each wall (If we determine that to be the case)
        if (Config.Debug.drawWalls) {
            this.createWalls(levelMap, levelContainers);
        }
        
        // Create finish tiles
        this.finishTiles = this.createFinishTiles(validSpaces, levelContainers, world);
        
        // Create torches
        this.torches = this.createTorches(validSpaces, levelContainers);
        
        // Create fuel tiles
        this.fuelTiles = this.createFuelTiles(validSpaces, levelContainers, world);
    }

    createEdgesEntity(world: planck.World, levelContainers: LevelContainers, edgesList: Segment[]): GraphicalPhysicsEntity {
        let edgeGraphics: PIXI.Graphics | null = null;
        
        if (Config.Debug.drawEdges) {
            // Also, while iterating, draw the edges of the walls
            edgeGraphics = new PIXI.Graphics();
            
            for (const edge of edgesList){
                edgeGraphics.moveTo(edge.a.x * Config.PixelsPerMeter, edge.a.y * Config.PixelsPerMeter);
                edgeGraphics.lineTo(edge.b.x * Config.PixelsPerMeter, edge.b.y * Config.PixelsPerMeter);
                edgeGraphics.stroke({width:Config.Edges.thickness, color: Config.Edges.color});
            }
            
            // Add the renderer edges to the proper container
            levelContainers.edgesContainer.addChild(edgeGraphics);
        }

        // Create single body and multiple fixtures for all the edges of the level
        const body = PhysicsUtils.createLevelEdgesBody(world, { 
            edges: edgesList, 
            edgeFixture: {
                restitution: 0.95,
                friction: 0,
                userData: { type: Config.Physics.Collision.typeWall },
                filterCategoryBits: Config.Physics.Collision.categoryWall,
                filterMaskBits: Config.Physics.Collision.categoryPlayer
            } 
        });

        return { body, graphics: edgeGraphics }
    }

    createWalls(levelMap: number[][], levelContainers: LevelContainers): Entity[] {
        const entitiesToReturn: Entity[] = [];

        // Add walls from the map (1 = wall)
        for (let y = 0; y < levelMap.length; y++) {
            for (let x = 0; x < levelMap[y].length; x++) {
                if (levelMap[y][x] === 1) {
                    const wall = EntityFactory.create({
                        type: 'wall',
                        x,
                        y,
                        width: Config.Wall.size,
                        height: Config.Wall.size,
                    });
                    levelContainers.wallsContainer.addChild(wall.sprite);

                    // Store wall entity for future reference
                    entitiesToReturn.push(wall);
                }
            }
        }

        return entitiesToReturn;
    }

    createFinishTiles(validSpaces: string[], levelContainers: LevelContainers, world: planck.World) {
        const entitiesToReturn: PhysicalEntity[] = [];
       
        // Randomly place finish tiles in open spaces for the player to reach
        const numFinishTiles = Math.ceil(validSpaces.length * Config.FinishTilesDensity);
        for (let i = 0; i < numFinishTiles; i++) {
            // Pick a random open space
            const [x, y] = validSpaces[Math.floor(Math.random() * validSpaces.length)].split(",");

            const finishTile = EntityFactory.create({
                type: 'finish',
                x: Number(x),
                y: Number(y),
                width: Config.Finish.size,
                height: Config.Finish.size,
            }, world);

            levelContainers.finishTilesContainer.addChild(finishTile.sprite);

            entitiesToReturn.push(finishTile as PhysicalEntity);
        }

        return entitiesToReturn;
    }

    createTorches(validSpaces: string[], levelContainers: LevelContainers): Entity[] {
        const entitiesToReturn: Entity[] = [];

        // Randomly place torches in open spaces for the player to reach
        const numTorches = Math.ceil(validSpaces.length * Config.TorchesDensity);
        for (let i = 0; i < numTorches; i++) {
            // Pick a random open space
            const [x, y] = validSpaces[Math.floor(Math.random() * validSpaces.length)].split(",");

            const torch = EntityFactory.create({
                type: 'torch',
                x: Number(x),
                y: Number(y),
                width: Config.Torch.size,
                height: Config.Torch.size,
            });
            levelContainers.torchesContainer.addChild(torch.sprite);

            entitiesToReturn.push(torch);
        }

        return entitiesToReturn;
    }

    createFuelTiles(validSpaces: string[], levelContainers: LevelContainers, world: planck.World): PhysicalEntity[] {
        const entitiesToReturn: PhysicalEntity[] = [];

        // Randomly place fuel tiles in open spaces for the player to reach
        const numFuelTiles = Math.ceil(validSpaces.length * Config.FuelTileDensity);
        for (let i = 0; i < numFuelTiles; i++) {
            // Pick a random open space
            const [x, y] = validSpaces[Math.floor(Math.random() * validSpaces.length)].split(",");
            
            const fuel = EntityFactory.create({
                type: 'fuel',
                x: Number(x),
                y: Number(y),
                width: Config.Fuel.size,
                height: Config.Fuel.size,
            }, world);

            levelContainers.fuelTilesContainer.addChild(fuel.sprite);

            entitiesToReturn.push(fuel as PhysicalEntity);
        }

        return entitiesToReturn;
    }

    getEdgesEntity(): GraphicalPhysicsEntity {
        return this.edgesEntity;
    }

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
