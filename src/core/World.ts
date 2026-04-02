import { BloomFilter, CRTFilter } from 'pixi-filters';
import * as PIXI from 'pixi.js';
import planck from 'planck';
import { Config } from '../config/Config.ts';
import { EntityUserData } from '../entities/BaseEntity.ts';
import { Player } from '../entities/Player.ts';
import { InputManager } from '../input/InputManager.ts';
import { Level } from '../level/Level.ts';
import { LightManager } from '../light/LightManager.ts';
import { ParticleEffectManager } from '../particles/ParticleEffectManager.ts';
import { LevelUtils } from '../utils/LevelUtils.ts';
import { LightUtils } from '../utils/LightUtils.ts';
import { PhysicsManager } from '../physics/PhysicManager.ts';
import { LidarManager } from '../lidar/LidarManager.ts';

export class World {
    private app: PIXI.Application;
    
    // Physics related
    private physicsManager: PhysicsManager | null = null;
    private world: planck.World | null = null;

    // Input related
    private inputManager: InputManager;
    
    // The player
    private player: Player | null = null;

    // The level (with all its entities)
    private level: Level | null = null;

    // PIXI Containers different rendering objects / layers
    private worldContainer!: PIXI.Container; // Added to stage directly
    private bgContainer!: PIXI.Container; // Here and below are added to the world container
    private lightsContainer!: PIXI.Container;
    private levelGeometryContainer!: PIXI.Container; 
    private preEntitiesContainer!: PIXI.Container;
    private entitiesContainer!: PIXI.Container;
    private postEntitiesContainer!: PIXI.Container;
    private lidarContainer!: PIXI.Container;
    private fgContainer!: PIXI.Container; // Final world container / layer
    private uiContainer!: PIXI.Container; // Added lastly to the stage directly

    // Scratch containers never added anywhere, used for temporary rendering
    private tempLightmapContainer!: PIXI.Container; // Not directly added to world

    // Needed for lightmap rendering
    private lightmapTexture!: PIXI.RenderTexture; // Lightmap used for our render-to-texture'ing and post processing of lights
    private lightmapSprite!: PIXI.Sprite;
    private transparentBgRect!: PIXI.Graphics;

    // Filters
    // TODO Do we need to have these here?
    private crtFilter!: CRTFilter;
    private bloomFilter!: BloomFilter;
    
    // Player view mode masking
    private entityContainerGroup!: PIXI.Container;
    private playerViewMask!: PIXI.Graphics;
    private playerLightPolygonMask!: PIXI.Graphics;
    
    // Polygon caching for performance
    private cachedPlayerPolygon: { point: { x: number, y: number }, angle: number }[] | null = null;
    private lastPlayerLightUpdate: number = 0;

    // LIDAR
    private lidarManager: LidarManager = new LidarManager();

    // Debug text
    private debugText!: PIXI.Text;

    // Need for viewport calculations
    private viewportWidth: number;
    private viewportHeight: number;

    // Interesting stats to keep track of
    private numLevelsCompleted: number = 0;
    
    // Performance metrics for debugging
    private maskUpdateTime: number = 0;
    private lightRenderTime: number = 0;

    // Deferred reset flag — set inside contact callbacks, acted on after world.step()
    private pendingReset: boolean = false;

    // Stored bound handler so the same reference is used for both on() and off()
    private readonly onBeginContactBound = this.onBeginContact.bind(this);

    constructor(app: PIXI.Application) {
        this.app = app;

        // Initialize input manager
        this.inputManager = new InputManager(app.canvas);

        // Instantiate the various PIXI containers
        this.initializeContainers();
        
        // Set up viewport dimensions (Will change on resize)
        this.viewportWidth = window.innerWidth;
        this.viewportHeight = window.innerHeight;

        this.initializeTexturesAndGraphicalElements(this.viewportWidth, this.viewportHeight);

        // Create post-processing
        // TODO Find out how to dynamically alter these
        this.initializePostProcessingFilters();

        // Initialize debug text
        this.initializeDebugText();

        // TODO Handle additional setup if needed

        // Lastly, initialize the world
        this.init();
    }

