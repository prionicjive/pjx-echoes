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
import { Light, LightOptions, StaticLight } from './Light';
import { EntityFactory } from '../entities/EntityFactory';
import { EntityUtils } from '../utils/EntityUtils';
import { EntityType } from '../entities/types';
import { RenderableGeometry } from './types';

type LevelContainers = {
    levelGeometryContainer: PIXI.Container;
    entitiesContainer: PIXI.Container;
}

/**
 * The Level class generates and manages all static entities for a level,
 * including walls and finish tiles. Handles conversion from map data to
 * physics and rendering objects.
 */
export class Level {
    private edgesGeometry!: RenderableGeometry;
    private walls: Entity[];
    private finishTiles: Entity[];
    private torchTiles: Entity[];
    private fuelTiles: Entity[];
    private lights: Light[];
    private edgesList: Segment[];

    constructor(world: planck.World, containers: LevelContainers, levelMap: number[][], validSpaces: string[], edgesList: Segment[]) {
        // Store references to the various level entities
        this.walls = [];
        this.finishTiles = [];
        this.torchTiles = [];
        this.fuelTiles = [];
        this.lights = [];

        this.edgesList = edgesList;
        // Create the edges collision data and (optionally) render it
        this.edgesGeometry = this.createLevelEdges(world, containers.levelGeometryContainer);

        // Create each wall (If we determine that to be the case)
        if (Config.Debug.drawWalls) {
            this.walls = this.createWalls(levelMap, containers.levelGeometryContainer);
        }
        
        // Create the other various entities
        this.finishTiles = this.createTilesByType(
            Config.Finish.type,
            validSpaces, 
            Config.FinishTilesDensity,
            containers.entitiesContainer, 
            world,
            {...Config.FinishLight}
        );
        this.torchTiles = this.createTilesByType(
            Config.Torch.type,
            validSpaces, 
            Config.TorchesDensity,
            containers.entitiesContainer, 
            world,
            {...Config.TorchLight}
        );
        this.fuelTiles = this.createTilesByType(
            Config.Fuel.type,
            validSpaces, 
            Config.FuelTileDensity,
            containers.entitiesContainer, 
            world,
            {...Config.FuelLight}
        );;
    }

    private createLevelEdges(world: planck.World, container: PIXI.Container) {
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
                restitution: Config.Physics.Wall.restitution,
                friction: 0,
                filterCategoryBits: Config.Physics.Collision.categoryEdge,
                filterMaskBits: Config.Physics.Collision.categoryPlayer | Config.Physics.Collision.categorySentry
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

    private createWalls(levelMap: number[][], container: PIXI.Container) {
        const entitiesToReturn = [];
    
        // Add walls from the map (1 = wall)
        for (let y = 0; y < levelMap.length; y++) {
            for (let x = 0; x < levelMap[y].length; x++) {
                if (levelMap[y][x] === 1) {
                    const wall = EntityFactory.create({
                        id: EntityUtils.generateRandomId(Config.Wall.type),
                        type: Config.Wall.type as EntityType,
                        x,
                        y,
                        width: 1,
                        height: 1,
                    });
                    container.addChild(wall.sprite);

                    // Store wall entity for future reference
                    entitiesToReturn.push(wall);
                }
            }
        }

        return entitiesToReturn;
    }

    private createTilesByType(
        type: string,
        validSpaces: string[], 
        density: number,
        container: PIXI.Container, 
        world: planck.World,
        lightOptions: LightOptions | null = null
    ): Entity[] {
        const entitiesToReturn: Entity[] = [];
    
        // Randomly place entities in open spaces for the player to reach
        const numFinishTiles = Math.ceil(validSpaces.length * density);
        for (let i = 0; i < numFinishTiles; i++) {
            // Pick a random open space
            const [x, y] = validSpaces[Math.floor(Math.random() * validSpaces.length)].split(",");

            const entity = EntityFactory.create({
                id: EntityUtils.generateRandomId(type),
                type: type as EntityType,
                x: Number(x),
                y: Number(y),
                width: 1,
                height: 1,
            }, world) as Entity;

            container.addChild(entity.sprite);

            entitiesToReturn.push(entity);

            if (lightOptions) {
                // Set up light
                const lightToCreate = new StaticLight({
                    x: entity.sprite.x / Config.PixelsPerMeter + 0.5,
                    y: entity.sprite.y / Config.PixelsPerMeter + 0.5
                },
                this.edgesList,
                lightOptions,
                entity.id);

                this.lights.push(lightToCreate);
            }
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
