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
    private walls: Wall[];
    private finishAreas: FinishArea[];
    private torchEntities: Torch[];
    private antiEntities: Anti[];
    private sentries: Sentry[];
    private playerSpawnPoint: Point;

    constructor(
        world: planck.World, 
        containers: LevelContainers, 
        levelMap: number[][], 
        validSpaces: string[], 
        edgesList: Segment[]
    ) {
        // Store references to the various level entities
        this.walls = [];
        this.finishAreas = [];
        this.torchEntities = [];
        this.antiEntities = [];
        this.sentries = [];

        // Create the edges collision data and (optionally) render it
        this.createLevelEdges(world, containers.levelGeometryContainer, edgesList);

        // Create each wall (If we determine that to be the case)
        if (Config.Debug.drawWalls) {
            this.walls = this.createWalls(levelMap, containers.levelGeometryContainer);
        }
        
        // Create the other various entities
        this.torchEntities = this.createTorchEntities(validSpaces, containers, world, edgesList);
        this.finishAreas = this.createFinishEntities(validSpaces, containers, world, edgesList);
        this.antiEntities = this.createAntiEntities(validSpaces, containers, world, edgesList);
        this.sentries = this.createSentries(validSpaces, containers, world, edgesList);
    
        // Lastly, generate a random spawn point for the player
        this.playerSpawnPoint = this.findRandomValidPoint(validSpaces);
    }

    private createLevelEdges(world: planck.World, container: PIXI.Container, edgesList: Segment[]) {
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
            container.addChild(edgeGraphics);
        }

        // Create single body and multiple fixtures for all the edges of the level
        const id = EntityUtils.generateRandomId(Config.Edges.type);

        const body = PhysicsUtils.createLevelEdgesBody(world, { 
            edges: edgesList, 
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

    private createTorchEntities(
        validSpaces: string[], 
        containers: LevelContainers, 
        world: planck.World,
        edgesList: Segment[]
    ) {
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
                edgesList: edgesList
            });

            entitiesToReturn.push(entity);
        }

        return entitiesToReturn;
    }

    private createAntiEntities(
        validSpaces: string[], 
        containers: LevelContainers, 
        world: planck.World,
        edgesList: Segment[]
    ) {
        const entitiesToReturn = [];
        
        // Randomly place anti entities in open spaces for the player to reach
        const numAntiEntities = Math.ceil(validSpaces.length * Config.AntiChance);
        for (let i = 0; i < numAntiEntities; i++) {
            // Pick a random open space
            const [x, y] = validSpaces[Math.floor(Math.random() * validSpaces.length)].split(",");

            const entity = new Anti({
                world,
                spawnPoint: { x: Number(x), y: Number(y) },
                containers: { containerForEntity: containers.entitiesContainer },
                edgesList: edgesList
            });

            entitiesToReturn.push(entity);
        }

        return entitiesToReturn;
    }

    private createFinishEntities(
        validSpaces: string[], 
        containers: LevelContainers, 
        world: planck.World,
        edgesList: Segment[]
    ) {
        const entitiesToReturn = [];
        
        // Randomly place finish entities in open spaces for the player to reach
        const numFinishEntities = Math.ceil(validSpaces.length * Config.FinishAreaChance);
        for (let i = 0; i < numFinishEntities; i++) {
            // Pick a random open space
            const [x, y] = validSpaces[Math.floor(Math.random() * validSpaces.length)].split(",");

            const entity = new FinishArea({
                world,
                spawnPoint: { x: Number(x), y: Number(y) },
                containers: { containerForEntity: containers.entitiesContainer },
                edgesList: edgesList
            });

            entitiesToReturn.push(entity);
        }

        return entitiesToReturn;
    }

    private createSentries(
        validSpaces: string[], 
        containers: LevelContainers, 
        world: planck.World,
        edgesList: Segment[]
    ) {
        const entitiesToReturn = [];
        
        // Randomly place sentry entities in open spaces for the player to reach
        const numSentries = Math.ceil(validSpaces.length * Config.SentryChance);
        for (let i = 0; i < numSentries; i++) {
            // Pick a random open space
            const [x, y] = validSpaces[Math.floor(Math.random() * validSpaces.length)].split(",");
            const initialVelocity = PhysicsUtils.randomUnitVector().mul(Config.Sentry.maxSpeed);
            const sentry = new Sentry(
                world, 
                edgesList, 
                {x: Number(x), y: Number(y)}, {
                    containerForEntity: containers.entitiesContainer,
                    containerForParticleEffects: containers.preEntitiesContainer,
                },
                initialVelocity
            );

            entitiesToReturn.push(sentry);
        }

        return entitiesToReturn;
    }

    /**
     * Updates all entities in the level (e.g., for animation or effects).
     */
    update(deltaTime: number) {
        // Combine all entities into a single array
        const allEntities = [
            ...this.walls, 
            ...this.torchEntities, 
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
                this.torchEntities.splice(this.torchEntities.indexOf(entity as Torch), 1);
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
        this.walls.forEach((wall) => {
            wall.destroy();
        });
        this.walls = [];

        this.torchEntities.forEach((torch) => {
            torch.destroy();
        });
        this.torchEntities = [];

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

    getPlayerSpawnPoint(): Point {
        return this.playerSpawnPoint;
    }

    private findRandomValidPoint(validSpaces: string[]): Point {
        const randomIndex = Math.floor(Math.random() * validSpaces.length);
        const [validX, validY]: string[] = validSpaces[randomIndex].split(",");
        return { x: Number(validX), y: Number(validY) };
    }
}
