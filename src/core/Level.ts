// Level.ts
/**
 * Handles procedural level generation, wall and finish tile creation, and rendering.
 * Converts a numeric map into physics bodies and sprites for gameplay.
 *
 * @module Level
 */

import { Config } from '../config/Config';
import { PhysicsUtils } from '../utils/PhysicsUtils';
import * as planck from 'planck';
import * as PIXI from 'pixi.js';
import { Segment } from '../utils/types';
import { Light } from './Light';
import { EntityUtils } from '../utils/EntityUtils';
import { RenderableGeometry } from './types';
import { Anti } from '../entities/Anti';
import { Finish } from '../entities/Finish';
import { Torch } from '../entities/Torch';
import { Wall } from '../entities/Wall';
import { EntityUserData } from '../entities/types';

type LevelContainers = {
    levelGeometryContainer: PIXI.Container;
    preEntitiesContainer: PIXI.Container;
    entitiesContainer: PIXI.Container;
}

/**
 * The Level class generates and manages all static entities for a level,
 * including walls and finish tiles. Handles conversion from map data to
 * physics and rendering objects.
 */
export class Level {
    private edgesGeometry!: RenderableGeometry;
    private walls: Wall[];
    private finishTiles: Finish[];
    private torchEntities: Torch[];
    private antiEntities: Anti[];
    private lights: Light[];
    private edgesList: Segment[];

    constructor(world: planck.World, containers: LevelContainers, levelMap: number[][], validSpaces: string[], edgesList: Segment[]) {
        // Store references to the various level entities
        this.walls = [];
        this.finishTiles = [];
        this.torchEntities = [];
        this.antiEntities = [];
        this.lights = [];

        this.edgesList = edgesList;
        // Create the edges collision data and (optionally) render it
        this.edgesGeometry = this.createLevelEdges(world, containers.levelGeometryContainer);

        // Create each wall (If we determine that to be the case)
        if (Config.Debug.drawWalls) {
            this.walls = this.createWalls(levelMap, containers.levelGeometryContainer);
        }
        
        // Create the other various entities
        this.torchEntities = this.createTorchEntities(validSpaces, containers, world);
        this.finishTiles = this.createFinishEntities(validSpaces, containers, world);
        this.antiEntities = this.createAntiEntities(validSpaces, containers, world);
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
        } as EntityUserData);

        return { id, body, graphics: edgeGraphics }
    }

    private createWalls(levelMap: number[][], container: PIXI.Container) {
        const entitiesToReturn = [];
    
        // Add walls from the map (1 = wall)
        for (let y = 0; y < levelMap.length; y++) {
            for (let x = 0; x < levelMap[y].length; x++) {
                if (levelMap[y][x] === 1) {
                    const entity = new Wall({
                        spawnPoint: { x: Number(x), y: Number(y) },
                        containers: { 
                            containerForEntity: container,
                        }
                    });

                    // Store wall entity for future reference
                    entitiesToReturn.push(entity);
                }
            }
        }

        return entitiesToReturn;
    }

    private createTorchEntities(validSpaces: string[], containers: LevelContainers, world: planck.World) {
        const entitiesToReturn = [];
        
        // Randomly place torch entities in open spaces for the player to reach
        const numTorchEntities = Math.ceil(validSpaces.length * Config.TorchChance);
        for (let i = 0; i < numTorchEntities; i++) {
            // Pick a random open space
            const [x, y] = validSpaces[Math.floor(Math.random() * validSpaces.length)].split(",");

            const entity = new Torch({
                world,
                spawnPoint: { x: Number(x), y: Number(y) },
                containers: { 
                    containerForEntity: containers.entitiesContainer,
                    containerForParticleEffects: containers.preEntitiesContainer 
                },
                edgesList: this.edgesList
            });

            entitiesToReturn.push(entity);

            // Add light if it exists
            if (entity.light) {
                this.lights.push(entity.light);
            }
        }

        return entitiesToReturn;
    }

    private createAntiEntities(validSpaces: string[], container: LevelContainers, world: planck.World) {
        const entitiesToReturn = [];
        
        // Randomly place anti entities in open spaces for the player to reach
        const numAntiEntities = Math.ceil(validSpaces.length * Config.AntiChance);
        for (let i = 0; i < numAntiEntities; i++) {
            // Pick a random open space
            const [x, y] = validSpaces[Math.floor(Math.random() * validSpaces.length)].split(",");

            const entity = new Anti({
                world,
                spawnPoint: { x: Number(x), y: Number(y) },
                containers: { containerForEntity: container.entitiesContainer },
                edgesList: this.edgesList
            });

            entitiesToReturn.push(entity);

            // Add light if it exists
            if (entity.light) {
                this.lights.push(entity.light);
            }
        }

        return entitiesToReturn;
    }

    private createFinishEntities(validSpaces: string[], container: LevelContainers, world: planck.World) {
        const entitiesToReturn = [];
        
        // Randomly place finish entities in open spaces for the player to reach
        const numFinishEntities = Math.ceil(validSpaces.length * Config.FinishChance);
        for (let i = 0; i < numFinishEntities; i++) {
            // Pick a random open space
            const [x, y] = validSpaces[Math.floor(Math.random() * validSpaces.length)].split(",");

            const entity = new Finish({
                world,
                spawnPoint: { x: Number(x), y: Number(y) },
                containers: { containerForEntity: container.entitiesContainer },
                edgesList: this.edgesList
            });

            entitiesToReturn.push(entity);

            // Add light if it exists
            if (entity.light) {
                this.lights.push(entity.light);
            }
        }

        return entitiesToReturn;
    }

    getEdgesGeometry(): RenderableGeometry {
        return this.edgesGeometry;
    }

    getWalls(): Wall[] {
        return this.walls;
    }

    getFinishTiles(): Finish[] {
        return this.finishTiles;
    }

    getTorchTiles(): Torch[] {
        return this.torchEntities;
    }

    getAntiTiles(): Anti[] {
        return this.antiEntities;
    }

    getLights(): Light[] {
        return this.lights;
    }

    /**
     * Updates all entities in the level (e.g., for animation or effects).
     */
    update(deltaTime: number) {
        this.torchEntities.forEach((torch) => {
            torch.update(deltaTime);
        });
        this.antiEntities.forEach((anti) => {
            anti.update(deltaTime);
        });
    }
}