    private initializeContainers() {
        this.tempLightmapContainer = new PIXI.Container(); // Not directly added to anything, only used for render to texture / post processing
        
        this.worldContainer = new PIXI.Container(); // Added directly to the stage
        this.bgContainer = new PIXI.Container(); // Here and below are added to the world container
        this.lightsContainer = new PIXI.Container();
        this.levelGeometryContainer = new PIXI.Container();
        this.preEntitiesContainer = new PIXI.Container();
        this.entitiesContainer = new PIXI.Container();
        this.postEntitiesContainer = new PIXI.Container();
        this.lidarContainer = new PIXI.Container();
        this.fgContainer = new PIXI.Container(); // Final world container / layer
        this.entityContainerGroup = new PIXI.Container(); // Groups pre/main/post entity containers for unified masking
        this.playerViewMask = new PIXI.Graphics();
        this.playerLightPolygonMask = new PIXI.Graphics();
        
        this.uiContainer = new PIXI.Container(); // Added lastly to the stage directly
    }

    private initializeTexturesAndGraphicalElements(width: number, height: number) {
        // Set up basic lightmap-related things
        // This doesn't get added to the world, it is just used for rendering lights to a texture
        this.lightmapTexture = PIXI.RenderTexture.create({ width: width, height: height });
        
        this.lightmapSprite = new PIXI.Sprite(this.lightmapTexture);
        this.lightmapSprite.blendMode = 'add'; // Additive blending for highly saturated lights
        this.lightmapSprite.width = width; // Make sure the lightmap sprite is as big as the screen
        this.lightmapSprite.height = height;
        this.lightmapSprite.alpha = 1;

        // Set up helper background rects
        this.transparentBgRect = new PIXI.Graphics();
        this.transparentBgRect.rect(0, 0, width, height);
        this.transparentBgRect.fill({color: 0x000000, alpha: 0.0});
    }

    private initializePostProcessingFilters() {
        if(!this.app) {
            return;
        }

        // Instantiate filters
        // TODO Make some of this configurable!
        this.crtFilter = new CRTFilter({
            curvature: 0,
            lineWidth: 0.1,
            lineContrast: 0.1,
            vignetting: 0,
            noise: 0.2,
            noiseSize: 1
        });

        this.bloomFilter = new BloomFilter({
            kernelSize: 5,
            quality: 4,
            resolution: 1,
            strength: 8
        });

        // Apply bloom and CRT to the world (We might not want any of this on UI layer)
        this.worldContainer.filters = [this.bloomFilter, this.crtFilter];
    }

    private initializeDebugText() {
        if(!this.app) {
            return;
        }

        this.debugText = new PIXI.Text({
            style: {
                fontFamily: 'UbuntuMono', // or any system font
                fontSize: 16,
                fill: 0xffffff,
                dropShadow: {
                    color: 0x000000,
                    blur: 4,
                    angle: 0,
                    distance: 2,
                    alpha: 1
                }
            }
        });

        this.debugText.position.set(10, 10); // Position in top-left with some padding
    }   

    private init() {
        // Basically, set up a new world!
        this.setUpWorld();
    }

    /**
     * Resets the game state: clears containers, destroys physics bodies,
     * and generates a fresh level and player.
     */
    private reset() {
        // TODO Consider how / what to reset or destroy and rebuild
        if (!this.app) return;

        // Tear down the old world
        this.tearDownWorld();

        // ------------------------
        // NOW, it's time to add things and set up a new world
        // ------------------------
        this.setUpWorld();
    }

    private tearDownWorld() {
        // Tear down dynamic entities
        this.tearDownEntities();
        
        // Empty the various PIXI containers in order
        this.tearDownContainersInOrder();

        // Remove all lights
        LightManager.instance.removeAllLights();

        // Remove LIDAR state
        this.lidarManager.destroy();

        // Remove all effects
        ParticleEffectManager.instance.removeAllEffects();
        
        // Remove all bodies / fixtures from Planck world
        this.physicsManager?.destroy();

        // Remove any listeners
        this.world!.off('begin-contact', this.onBeginContactBound);
        this.world = null;
    
        // Remove the physics manager
        this.physicsManager = null;
    }

    private setUpWorld() {
        // Add empty containers in the proper order / heiarchy, then we can add directly to the containers as needed
        this.setUpContainersInOrder();

        // Add the debug text to the UI container
        this.uiContainer.addChild(this.debugText);

        // Add the sprite that contains the render texture of the light map, to be draw sort of below everything else
        this.lightsContainer.addChild(this.lightmapSprite); // Do the lightmap before any of the other world entities are processed / rendered
        // TODO Any other render-to-textures that need to be at the screen level and NOT on the world (As the camera there moves)?

        // TODO This may be too drastic, but regenerate entire Planck world and the physics manager
        this.world = new planck.World(new planck.Vec2(0, 0)); // No gravity
        this.world.on('begin-contact', this.onBeginContactBound);
        this.physicsManager = new PhysicsManager(this.world);

        // Create a proceduarally generated level
        this.level = LevelUtils.createProcGenLevel(
            this.app.renderer,
            this.world,
            this.physicsManager,
            {
                bgContainer: this.bgContainer,
                levelGeometryContainer: this.levelGeometryContainer,
                preEntitiesContainer: this.preEntitiesContainer,
                entitiesContainer: this.entitiesContainer,
                postEntitiesContainer: this.postEntitiesContainer
            },
            "Standard"
        );
        
        // Get the player - our "first class" entity
        this.player = this.level.getPlayer();

        // Instantly center camera on player to avoid an initial soft follow
        this.instantlyCenterCamera();      
    }

