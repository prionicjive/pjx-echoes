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
import { EntityUtils } from '../utils/EntityUtils';
import { PhysicsUtils } from '../utils/PhysicsUtils';
import { Point, Segment } from '../utils/types';
import { LevelContext } from './LevelContext';
import { LevelSkeleton } from './LevelSkeleton';
import { SpriteUtils } from '../utils/SpriteUtils';
import { EntitiesConfig } from '../config/EntitiesConfig';
import { Gate } from '../entities/Gate';
import { Switch } from '../entities/Switch';
import { PhysicsManager } from '../physics/PhysicManager';
import { ExitGroup } from './ExitGroup';

export interface LevelOptions {
    renderer: PIXI.Renderer;
    physicsWorld: planck.World;
    physicsManager: PhysicsManager;
    containers: LevelContainers;
    edgesList: Segment[];
    entitiesOptions: LevelSkeleton;
    seed: string;
}

export interface LevelContainers {
    bgContainer: PIXI.Container;
    levelGeometryContainer: PIXI.Container;
    preEntitiesContainer: PIXI.Container;
    entitiesContainer: PIXI.Container;
    postEntitiesContainer: PIXI.Container;
}

/**
 * The Level class generates and manages all static entities for a level,
 * including walls and exit tiles. Handles conversion from map data to
 * physics and rendering objects.
 */
export class Level implements LevelContext {
    private renderer: PIXI.Renderer;
    private player: Player | null;
    private exits: Exit[];
    private exitGroups: Map<number, { exit: Exit; gates: Gate[]; switchEntity: Switch }> = new Map();
    private gates: Gate[];
    private switches: Switch[];
    private torches: Torch[];
    private antiEntities: Anti[];
    private sentries: Sentry[];
    private edgesList: Segment[];
    private edgesBody: planck.Body | null = null;
    private dimensions: { width: number; height: number };
    private physicsWorld: planck.World;
    private physicsManager: PhysicsManager;
    private containers: LevelContainers;
    private seed: string;

    constructor(
        options: LevelOptions
    ) {
        // Store LevelContext related things
        this.edgesList = options.edgesList;
        this.physicsWorld = options.physicsWorld;
        this.physicsManager = options.physicsManager;

        // Store the seed
        this.seed = options.seed;

        // Store the renderer
        this.renderer = options.renderer;

        // Store the containers
        this.containers = options.containers;

        // Store the dimensions of the level
        this.dimensions = {...options.entitiesOptions.dimensions};

        // Store references to the various level entities
        this.player = null;
        this.exits = [];
        this.gates = [];
        this.switches = [];
        this.torches = [];
        this.antiEntities = [];
        this.sentries = [];

        // Create the edges collision data and (optionally) render it
        const { body: edgesBody } = this.createLevelEdges(options.physicsWorld, this.containers.levelGeometryContainer);
        this.edgesBody = edgesBody;

        // Create each wall (If we determine that to be the case)
        if (Config.Debug.createVisibleWalls) {
            this.createTilemap(
                [...options.entitiesOptions.wallPositions],
                this.containers.levelGeometryContainer
            );
        }       

        // Create the exit groups
        this.createExitGroups(
            [...options.entitiesOptions.exitGroups], 
            this.containers
        );
        
        // Create the other various entities
        this.torches = this.createTorches(
            [...options.entitiesOptions.torchPositions], 
            this.containers);

        this.antiEntities = this.createAntiEntities(
            [...options.entitiesOptions.antiPositions], 
            this.containers
        );
        
        this.sentries = this.createSentries(
            [...options.entitiesOptions.sentryPositions], 
            this.containers
        );

        // Lastly, create the player
        this.player = this.createPlayer(
            {...options.entitiesOptions.playerSpawnPosition},
            this.containers
        ); 
    }

