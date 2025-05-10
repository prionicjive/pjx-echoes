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
import { Point, Segment } from '../utils/types';
import { EntityUtils } from '../utils/EntityUtils';
import { Anti } from '../entities/Anti';
import { FinishArea } from '../entities/FinishArea';
import { Torch } from '../entities/Torch';
import { Wall } from '../entities/Wall';
import { Sentry } from '../entities/Sentry';
import { EntityType, EntityUserData } from '../entities/types';
import { BaseEntity } from '../entities/BaseEntity';
import { Player } from '../entities/Player';
import { LevelContext } from './LevelContext';

export type LevelContainers = {
    levelGeometryContainer: PIXI.Container;
    preEntitiesContainer: PIXI.Container;
    entitiesContainer: PIXI.Container;
}

/**
 * The Level class generates and manages all static entities for a level,
 * including walls and finish tiles. Handles conversion from map data to
 * physics and rendering objects.
 */
export class Level implements LevelContext {
    private player: Player | null;
    private walls: Wall[];
    private finishAreas: FinishArea[];
    private torches: Torch[];
    private antiEntities: Anti[];
    private sentries: Sentry[];
    private edgesList: Segment[];
    private dimensions: { width: number; height: number };

    constructor(
        world: planck.World, 
        containers: LevelContainers, 
        levelMap: number[][], 
        validSpaces: string[], 
        edgesList: Segment[]
    ) {
        // Store the edges list for later use
        this.edgesList = edgesList;

        // Store the dimensions of the level
        this.dimensions = {
            width: levelMap[0].length,
            height: levelMap.length
        };

        // Store references to the various level entities
        this.player = null;
        this.walls = [];
        this.finishAreas = [];
        this.torches = [];
        this.antiEntities = [];
        this.sentries = [];

        // Create the edges collision data and (optionally) render it
        this.createLevelEdges(world, containers.levelGeometryContainer);
        // Create each wall (If we determine that to be the case)
        if (Config.Debug.drawWalls) {
            this.walls = this.createWalls(levelMap, containers.levelGeometryContainer);
        }

        // Create the player
        this.player = this.createPlayer(validSpaces, containers, world);        
        
        // Create the other various entities
        this.finishAreas = this.createFinishAreas(validSpaces, containers, world);
        this.torches = this.createTorches(validSpaces, containers, world);
        this.antiEntities = this.createAntiEntities(validSpaces, containers, world);
        this.sentries = this.createSentries(validSpaces, containers, world);
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
                        },
                        levelContext: this
                    });

                    // Store wall entity for future reference
                    entitiesToReturn.push(entity);
                }
            }
        }

        return entitiesToReturn;
    }


    private createPlayer(
        validSpaces: string[],
        containers: LevelContainers,
        world: planck.World
    ) {
        const entity = new Player({
            world,
            spawnPoint: this.findRandomValidPoint(validSpaces), 
            containers: {
                containerForEntity: containers.entitiesContainer,
                containerForParticleEffects: containers.preEntitiesContainer 
            },
            levelContext: this
        });

        return entity;
    }

    private createTorches(
        validSpaces: string[], 
        containers: LevelContainers, 
        world: planck.World
    ) {
        const torchesToReturn = [];
        
        // Randomly place torches in open spaces for the player to reach
        const numTorches = Math.ceil(validSpaces.length * Config.TorchChance);
        for (let i = 0; i < numTorches; i++) {
            const entity = new Torch({
                world,
                spawnPoint: this.findRandomValidPoint(validSpaces),
                containers: { 
                    containerForEntity: containers.entitiesContainer,
                    containerForParticleEffects: containers.preEntitiesContainer 
                },
                levelContext: this
            });

            torchesToReturn.push(entity);
        }

        return torchesToReturn;
    }

    private createAntiEntities(
        validSpaces: string[], 
        containers: LevelContainers, 
        world: planck.World
    ) {
        const antiEntitiesToReturn = [];
        
        // Randomly place anti entities in open spaces for the player to reach
        const numAntiEntities = Math.ceil(validSpaces.length * Config.AntiChance);
        for (let i = 0; i < numAntiEntities; i++) {
            const anti = new Anti({
                world,
                spawnPoint: this.findRandomValidPoint(validSpaces),
                containers: { containerForEntity: containers.entitiesContainer },
                levelContext: this
            });

            antiEntitiesToReturn.push(anti);
        }

        return antiEntitiesToReturn;
    }

    private createFinishAreas(
        validSpaces: string[], 
        containers: LevelContainers, 
        world: planck.World
    ) {
        const finishAreasToReturn = [];
        
        // Randomly place finish areas in open spaces for the player to reach
        const numFinishAreas = Math.ceil(validSpaces.length * Config.FinishAreaChance);
        for (let i = 0; i < numFinishAreas; i++) {
            const entity = new FinishArea({
                world,
                spawnPoint: this.findRandomValidPoint(validSpaces),
                containers: { containerForEntity: containers.entitiesContainer },
                levelContext: this
            });

            finishAreasToReturn.push(entity);
        }

        return finishAreasToReturn;
    }

    private createSentries(
        validSpaces: string[], 
        containers: LevelContainers, 
        world: planck.World,
    ) {
        const sentriesToReturn = [];
        
        // Randomly place sentry entities in open spaces for the player to reach
        const numSentries = Math.ceil(validSpaces.length * Config.SentryChance);
        for (let i = 0; i < numSentries; i++) {
            // Pick a random open space
            const initialVelocity = PhysicsUtils.randomUnitVector().mul(Config.Sentry.maxSpeed);
            const sentry = new Sentry({
                world,  
                spawnPoint: this.findRandomValidPoint(validSpaces), 
                containers: {
                    containerForEntity: containers.entitiesContainer,
                    containerForParticleEffects: containers.preEntitiesContainer,
                },
                initialVelocity,
                levelContext: this
            });

            sentriesToReturn.push(sentry);
        }

        return sentriesToReturn;
    }

    /**
     * Updates all entities in the level (e.g., for animation or effects).
     */
    update(deltaTime: number) {
        // Combine all entities into a single array
        const allEntities = [
            this.player!,
            ...this.walls, 
            ...this.torches, 
            ...this.antiEntities, 
            ...this.finishAreas,
            ...this.sentries
        ];
        
        // Update each entity
        allEntities.forEach((entity) => {
            entity.update(deltaTime);
        });
    }

    gentlyRemoveEntity(type: EntityType, entity: BaseEntity) {
        // Gently remove the entity
        entity.gentlyRemove();

        // Now, remove the entity from the correct array
        switch (type) {
            case Config.Wall.type:
                this.walls.splice(this.walls.indexOf(entity as Wall), 1);
                break;
            case Config.Torch.type:
                this.torches.splice(this.torches.indexOf(entity as Torch), 1);
                break;
            case Config.Anti.type:
                this.antiEntities.splice(this.antiEntities.indexOf(entity as Anti), 1);
                break;
            case Config.FinishArea.type:
                this.finishAreas.splice(this.finishAreas.indexOf(entity as FinishArea), 1);
                break;
            case Config.Sentry.type:
                this.sentries.splice(this.sentries.indexOf(entity as Sentry), 1);
                break;
        }
    }

    destroy() {
        // Destroy all entities
        this.player?.destroy();

        this.walls.forEach((wall) => {
            wall.destroy();
        });
        this.walls = [];

        this.torches.forEach((torch) => {
            torch.destroy();
        });
        this.torches = [];

        this.antiEntities.forEach((anti) => {
            anti.destroy();
        });
        this.antiEntities = [];

        this.finishAreas.forEach((finishArea) => {
            finishArea.destroy();
        });
        this.finishAreas = [];

        this.sentries.forEach((sentry) => {
            sentry.destroy();
        });
        this.sentries = [];
    }

    getPlayer(): Player {
        return this.player!;
    }

    getDimensions(): { width: number; height: number } {
        return this.dimensions;
    }
    
    getWidth(): number {
        return this.dimensions.width;
    }

    getHeight(): number {
        return this.dimensions.height;
    }

    getEdgesList(): Segment[] {
        return this.edgesList;
    }

    private findRandomValidPoint(validSpaces: string[]): Point {
        const randomIndex = Math.floor(Math.random() * validSpaces.length);
        const [validX, validY]: string[] = validSpaces[randomIndex].split(",");
        return { x: Number(validX), y: Number(validY) };
    }
}