    private tearDownEntities() {
         // Destroy the level (and all entities within, including the player)
        this.level!.destroy();
    }

    private tearDownContainersInOrder() {
        this.tempLightmapContainer.removeChildren();
        
        this.fgContainer.removeChildren();
        this.postEntitiesContainer.removeChildren();        
        this.entitiesContainer.removeChildren();
        this.preEntitiesContainer.removeChildren();

        // Clear player view masks before tearing down
        this.entityContainerGroup.mask = null;
        this.entityContainerGroup.removeChildren();
        this.playerViewMask.clear();
        this.playerLightPolygonMask.clear();

        this.lidarContainer.removeChildren();
        this.levelGeometryContainer.removeChildren();
        this.lightsContainer.removeChildren();
        this.bgContainer.removeChildren();
        this.worldContainer.removeChildren();
        
        this.uiContainer.removeChildren();
        this.app.stage.removeChildren();
    }

    private setUpContainersInOrder() {
        // Add the world container as a big container that will hold the entire world with all its entities and layer
        // that can mimic having a camera, serving as a big carpet that can slide around above the stage.
        this.app.stage.addChild(this.worldContainer); // Added directly to the stage

        this.worldContainer.addChild(this.bgContainer); // Here and below are added to the world container

        // We may not want to show the level geometry to start with
        this.levelGeometryContainer.visible = Config.Debug.showLevelGeometry;
        this.worldContainer.addChild(this.levelGeometryContainer);

        // We may want lights off to start with
        this.lightsContainer.visible = Config.Debug.showLights;
        this.worldContainer.addChild(this.lightsContainer); 
        this.worldContainer.addChild(this.lidarContainer);

        // Group the three entity layers so a single mask can be applied to all of them
        this.entityContainerGroup.addChild(this.preEntitiesContainer);
        this.entityContainerGroup.addChild(this.entitiesContainer);
        this.entityContainerGroup.addChild(this.postEntitiesContainer);
        this.playerViewMask.clear();
        this.entityContainerGroup.addChild(this.playerViewMask);
        this.worldContainer.addChild(this.entityContainerGroup);

        this.worldContainer.addChild(this.fgContainer); // End of world containers / layers
        
        this.app.stage.addChild(this.uiContainer); // Added lastly to the stage directly
    }
    