    private createLevelEdges(world: planck.World, container: PIXI.Container) {
        let edgeGraphics: PIXI.Graphics | null = null;
        
        // We may not want to draw the edges
        if (Config.Debug.createVisibleEdges) {
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

        const body = PhysicsUtils.createChainsBodyFromEdges(world, { 
            edges: this.edgesList, 
            edgeFixture: {
                restitution: Config.Physics.Edge.restitution,
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

    private createTilemap(positions: Point[], container: PIXI.Container): void {
        if (positions.length === 0) return;
    
        // 1. Calculate the bounds of all positions
        const bounds = positions.reduce((acc, pos) => ({
            minX: Math.min(acc.minX, pos.x),
            minY: Math.min(acc.minY, pos.y),
            maxX: Math.max(acc.maxX, pos.x),
            maxY: Math.max(acc.maxY, pos.y)
        }), { 
            minX: Infinity, 
            minY: Infinity, 
            maxX: -Infinity, 
            maxY: -Infinity 
        });
    
        // 2. Calculate dimensions in tiles and pixels
        const tileWidth = Config.Wall.width * Config.PixelsPerMeter; // Your desired tile size in pixels
        const tileHeight = Config.Wall.height * Config.PixelsPerMeter; // Your desired tile size in pixels
        const widthInTiles = (bounds.maxX - bounds.minX + 1);
        const heightInTiles = (bounds.maxY - bounds.minY + 1);
        const widthInPixels = widthInTiles * tileWidth;
        const heightInPixels = heightInTiles * tileHeight;
    
        // 3. Create a temporary container to hold our sprites
        const tempContainer = new PIXI.Container();
        
        // 5. Create and position each tile's sprite
        for (const pos of positions) {
            const sprite = SpriteUtils.createSprite({
                texture: PIXI.Texture.from(EntitiesConfig.Wall.sprite.texture),
                x: (pos.x - bounds.minX) * tileWidth,
                y: (pos.y - bounds.minY) * tileHeight,
                width: tileWidth,
                height: tileHeight,
                color: EntitiesConfig.Wall.sprite.color
            });
            tempContainer.addChild(sprite);
        }
    
        // 6. Create a render texture and render the container to it
        const renderTexture = PIXI.RenderTexture.create({
            width: widthInPixels,
            height: heightInPixels
        });
        
        // 7. Make sure we have a renderer reference
        this.renderer.render({
            container: tempContainer, 
            target: renderTexture, 
            clear: false
        });
    
        // 8. Create a sprite using the render texture
        const mapSprite = new PIXI.Sprite(renderTexture);
        
        // 9. Position the sprite in the world
        mapSprite.x = bounds.minX * Config.PixelsPerMeter;
        mapSprite.y = bounds.minY * Config.PixelsPerMeter;
        
        // 10. Add to container
        container.addChild(mapSprite);
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

    private createExitGroups(exitGroups: ExitGroup[], containers: LevelContainers) {
        // Create exit groups
        exitGroups.forEach(group => {
            // Create exit
            const exit = new Exit({
                spawnPoint: {...group.exitPosition},
                containers: { containerForEntity: containers.entitiesContainer },
                levelContext: this,
                groupId: group.id
            });
            
            // Create gates
            const gates = group.gatesPositions.map(gatePos => {
                const gate = new Gate({
                    spawnPoint: {...gatePos},
                    containers: { containerForEntity: containers.entitiesContainer },
                    levelContext: this,
                    color: group.color, // Pass color to gate
                    groupId: group.id
                });
                
                return gate;
            });
            
            // Create switch
            const switchEntity = new Switch({
                spawnPoint: {...group.switchPosition},
                containers: { 
                    containerForEntity: containers.entitiesContainer,
                    containerForParticleEffects: containers.preEntitiesContainer 
                },
                levelContext: this,
                color: group.color, // Pass color to switch
                groupId: group.id
            });
            
            // Store the entities to the proper slots of the exit group
            this.exitGroups.set(group.id, {
                exit,
                gates,
                switchEntity: switchEntity
            });
            
            // Add the entities to the corresponding lists
            this.exits.push(exit);
            this.gates.push(...gates);
            this.switches.push(switchEntity);
        });
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
                    containerForParticleEffects: containers.postEntitiesContainer,
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
            ...this.torches, 
            ...this.antiEntities, 
            ...this.exits,
            ...this.gates,
            ...this.switches,
            ...this.sentries
        ];
        
        // Update each entity
        allEntities.forEach((entity) => {
            entity.update(deltaTime);
        });
    }

    // @ts-ignore
    onSwitchPressed(groupId: number) {
        const exitGroup = this.exitGroups.get(groupId);
        if (!exitGroup) return;

        // Remove the group first to prevent re-triggering before entities are fully destroyed
        this.exitGroups.delete(groupId);

        // Gently destroy the switch
        this.gentlyDestroyEntity(exitGroup.switchEntity);

        // Instantly remove gates
        for (const gate of exitGroup.gates) {
            this.destroyEntity(gate);
        }
    }

    gentlyDestroyEntity(entity: BaseEntity) {
        // Gently remove the entity
        entity.gentlyDestroy(this.physicsManager);
        this.removeEntity(entity);
    }

    destroyEntity(entity: BaseEntity) {
        // Instantly remove the entity
        entity.destroy(this.physicsManager);
        this.removeEntity(entity);
    }

    private removeEntity(entity: BaseEntity) {
        // Now, remove the entity from the correct array
        switch (entity.type) {
            case Config.Torch.type:
                this.torches = this.torches.filter((torch) => torch !== entity as Torch);
                break;
            case Config.Anti.type:
                this.antiEntities = this.antiEntities.filter((anti) => anti !== entity as Anti);
                break;
            case Config.Exit.type:
                this.exits = this.exits.filter((exit) => exit !== entity as Exit);
                break;
            case Config.Gate.type:
                this.gates = this.gates.filter((gate) => gate !== entity as Gate);
                break;
            case Config.Switch.type:
                this.switches = this.switches.filter((switchEntity) => switchEntity !== entity as Switch);
                break;    
            case Config.Sentry.type:
                this.sentries = this.sentries.filter((sentry) => sentry !== entity as Sentry);
                break;
        }
    }

    destroy() {
        // Destroy the edges body
        if (this.edgesBody && this.edgesBody.getWorld()) {
            this.physicsManager.destroyBody(this.edgesBody);
            this.edgesBody = null;
        }

        // Destroy all entities
        this.player?.destroy(this.physicsManager);

        this.torches.forEach((torch) => {
            torch.destroy(this.physicsManager);
        });
        this.torches = [];

        this.antiEntities.forEach((anti) => {
            anti.destroy(this.physicsManager);
        });
        this.antiEntities = [];

        this.exits.forEach((exit) => {
            exit.destroy(this.physicsManager);
        });
        this.exits = [];

        this.gates.forEach((gate) => {
            gate.destroy(this.physicsManager);
        });
        this.gates = [];

        this.switches.forEach((switchEntity) => {
            switchEntity.destroy(this.physicsManager);
        });
        this.switches = [];

        this.sentries.forEach((sentry) => {
            sentry.destroy(this.physicsManager);
        });
        this.sentries = [];

        // Vanquish the exit groups
        this.exitGroups = new Map();
    }

    getPlayer(): Player {
        return this.player!;
    }

    getSeed(): string {
        return this.seed;
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
