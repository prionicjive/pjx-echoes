import { BloomFilter, CRTFilter } from 'pixi-filters';
import * as PIXI from 'pixi.js';
import planck from 'planck';
import { Config } from '../config/Config.ts';
import { Player } from '../entities/Player.ts';
import { InputManager } from '../input/InputManager.ts';
import { Level } from '../level/Level.ts';
import { LightManager } from '../light/LightManager.ts';
import { ParticleEffectManager } from '../particles/ParticleEffectManager.ts';
import { LevelUtils } from '../utils/LevelUtils.ts';
import { PhysicsManager } from '../physics/PhysicManager.ts';
import { LidarManager } from '../lidar/LidarManager.ts';
import { DebugOverlay } from './DebugOverlay.ts';
import { MaskingSystem } from './MaskingSystem.ts';
import { CameraManager } from './CameraManager.ts';
import { LightRenderPipeline } from './LightRenderPipeline.ts';
import { CollisionDispatcher } from './CollisionDispatcher.ts';

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
    
    // Player view mode masking containers (owned here; passed to MaskingSystem/LightRenderPipeline)
    private entityContainerGroup!: PIXI.Container;
    private playerViewMask!: PIXI.Graphics;
    private playerLightPolygonMask!: PIXI.Graphics;

    // Subsystems
    private collisionDispatcher!: CollisionDispatcher;
    private cameraManager!: CameraManager;
    private maskingSystem!: MaskingSystem;
    private lightRenderPipeline!: LightRenderPipeline;
    private debugOverlay!: DebugOverlay;

    // LIDAR
    private lidarManager: LidarManager = new LidarManager();

    // Debug text
    private debugText!: PIXI.Text;

    // Need for viewport calculations
    private viewportWidth: number;
    private viewportHeight: number;

    // Interesting stats to keep track of
    private numLevelsCompleted: number = 0;

    // Deferred reset flag — set inside contact callbacks, acted on after world.step()
    private pendingReset: boolean = false;

    // Stable bound reference for world.on() / world.off() — delegates to collisionDispatcher at call time
    private readonly onBeginContactBound = (contact: planck.Contact) =>
        this.collisionDispatcher.handleContact(contact);

    constructor(app: PIXI.Application) {
        this.app = app;

        // Initialize input manager
        this.inputManager = new InputManager(app.canvas);

        // Instantiate the various PIXI containers
        this.initializeContainers();

        // Initialize collision dispatcher (depends on preEntitiesContainer from initializeContainers)
        this.collisionDispatcher = new CollisionDispatcher(
            this.preEntitiesContainer,
            () => { this.pendingReset = true; },
            () => { this.numLevelsCompleted++; }
        );

        // Initialize masking system (depends on Graphics/Container objects from initializeContainers)
        this.maskingSystem = new MaskingSystem(
            this.playerViewMask,
            this.playerLightPolygonMask,
            this.entityContainerGroup
        );

        // Initialize camera manager (depends on containers from initializeContainers)
        this.cameraManager = new CameraManager(
            this.worldContainer,
            this.lightsContainer,
            () => ({ width: this.viewportWidth, height: this.viewportHeight })
        );

        // Set up viewport dimensions (Will change on resize)
        this.viewportWidth = window.innerWidth;
        this.viewportHeight = window.innerHeight;

        this.initializeTexturesAndGraphicalElements(this.viewportWidth, this.viewportHeight);

        // Initialize light render pipeline (depends on textures from initializeTexturesAndGraphicalElements)
        this.lightRenderPipeline = new LightRenderPipeline(
            this.app.renderer as PIXI.Renderer,
            this.tempLightmapContainer,
            this.lightmapTexture,
            this.transparentBgRect,
            this.playerLightPolygonMask
        );

        // Create post-processing
        // TODO Find out how to dynamically alter these
        this.initializePostProcessingFilters();

        // Initialize debug text
        this.initializeDebugText();

        // Initialize debug overlay (depends on debugText, inputManager, lidarManager)
        this.debugOverlay = new DebugOverlay(
            this.debugText,
            this.inputManager,
            this.lightsContainer,
            this.levelGeometryContainer,
            this.lidarManager,
            () => ({ x: this.worldContainer.x, y: this.worldContainer.y }),
            () => ({
                numLevelsCompleted: this.numLevelsCompleted,
                maskUpdateTime: this.maskingSystem.getMaskUpdateTime(),
                lightRenderTime: this.lightRenderPipeline.getLightRenderTime(),
            }),
            (enabled: boolean) => { if (!enabled) this.maskingSystem.clearAllMasks(); },
            () => this.level?.getEdgesList() ?? []
        );

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
        // Null out mutable references in subsystems before any destruction
        this.collisionDispatcher.setPlayer(null);
        this.collisionDispatcher.setLevel(null);
        this.cameraManager.setPlayer(null);
        this.cameraManager.setLevel(null);
        this.maskingSystem.setPlayer(null);
        this.lightRenderPipeline.setPlayer(null);
        this.debugOverlay.setPlayer(null);
        this.debugOverlay.setLevel(null);

        // Tear down dynamic entities
        this.tearDownEntities();
        
        // Empty the various PIXI containers in order
        this.tearDownContainersInOrder();

        // Remove all lights
        LightManager.instance.removeAllLights();

        // Reset LIDAR state (clears active pulses/glows without destroying the Graphics object)
        this.lidarManager.reset();

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

        // Propagate mutable references to subsystems
        this.collisionDispatcher.setPlayer(this.player);
        this.collisionDispatcher.setLevel(this.level);
        this.cameraManager.setPlayer(this.player);
        this.cameraManager.setLevel(this.level);
        this.maskingSystem.setPlayer(this.player);
        this.lightRenderPipeline.setPlayer(this.player);
        this.debugOverlay.setPlayer(this.player);
        this.debugOverlay.setLevel(this.level);

        // Instantly center camera on player to avoid an initial soft follow
        this.cameraManager.instantlyCenterCamera();
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
     * Called every frame. Steps physics, updates entities, and handles camera movement.
     * @param {number} deltaTime - Time since the last frame, in seconds.
     */
    update(deltaTime: number) { 
        // Handle debugging input
        this.debugOverlay.handleDebugInput();

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
        this.cameraManager.updateCamera(deltaTime);

        // Update and render the lights
        this.lightRenderPipeline.updateAndRenderLights(
            this.cameraManager.getCameraOffset(),
            this.viewportWidth,
            this.viewportHeight
        );

        // Apply/clear the player-view mask on entity containers (must run after lights update the polygon)
        this.maskingSystem.updatePlayerViewMask();

        // Render LIDAR (uses camera offset, same as lights)
        this.renderLidar();

        // Update anything needed for post processing
        this.updatePostProcessing(deltaTime);

        // Update debug text
        if (Config.Debug.showDebugText) {
            this.debugOverlay.updateDebugText();
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

    private renderLidar() {
        this.lidarManager.render(this.lidarContainer);
    }

    // @ts-ignore
    private updatePostProcessing(deltaTime: number) 
    {
        // Update CRT filter
        this.crtFilter.seed = Math.random(); // For regenerating noise for animation purposes
    
        // TODO Update any other filters
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
        this.cameraManager.instantlyCenterCamera();
    }

    private resizeTexturesAndGraphicalElements(width: number, height: number) {
        // Recreate the lightmap texture to avoid artifacts
        if (this.lightmapTexture) {
            this.lightmapTexture.destroy(true);
        }
        this.lightmapTexture = PIXI.RenderTexture.create({ width, height });
        this.lightRenderPipeline.setLightmapTexture(this.lightmapTexture);
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