    /**
     * Handles collision events from Planck.js, such as the player reaching a exit tile
     * or interacting with walls.
     * @param {planck.Contact} contact - The collision contact event from Planck.js.
     */
    private onBeginContact(contact: planck.Contact) {
        const aData: EntityUserData = contact.getFixtureA().getBody().getUserData() as EntityUserData;
        const bData: EntityUserData = contact.getFixtureB().getBody().getUserData() as EntityUserData;

        if (
            (aData.type === Config.Player.type && bData.type === Config.Exit.type) ||
            (aData.type === Config.Exit.type && bData.type === Config.Player.type)
        ) {
            //console.log("Player reached exit tile!");
            
            // TODO Show a "Level Complete" screen
            this.numLevelsCompleted++;
            this.pendingReset = true;
        } else if (
            (aData.type === Config.Player.type && bData.type === Config.Edges.type) ||
            (aData.type === Config.Edges.type && bData.type === Config.Player.type)
        ) {
            // TODO Handle player hitting an edge
            //console.log("Player hit an edge!");
            if (Config.Debug.showCollisionMarkers) {
                // Access the manifold to get the contact points
                const manifold = contact.getManifold();
                if (manifold.pointCount > 0) {
                    const worldManifold = contact.getWorldManifold(null);

                    if (!worldManifold) {
                        return;
                    }

                    for (let i = 0; i < manifold.pointCount; i++) {
                        const point = worldManifold.points[i]; // { x, y }

                        //console.log("Sentry/Edge Collision point: ", point);
                        ParticleEffectManager.instance.playEffect(
                            this.preEntitiesContainer, 
                            "EdgeImpact", { 
                                x: point.x * Config.PixelsPerMeter,
                                y: point.y * Config.PixelsPerMeter 
                            },
                            5
                        );
                    }
                }
            }
        } else if (
            (aData.type === Config.Sentry.type && bData.type === Config.Edges.type) ||
            (aData.type === Config.Edges.type && bData.type === Config.Sentry.type)
        ) {
            // TODO Handle sentry hitting an edge
            //console.log("Sentry hit an edge!");

            if (Config.Debug.showCollisionMarkers) {
                // Access the manifold to get the contact points
                const manifold = contact.getManifold();
                if (manifold.pointCount > 0) {
                    const worldManifold = contact.getWorldManifold(null);

                    if (!worldManifold) {
                        return;
                    }

                    for (let i = 0; i < manifold.pointCount; i++) {
                        const point = worldManifold.points[i]; // { x, y }

                        //console.log("Sentry/Edge Collision point: ", point);
                        ParticleEffectManager.instance.playEffect(
                            this.preEntitiesContainer, 
                            "EdgeImpact", { 
                                x: point.x * Config.PixelsPerMeter,
                                y: point.y * Config.PixelsPerMeter 
                            },
                            5
                        );
                    }
                }
            }

        } else if (
            (aData.type === Config.Player.type && bData.type === Config.Sentry.type) ||
            (aData.type === Config.Sentry.type && bData.type === Config.Player.type)
        ) {
            // Handle player hitting a sentry
            //console.log("Player hit a sentry!");

            const sentryData: EntityUserData = aData?.type === Config.Sentry.type ? aData : bData; // TODO Make this a little more foolproof
            if (sentryData.entity) {
                this.player!.onPickup(sentryData.type);
                this.level!.gentlyDestroyEntity(sentryData.entity);
            }

            // Disable the contact to prevent the sentry from physically reacting with the player
            contact.setEnabled(false);
        } else if (
            (aData.type === Config.Player.type && bData.type === Config.Torch.type) ||
            (aData.type === Config.Torch.type && bData.type === Config.Player.type)
        ) {
            // Handle player hitting a torch
            //console.log("Player hit a torch!");

            const torchEntity: EntityUserData = aData?.type === Config.Torch.type ? aData : bData; // TODO Make this a little more foolproof
            if (torchEntity.entity) {
                this.player!.onPickup(torchEntity.type);
                this.level!.gentlyDestroyEntity(torchEntity.entity);
            }
        } else if (
            (aData.type === Config.Sentry.type && bData.type === Config.Sentry.type)
        ) {
            // TODO Handle a sentry hitting another sentry
            //console.log("Sentry hit another sentry!");
        } else if (
            (aData.type === Config.Player.type && bData.type === Config.Anti.type) ||
            (aData.type === Config.Anti.type && bData.type === Config.Player.type)
        ) {
            // Pick up and remove anti
            //console.log("Player picked up an anti!");

            const antiEntity: EntityUserData = aData?.type === Config.Anti.type ? aData : bData; // TODO Make this a little more foolproof
            if (antiEntity.entity) {
                this.player!.onPickup(antiEntity.type);
                this.level!.gentlyDestroyEntity(antiEntity.entity);
            }
        } else if (
            (aData.type === Config.Player.type && bData.type === Config.Switch.type) ||
            (aData.type === Config.Switch.type && bData.type === Config.Player.type)
        ) {
            // Press and remove swtich
            //console.log("Player pressed a switch!");

            const switchEntity: EntityUserData = aData?.type === Config.Switch.type ? aData : bData; // TODO Make this a little more foolproof
            if (switchEntity.entity && switchEntity.groupId !== undefined && switchEntity.groupId >= 0) {
                this.level!.onSwitchPressed(switchEntity.groupId);
            }
        }
    }

