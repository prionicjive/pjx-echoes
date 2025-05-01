// Level.ts
/**
 * Handles procedural level generation, wall and finish tile creation, and rendering.
 * Converts a numeric map into physics bodies and sprites for gameplay.
 *
 * @module Level
 */

import { Config } from './Config';
import { PhysicsUtils } from '../utils/PhysicsUtils';
import { Entity } from '../entities/types';
import * as planck from 'planck';
import * as PIXI from 'pixi.js';
import { Segment } from '../utils/types';
import { Light, StaticLight } from './Light';
import { EntityFactory } from '../entities/EntityFactory';
import { EntityUtils } from '../utils/EntityUtils';
import { EntityType } from '../entities/types';
import { RenderableGeometry } from './types';

/**
 * The Level class generates and manages all static entities for a level,
 * including walls and finish tiles. Handles conversion from map data to
 * physics and rendering objects.
 */
export class Level {
    private edgesGeometry: RenderableGeometry;
    private walls: Entity[];
    private finishTiles: Entity[];
    private torchTiles: Entity[];
    private fuelTiles: Entity[];
    private lights: Light[];
    private edgesList: Segment[];

    /**
     * Creates a new Level instance, generating walls and finish tiles from the given map.
    *
     * @param {planck.World} world - The Planck.js world to add walls and tiles to.
     * @param {PIXI.Container} containers - Where to add sprites for the various level entities (And edge geometry) for rendering go.
     * @param {number[][]} levelMap - 2D array representing the map layout (1 = wall, 0 = open).
     * @param {string[]} validSpaces - Array of valid open tile positions as "x,y" strings.
     * @param {Segment[]} edgesList - List of valid edges.
     */
    constructor(world: planck.World, container: PIXI.Container, levelMap: number[][], validSpaces: string[], edgesList: Segment[]) {
        // Store references to the various level entities
        this.walls = [];
        this.finishTiles = [];
        this.torchTiles = [];
        this.fuelTiles = [];
        this.lights = [];

        this.edgesList = edgesList;
        // Create the edges collision data and (optionally) render it
        this.edgesGeometry = this.createLevelEdges(world, container);

        // Create sprites for each wall (If we determine that to be the case)
        if (Config.Debug.drawWalls) {
            this.createWalls(levelMap, container);
        }
        
        this.finishTiles = this.createFinishTiles(validSpaces, container, world);
        this.torchTiles = this.createTorchTiles(validSpaces, container);
        this.fuelTiles = this.createFuelTiles(validSpaces, container, world);
    }

    createLevelEdges(world: planck.World, container: PIXI.Container): RenderableGeometry {
        let edgeGraphics: PIXI.Graphics | null = null;
        
        if (Config.Debug.drawEdges) {
            // Also, while iterating, draw the edges of the walls
            edgeGraphics = new PIXI.Graphics();
            
            for (const edge of this.edgesList){
                edgeGraphics.moveTo(edge.a.x * Config.PixelsPerMeter, edge.a.y * Config.PixelsPerMeter);
                edgeGraphics.lineTo(edge.b.x * Config.PixelsPerMeter, edge.b.y * Config.PixelsPerMeter);
                edgeGraphics.stroke({width:Config.Edges.thickness, color: Config.Edges.color});
            }
            
            // Add the renderer edges to the proper container
            container.addChild(edgeGraphics);
        }

        // Create single body and multiple fixtures for all the edges of the level
        const id = EntityUtils.generateRandomId(Config.Edges.type);

        const body = PhysicsUtils.createLevelEdgesBody(world, { 
            edges: this.edgesList, 
            edgeFixture: {
                restitution: 0.95,
                friction: 0,
                filterCategoryBits: Config.Physics.Collision.categoryEdge,
                filterMaskBits: Config.Physics.Collision.categoryPlayer
            } 
        });

        // Set user data for the body in a self-referential way
        body.setUserData({ 
            type: Config.Edges.type,
            id,
            graphics: edgeGraphics,
            body
        });

        return { id, body, graphics: edgeGraphics }
    }

    createWalls(levelMap: number[][], container: PIXI.Container): Entity[] {
        const entitiesToReturn: Entity[] = [];

        // Add walls from the map (1 = wall)
        for (let y = 0; y < levelMap.length; y++) {
            for (let x = 0; x < levelMap[y].length; x++) {
                if (levelMap[y][x] === 1) {
                    const wall = EntityFactory.create({
                        id: EntityUtils.generateRandomId(Config.Wall.type),
                        type: Config.Wall.type as EntityType,
                        x,
                        y,
                        width: Config.Wall.size,
                        height: Config.Wall.size,
                    });
                    container.addChild(wall.sprite);

                    // Store wall entity for future reference
                    entitiesToReturn.push(wall);
                }
            }
        }

        return entitiesToReturn;
    }

