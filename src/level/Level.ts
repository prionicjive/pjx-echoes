// Level.ts
/**
 * Handles procedural level generation, wall and exit tile creation, and rendering.
 * Converts a numeric map into physics bodies and sprites for gameplay.
 *
 * @module Level
 */

import * as PIXI from 'pixi.js';
import * as planck from 'planck';
import { Config } from '../config/Config';
import { Anti } from '../entities/Anti';
import { BaseEntity, EntityUserData } from '../entities/BaseEntity';
import { Exit } from '../entities/Exit';
import { Player } from '../entities/Player';
import { Sentry } from '../entities/Sentry';
import { Torch } from '../entities/Torch';
import { EntityType } from '../entities/types';
import { Wall } from '../entities/Wall';
import { EntityUtils } from '../utils/EntityUtils';
import { PhysicsUtils } from '../utils/PhysicsUtils';
import { Point, Segment } from '../utils/types';
import { LevelContext } from './LevelContext';
import { LevelSkeleton } from './LevelSkeleton';

export interface LevelOptions {
    physicsWorld: planck.World;
    containers: LevelContainers;
    edgesList: Segment[];
    entitiesOptions: LevelSkeleton;
}

export interface LevelContainers {
    levelGeometryContainer: PIXI.Container;
    preEntitiesContainer: PIXI.Container;
    entitiesContainer: PIXI.Container;
}

/**
 * The Level class generates and manages all static entities for a level,
 * including walls and exit tiles. Handles conversion from map data to
 * physics and rendering objects.
 */
export class Level implements LevelContext {
    private player: Player | null;
    private walls: Wall[];
    private exits: Exit[];
    private torches: Torch[];
    private antiEntities: Anti[];
    private sentries: Sentry[];
    private edgesList: Segment[];
    private dimensions: { width: number; height: number };
    private physicsWorld: planck.World;

    constructor(
        options: LevelOptions
    ) {
        // Store LevelContext related things
        this.edgesList = options.edgesList;
        this.physicsWorld = options.physicsWorld;

        // Store the dimensions of the level
        this.dimensions = {...options.entitiesOptions.dimensions};

        // Store references to the various level entities
        this.player = null;
        this.walls = [];
        this.exits = [];
        this.torches = [];
        this.antiEntities = [];
        this.sentries = [];

        // Create the edges collision data and (optionally) render it
        this.createLevelEdges(options.physicsWorld, options.containers.levelGeometryContainer);

        // Create each wall (If we determine that to be the case)
        if (Config.Debug.drawWalls) {
            this.walls = this.createWalls(
                [...options.entitiesOptions.wallPositions],
                options.containers.levelGeometryContainer
            );
        }

        // Create the player
        this.player = this.createPlayer(
            {...options.entitiesOptions.playerSpawnPosition},
            options.containers
        );        
        
        // Create the other various entities
        this.exits = this.createExits(
            [...options.entitiesOptions.exitPositions], 
            options.containers
        );

        this.torches = this.createTorches(
            [...options.entitiesOptions.torchPositions], 
            options.containers);

        this.antiEntities = this.createAntiEntities(
            [...options.entitiesOptions.antiPositions], 
            options.containers
        );
        
        this.sentries = this.createSentries(
            [...options.entitiesOptions.sentryPositions], 
            options.containers
        );
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

    private createWalls(positions: Point[], container: PIXI.Container): Wall[] {
        const walls: Wall[] = [];
        
        for (const position of positions) {
            const entity = new Wall({
                spawnPoint: {...position},
                containers: { 
                    containerForEntity: container,
                }
            });

            walls.push(entity);
        }

        return walls;
    }

    private createPlayer(
        spawnPoint: Point,
        containers: LevelContainers
    ): Player {
        const entity = new Player({
            spawnPoint: {...spawnPoint}, 
            containers: {
                containerForEntity: containers.entitiesContainer,
                containerForParticleEffects: containers.preEntitiesContainer 
            },
            levelContext: this
        });

        return entity;
    }

    private createExits(
        positions: Point[], 
        containers: LevelContainers
    ): Exit[] {
        const exits: Exit[] = [];
        
        for (const position of positions) {
            const entity = new Exit({
                spawnPoint: {...position},
                containers: { containerForEntity: containers.entitiesContainer },
                levelContext: this
            });

            exits.push(entity);
        }

        return exits;
    }

    private createTorches(
        positions: Point[], 
        containers: LevelContainers, 
    ): Torch[] {
        const torches: Torch[] = [];
        
        for (const position of positions) {
            const entity = new Torch({
                spawnPoint: {...position},
                containers: { 
                    containerForEntity: containers.entitiesContainer,
                    containerForParticleEffects: containers.preEntitiesContainer
                },
                levelContext: this
            });

            torches.push(entity);
        }

        return torches;
    }

    private createAntiEntities(
        positions: Point[], 
        containers: LevelContainers, 
    ) {
        const antiEntities: Anti[] = [];
        
        for (const position of positions) {
            const anti = new Anti({
                spawnPoint: {...position},
                containers: { containerForEntity: containers.entitiesContainer },
                levelContext: this
            });

            antiEntities.push(anti);
        }

        return antiEntities;
    }

    private createSentries(
        positions: Point[], 
        containers: LevelContainers, 
    ) {
        const sentries: Sentry[] = [];
        
        for (const position of positions) {
            const initialVelocity = PhysicsUtils.randomUnitVector().mul(Config.Sentry.maxSpeed);
            const sentry = new Sentry({
                spawnPoint: {...position}, 
                containers: {
                    containerForEntity: containers.entitiesContainer,
                    containerForParticleEffects: containers.preEntitiesContainer,
                },
                initialVelocity,
                levelContext: this
            });

            sentries.push(sentry);
        }

        return sentries;
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
            ...this.exits,
            ...this.sentries
        ];
        
        // Update each entity
        allEntities.forEach((entity) => {
            entity.update(deltaTime);
        });
    }

    gentlyDestroyEntity(type: EntityType, entity: BaseEntity) {
        // Gently remove the entity
        entity.gentlyDestroy();

        this.removeEntity(type, entity);
    }

    destroyEntity(type: EntityType, entity: BaseEntity) {
        // Instantly remove the entity
        entity.destroy();

        this.removeEntity(type, entity);
    }

    private removeEntity(type: EntityType, entity: BaseEntity) {
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
            case Config.Exit.type:
                this.exits.splice(this.exits.indexOf(entity as Exit), 1);
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

        this.exits.forEach((exit) => {
            exit.destroy();
        });
        this.exits = [];

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
    
    getPhysicsWorld(): planck.World {
        return this.physicsWorld;
    }
}