    /**
     * Instantly centers the camera on the player or the level, depending on which is smaller.
     * Used at game start to avoid jarring camera jumps.
     */
    private instantlyCenterCamera() {
        // If the level is smaller than the screen, center it. Otherwise, center on the player.
        if (!this.player || !this.worldContainer) return;

        const levelWidthInPixels = this.level!.getWidth() * Config.PixelsPerMeter;
        const levelHeightInPixels = this.level!.getHeight() * Config.PixelsPerMeter;
        const screenWidth = this.viewportWidth;
        const screenHeight = this.viewportHeight;

        // Center if level is smaller than screen
        if (levelWidthInPixels <= screenWidth) {
            this.worldContainer.x = (screenWidth - levelWidthInPixels) / 2;
        } else {
            // Camera target position: center the ball on the screen
            const screenCenterX = this.viewportWidth / 2;
            const targetX = -this.player.sprite.x + screenCenterX;
            this.worldContainer.x += (targetX - this.worldContainer.x);

            // Keep camera inside the world edges
            this.worldContainer.x = Math.min(0, Math.max(this.worldContainer.x, this.viewportWidth - this.level!.getWidth() * Config.PixelsPerMeter));
         }

        if (levelHeightInPixels <= screenHeight) {
            this.worldContainer.y = (screenHeight - levelHeightInPixels) / 2;
        } else {
            // Camera target position: center the ball on the screen
            const screenCenterY = this.viewportHeight / 2;
            const targetY = -this.player.sprite.y + screenCenterY;
            this.worldContainer.y += (targetY - this.worldContainer.y);

            // Keep camera inside the world edges
            this.worldContainer.y = Math.min(0, Math.max(this.worldContainer.y, this.viewportHeight - this.level!.getHeight() * Config.PixelsPerMeter));
        }
    }

    /**
     * Called every frame. Steps physics, updates entities, and handles camera movement.
     * @param {number} deltaTime - Time since the last frame, in seconds.
     */
    update(deltaTime: number) { 
        // Handle debugging input
        this.handleDebugInput();

        // Handle input, as this might affect the physics
        this.updateFromInput(deltaTime);

        // Update and step the physics
        this.physicsManager?.update();
        this.world!.step(deltaTime);

        // Check for a reset requested from inside a contact callback (must happen after world.step)
        if (this.pendingReset) {
            this.pendingReset = false;
            this.reset();
            return;
        }
    
        // Update level 
        // (For player, dynamic entities, static entities with effect, dynamic geometry, etc)
        this.level!.update(deltaTime);

        // Update particle effects
        ParticleEffectManager.instance.update(deltaTime);

        // Update LIDAR
        this.lidarManager.update(deltaTime);

        // Update camera
        this.updateCamera(deltaTime);

        // Update and render the lights
        this.updateAndRenderLights();

        // Apply/clear the player-view mask on entity containers (must run after lights update the polygon)
        this.updatePlayerViewMask();

        // Render LIDAR (uses camera offset, same as lights)
        this.renderLidar();

        // Update anything needed for post processing
        this.updatePostProcessing(deltaTime);

        // Update debug text
        if (Config.Debug.showDebugText) {
            this.updateDebugText();
        }
    }

    private handleDebugInput() {
        // Process any debugging input

        // Toggle debug text
        if (this.inputManager.getKeysState().keys.get("`")?.justPressed) {
            Config.Debug.showDebugText = !Config.Debug.showDebugText;
            this.debugText.visible = Config.Debug.showDebugText;
        }

        // Toggle lights
        if (this.inputManager.getKeysState().keys.get("1")?.justPressed) {
            Config.Debug.showLights = !Config.Debug.showLights;
            this.lightsContainer.visible = Config.Debug.showLights;
        }
        // Toggle level geometry
        if (this.inputManager.getKeysState().keys.get("2")?.justPressed) {
            Config.Debug.showLevelGeometry = !Config.Debug.showLevelGeometry;
            this.levelGeometryContainer.visible = Config.Debug.showLevelGeometry;
        }

        // Toggle new collision "markers"
        if (this.inputManager.getKeysState().keys.get("3")?.justPressed) {
            Config.Debug.showCollisionMarkers = !Config.Debug.showCollisionMarkers;
        }

        // Toggle player view mode (entities only visible inside the player's light polygon)
        if (this.inputManager.getKeysState().keys.get("4")?.justPressed) {
            Config.Debug.onlyDisplayInPlayerView = !Config.Debug.onlyDisplayInPlayerView;
            if (!Config.Debug.onlyDisplayInPlayerView) {
                this.clearAllMasks();
            }
        }

        // Fire LIDAR pulse
        if (this.inputManager.getKeysState().keys.get(" ")?.justPressed) {
            if (this.player && this.level) {
                const playerPos = this.player.body!.getPosition();
                this.lidarManager.fire(
                    { x: playerPos.x, y: playerPos.y },
                    this.level.getEdgesList()
                );
            }
        }
    }
    
    private updateFromInput(deltaTime: number) {
        if (!this.player || !this.player.sprite) return;

        const levelPosition = { x: this.worldContainer.x, y: this.worldContainer.y };
        const playerWorldPos = { x: this.player.sprite.x, y: this.player.sprite.y };
        const playerScreenPos = {
            x: playerWorldPos.x + levelPosition.x,
            y: playerWorldPos.y + levelPosition.y
        };
    
        const pointer = this.inputManager.getPointerState();
        const touchState = this.inputManager.getTouchState();
    
        this.player.handleInput(
            { pointer, touchState },
            { levelPosition, playerScreenPos },
            deltaTime
        );

        // Reset flags
        this.inputManager.update();
    }