    createFinishTiles(validSpaces: string[], container: PIXI.Container, world: planck.World) {
        const entitiesToReturn: Entity[] = [];
       
        // Randomly place finish tiles in open spaces for the player to reach
        const numFinishTiles = Math.ceil(validSpaces.length * Config.FinishTilesDensity);
        for (let i = 0; i < numFinishTiles; i++) {
            // Pick a random open space
            const [x, y] = validSpaces[Math.floor(Math.random() * validSpaces.length)].split(",");

            const finishTile = EntityFactory.create({
                id: EntityUtils.generateRandomId(Config.Finish.type),
                type: Config.Finish.type as EntityType,
                x: Number(x),
                y: Number(y),
                width: Config.Finish.size,
                height: Config.Finish.size,
            }, world) as Entity;

            container.addChild(finishTile.sprite);

            entitiesToReturn.push(finishTile);

            // Set up lights for finish tiles
            const finishLight = new StaticLight({
                x: finishTile.sprite.x / Config.PixelsPerMeter + Config.Wall.size / 2,
                y: finishTile.sprite.y / Config.PixelsPerMeter + Config.Wall.size / 2
            },
            this.edgesList,
            Config.FinishLight);

            finishLight.entityId = finishTile.id;

            this.lights.push(finishLight);
        }
        
        return entitiesToReturn;
    }

    createTorchTiles(validSpaces: string[], container: PIXI.Container): Entity[] {
        const entitiesToReturn: Entity[] = [];

        // Randomly place torches in open spaces for the player to reach
        const numTorches = Math.ceil(validSpaces.length * Config.TorchesDensity);
        for (let i = 0; i < numTorches; i++) {
            // Pick a random open space
            const [x, y] = validSpaces[Math.floor(Math.random() * validSpaces.length)].split(",");

            const torch = EntityFactory.create({
                type: Config.Torch.type as EntityType,
                id: EntityUtils.generateRandomId(Config.Torch.type),
                x: Number(x),
                y: Number(y),
                width: Config.Torch.size,
                height: Config.Torch.size,
            });
            container.addChild(torch.sprite);

            entitiesToReturn.push(torch);

            // Set up torch lights
            const torchLight = new StaticLight({
                x: torch.sprite.x / Config.PixelsPerMeter + Config.Torch.size / 2,
                y: torch.sprite.y / Config.PixelsPerMeter + Config.Torch.size / 2
            }, this.edgesList, Config.TorchLight);
            
            torchLight.entityId = torch.id;
            
            this.lights.push(torchLight);
        }

        return entitiesToReturn;
    }

    createFuelTiles(validSpaces: string[], container: PIXI.Container, world: planck.World): Entity[] {
        const entitiesToReturn: Entity[] = [];

        // Randomly place fuel tiles in open spaces for the player to reach
        const numFuelTiles = Math.ceil(validSpaces.length * Config.FuelTileDensity);
        for (let i = 0; i < numFuelTiles; i++) {
            // Pick a random open space
            const [x, y] = validSpaces[Math.floor(Math.random() * validSpaces.length)].split(",");
            
            const fuel = EntityFactory.create({
                id: EntityUtils.generateRandomId(Config.Fuel.type),
                type: Config.Fuel.type as EntityType,
                x: Number(x),
                y: Number(y),
                width: Config.Fuel.size,
                height: Config.Fuel.size,
            }, world);

            container.addChild(fuel.sprite);

            entitiesToReturn.push(fuel as Entity);

            // Set up fuel lights
            const fuelLight = new StaticLight({
                x: fuel.sprite.x / Config.PixelsPerMeter + Config.Fuel.size / 2,
                y: fuel.sprite.y / Config.PixelsPerMeter + Config.Fuel.size / 2
            }, this.edgesList, Config.FuelLight);

            fuelLight.entityId = fuel.id;

            this.lights.push(fuelLight);
        }
        
        return entitiesToReturn;
    }

    getEdgesGeometry(): RenderableGeometry {
        return this.edgesGeometry;
    }

    getWalls(): Entity[] {
        return this.walls;
    }

    /**
     * Returns all finish tile entities in the level.
     * @returns {Entity[]} Array of finish tile entities.
     */
    getFinishTiles(): Entity[] {
        return this.finishTiles;
    }

    /**
     * Returns all torch entities in the level.
     * @returns {Entity[]} Array of torch entities.
     */
    getTorchTiles(): Entity[] {
        return this.torchTiles;
    }

    /**
     * Returns all fuel tile entities in the level.
     * @returns {Entity[]} Array of fuel tile entities.
     */
    getFuelTiles(): Entity[] {
        return this.fuelTiles;
    }

    getLights(): Light[] {
        return this.lights;
    }

    /**
     * Updates all entities in the level (e.g., for animation or effects).
     * Currently a stub; expand as needed for future features.
     */
    update() {
        // Placeholder for future logic (e.g., animated tiles)
    }
}