     /**
     * Handles camera movement each frame, using soft-follow logic and dead zone.
     */
     private updateCamera(deltaTime: number) {
        // If the level is smaller than the screen, keep it centered.
        // Otherwise, use soft-follow logic with a dead zone to track the player.

        // Smooth camera follow
        if (!this.player || !this.player.sprite || !this.worldContainer) return;

        const levelWidthInPixels = this.level!.getWidth() * Config.PixelsPerMeter;
        const levelHeightInPixels = this.level!.getHeight() * Config.PixelsPerMeter;
        const screenWidth = this.viewportWidth;
        const screenHeight = this.viewportHeight;

        // Center on x-axis if level is narrower than screen
        if (levelWidthInPixels <= screenWidth) {
            this.worldContainer.x = (screenWidth - levelWidthInPixels) / 2;
        } else {
            // Camera target position: center the ball on the screen
            const screenCenterX = this.viewportWidth / 2;

            // World coordinates of screen center
            const cameraX = -this.worldContainer.x;

            // Get ball position relative to camera center
            const offsetX = this.player.sprite.x - cameraX;

            // Only move camera if the ball is outside the dead zone
            let moveX = 0;

            if (offsetX < screenCenterX - Config.Camera.DeadZone.width / 2) {
                moveX = offsetX - (screenCenterX - Config.Camera.DeadZone.width / 2);
            } else if (offsetX > screenCenterX + Config.Camera.DeadZone.width / 2) {
                moveX = offsetX - (screenCenterX + Config.Camera.DeadZone.width / 2);
            }

            // Move the camera a little bit toward the target each frame
            this.worldContainer.x -= moveX * Config.Camera.lerpFactor * deltaTime;

            // Keep camera inside the world edges
            this.worldContainer.x = Math.min(0, Math.max(this.worldContainer.x, this.viewportWidth - this.level!.getWidth() * Config.PixelsPerMeter));
        }

        // Center on y-axis if level is shorter than screen
        if (levelHeightInPixels <= screenHeight) {
            this.worldContainer.y = (screenHeight - levelHeightInPixels) / 2;
        } else {
            // Camera target position: center the ball on the screen
            const screenCenterY = this.viewportHeight / 2;
            
            // World coordinates of screen center
            const cameraY = -this.worldContainer.y;

            // Get ball position relative to camera center
            const offsetY = this.player.sprite.y - cameraY;

            // Only move camera if the ball is outside the dead zone
            let moveY = 0;

            if (offsetY < screenCenterY - Config.Camera.DeadZone.height / 2) {
                moveY = offsetY - (screenCenterY - Config.Camera.DeadZone.height / 2);
            } else if (offsetY > screenCenterY + Config.Camera.DeadZone.height / 2) {
                moveY = offsetY - (screenCenterY + Config.Camera.DeadZone.height / 2);
            }

            // Move the camera a little bit toward the target each frame
            this.worldContainer.y -= moveY * Config.Camera.lerpFactor * deltaTime;
            
            // Keep camera inside the world edges
            this.worldContainer.y = Math.min(0, Math.max(this.worldContainer.y, this.viewportHeight - this.level!.getHeight() * Config.PixelsPerMeter));
        }

        // Lastly, reposition any container that needs to "stick" to the viewport (Lightmaps, etc)
        this.counteractWorldTransform();
    }

    private counteractWorldTransform() {
        this.lightsContainer.position.set(-this.worldContainer.x, -this.worldContainer.y);
    }

    private updatePlayerViewMask(): void {
        const start = performance.now();
        
        if (!this.validatePlayerViewMode()) {
            this.clearEntityMask();
            this.maskUpdateTime = performance.now() - start;
            return;
        }

        const lightPoints = this.getCachedPlayerPolygon();
        if (lightPoints.length < 3) {
            this.clearEntityMask();
            this.maskUpdateTime = performance.now() - start;
            return;
        }

        this.drawWorldSpaceMask(lightPoints);
        this.entityContainerGroup.mask = this.playerViewMask;
        
        this.maskUpdateTime = performance.now() - start;
    }

    private validatePlayerViewMode(): boolean {
        return Config.Debug?.onlyDisplayInPlayerView === true && 
               this.player?.light !== null;
    }

    private clearEntityMask(): void {
        this.entityContainerGroup.mask = null;
    }

    private clearAllMasks(): void {
        this.entityContainerGroup.mask = null;
        this.playerViewMask.clear();
        this.playerLightPolygonMask.clear();
        this.cachedPlayerPolygon = null;
    }

    private getCachedPlayerPolygon(): { point: { x: number, y: number }, angle: number }[] {
        if (!this.player?.light) return [];
        
        // Use a simple timestamp-based cache invalidation
        const currentUpdate = Date.now();
        if (this.cachedPlayerPolygon && this.lastPlayerLightUpdate === currentUpdate) {
            return this.cachedPlayerPolygon;
        }
        
        this.cachedPlayerPolygon = this.player.light.getLightPoints();
        this.lastPlayerLightUpdate = currentUpdate;
        return this.cachedPlayerPolygon;
    }

    private drawWorldSpaceMask(lightPoints: { point: { x: number, y: number }, angle: number }[]): void {
        const ppm = Config.PixelsPerMeter;

        this.playerViewMask.clear();
        this.playerViewMask.moveTo(
            lightPoints[0].point.x * ppm,
            lightPoints[0].point.y * ppm
        );
        for (let i = 1; i < lightPoints.length; i++) {
            this.playerViewMask.lineTo(
                lightPoints[i].point.x * ppm,
                lightPoints[i].point.y * ppm
            );
        }
        this.playerViewMask.closePath();
        this.playerViewMask.fill({ color: 0xffffff, alpha: 1 });
    }

    private renderLidar() {
        this.lidarManager.render(this.lidarContainer);
    }

    private updateAndRenderLights() {
        const start = performance.now();
        
        // Update all lights
        LightManager.instance.update();

        const cameraOffset = {
            x: -this.worldContainer.x,
            y: -this.worldContainer.y
        };

        const screenBounds = {
            left: -this.worldContainer.x,
            top: -this.worldContainer.y,
            right: -this.worldContainer.x + this.viewportWidth,
            bottom: -this.worldContainer.y + this.viewportHeight
        };

        // Clear the lightmap container once
        this.tempLightmapContainer.removeChildren();

        // Split rendering into two passes when player view mode is active
        if (Config.Debug.onlyDisplayInPlayerView && this.player?.light) {
            this.renderPlayerViewModeLights(cameraOffset, screenBounds);
        } else {
            this.renderNormalLights(cameraOffset, screenBounds);
        }
        
        this.lightRenderTime = performance.now() - start;
        
        // Process any lights that exited fading out after all updates/renders
        this.processPendingLightRemovals();
    }

    private renderPlayerViewModeLights(
        cameraOffset: { x: number; y: number },
        screenBounds: { left: number; top: number; right: number; bottom: number }
    ): void {
        if (!this.player?.light) return;
        
        // === PASS 1: Render player light (unmasked) ===
        const playerLight = this.player.light;
        LightUtils.renderLightsBatch(
            [playerLight],
            cameraOffset, screenBounds, this.tempLightmapContainer
        );

        this.app.renderer.render({
            container: this.transparentBgRect,
            target: this.lightmapTexture,
            clear: true
        });
        this.app.renderer.render({
            container: this.tempLightmapContainer,
            target: this.lightmapTexture,
            clear: false
        });

        // === PASS 2: Render overlapping non-player lights, masked to player's visible polygon ===
        const playerPos = playerLight.getPosition();
        const playerRadius = playerLight.radius;
        const polygon = this.getCachedPlayerPolygon().map(p => p.point);
        const overlappingLights = LightManager.instance.getAllLights().filter(light => {
            if (light.id === playerLight.id) return false; // already rendered
            const lp = light.getPosition();
            const dx = lp.x - playerPos.x;
            const dy = lp.y - playerPos.y;
            return (dx * dx + dy * dy) < (playerRadius + light.radius) * (playerRadius + light.radius);
        });

        if (overlappingLights.length > 0 && polygon.length >= 3) {
            this.drawScreenSpaceMask(polygon, cameraOffset);
            this.renderMaskedLights(overlappingLights, cameraOffset, screenBounds);
        }
    }

    private renderNormalLights(
        cameraOffset: { x: number; y: number },
        screenBounds: { left: number; top: number; right: number; bottom: number }
    ): void {
        // Normal mode: render all lights unmasked
        LightUtils.renderLightsBatch(
            LightManager.instance.getAllLights(),
            cameraOffset, screenBounds, this.tempLightmapContainer
        );

        this.app.renderer.render({
            container: this.transparentBgRect,
            target: this.lightmapTexture,
            clear: true
        });
        this.app.renderer.render({
            container: this.tempLightmapContainer,
            target: this.lightmapTexture,
            clear: false
        });
    }

    private drawScreenSpaceMask(
        polygon: { x: number, y: number }[],
        cameraOffset: { x: number; y: number }
    ): void {
        const ppm = Config.PixelsPerMeter;

        // Build mask polygon in screen space (same space as tempLightmapContainer)
        this.playerLightPolygonMask.clear();
        this.playerLightPolygonMask.moveTo(
            polygon[0].x * ppm - cameraOffset.x,
            polygon[0].y * ppm - cameraOffset.y
        );
        for (let i = 1; i < polygon.length; i++) {
            this.playerLightPolygonMask.lineTo(
                polygon[i].x * ppm - cameraOffset.x,
                polygon[i].y * ppm - cameraOffset.y
            );
        }
        this.playerLightPolygonMask.closePath();
        this.playerLightPolygonMask.fill({ color: 0xffffff, alpha: 1 });

        // Apply mask to tempLightmapContainer for this pass
        this.tempLightmapContainer.removeChildren();
        this.tempLightmapContainer.addChild(this.playerLightPolygonMask);
        this.tempLightmapContainer.mask = this.playerLightPolygonMask;
    }

    private renderMaskedLights(
        overlappingLights: any[],
        cameraOffset: { x: number; y: number },
        screenBounds: { left: number; top: number; right: number; bottom: number }
    ): void {
        LightUtils.renderLightsBatch(
            overlappingLights,
            cameraOffset, screenBounds, this.tempLightmapContainer
        );
        this.app.renderer.render({
            container: this.tempLightmapContainer,
            target: this.lightmapTexture,
            clear: false
        });

        // Restore mask
        this.tempLightmapContainer.mask = null;
    }

    // Process any lights that exited fading out after all updates/renders
    private processPendingLightRemovals(): void {
        LightManager.instance.processPendingRemovals();
    }
    

    // @ts-ignore
    private updatePostProcessing(deltaTime: number) 
    {
        // Update CRT filter
        this.crtFilter.seed = Math.random(); // For regenerating noise for animation purposes
    
        // TODO Update any other filters
    }

    private updateDebugText() {
        if (!this.debugText) return;
        
        this.debugText.text = `FPS: ${Math.round(PIXI.Ticker.shared.FPS)}\n` +
                         `Player (World): [${Math.floor(this.player!.sprite.x)}, ${Math.floor(this.player!.sprite.y)}]\n` +
                         `Player (Current Tile): [${Math.floor(this.player!.sprite.x / Config.PixelsPerMeter)}, ${Math.floor(this.player!.sprite.y / Config.PixelsPerMeter)}]\n` +
                         `Camera Offset: [${Math.floor(this.worldContainer.x)}, ${Math.floor(this.worldContainer.y)}]\n` +
                         `Levels Completed: ${this.numLevelsCompleted}\n` +
                         `Seed: ${this.level!.getSeed()}\n` +
                         `Mask Update Time: ${this.maskUpdateTime.toFixed(2)}ms\n` +
                         `Light Render Time: ${this.lightRenderTime.toFixed(2)}ms`;
    }

    /**
     * Handles window resize events.
     * 
     * Updates the viewport dimensions, recalculates the visible world area, optionally updates the camera position, resizes backgrounds and overlays, updates lightmaps and render textures, and triggers any UI manager resize events.
     * @param {number} width - New width of the window in pixels.
     * @param {number} height - New height of the window in pixels.
     */
    onResize(width: number, height: number) {
        // Update viewport dimensions
        this.viewportWidth = width;
        this.viewportHeight = height;

        // Resize textures, render textures and graphical helper elements
        this.resizeTexturesAndGraphicalElements(width, height);
    
        // Optionally, recenter camera or update camera logic
        this.instantlyCenterCamera();
    }

    private resizeTexturesAndGraphicalElements(width: number, height: number) {
        // Recreate the lightmap texture to avoid artifacts
        if (this.lightmapTexture) {
            this.lightmapTexture.destroy(true);
        }
        this.lightmapTexture = PIXI.RenderTexture.create({ width, height });
        this.lightmapSprite.texture = this.lightmapTexture;
        this.lightmapSprite.width = width;
        this.lightmapSprite.height = height;
        this.lightmapSprite.anchor.set(0, 0); // Ensure anchor is top-left

        // Resize backgrounds or overlays used for various post processing effects (and other things)
        if (this.transparentBgRect) {
            this.transparentBgRect.width = width;
            this.transparentBgRect.height = height;
        }  
    }
}
