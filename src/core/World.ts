import * as PIXI from 'pixi.js';
import planck from 'planck';
import { CRTFilter, BloomFilter } from 'pixi-filters';
import { Player } from './Player.ts';
import { Level } from './Level.ts';
import { Segment } from '../utils/types';
import { Light, DynamicLight } from './Light.ts'; 
import { Config } from './Config.ts'; 
import { MapUtils } from '../utils/MapUtils.ts'; 
import { EntityUserData } from '../entities/types.ts'; 
import { InputManager } from '../input/InputManager.ts';

export class World {
    private app: PIXI.Application;
    private world: planck.World | null = null;
    private bodiesToDestroy: (planck.Body | null)[] = []; // Quirky need to destory bodies that are flagged as such inside contact callbacks
    private player: Player | null = null;
    private level: Level | null = null;
    private rawLevelMap: number[][] = []; // TODO Better place to put this?

    // Input related
    private inputManager: InputManager;
    
    // TODO Is this the better way to do edge detection?
    private mergedEdges: Segment[] = [];

    // PIXI Containers different rendering objects / layers
    private worldContainer!: PIXI.Container; // Added to stage directly
    private bgContainer!: PIXI.Container; // Here and below are added to the world container
    private lightsContainer!: PIXI.Container;
    private levelGeometryContainer!: PIXI.Container; 
    private preEntitiesContainer!: PIXI.Container;
    private entitiesContainer!: PIXI.Container;
    private postEntitiesContainer!: PIXI.Container;
    private fgContainer!: PIXI.Container; // Final world container / layer
    private uiContainer!: PIXI.Container; // Added lastly to the stage directly

    // Scratch containers never added anywhere, used for temporary rendering
    private tempLightmapContainer!: PIXI.Container; // Not directly added to world
    
    // Lights
    private dynamicLights: Light[] = [];
    private staticLights: Light[] = [];

    // Needed for lightmap rendering
    private lightmapTexture!: PIXI.RenderTexture; // Lightmap used for our render-to-texture'ing and post processing of lights
    private lightmapSprite!: PIXI.Sprite;
    private transparentBgRect!: PIXI.Graphics;

    // Filters
    // TODO Do we need to have these here?
    private crtFilter!: CRTFilter;
    private bloomFilter!: BloomFilter;

    // Need for viewport calculations
    private viewportWidth: number;
    private viewportHeight: number;

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

        // TODO Handle additional setup if needed

        // Lastly, reset / reinitialize the world
        this.reset();
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
        this.fgContainer = new PIXI.Container(); // Final world container / layer
        
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
            lineWidth: 0,
            lineContrast: 0,
            vignetting: 0,
            noise: 0.2,
            noiseSize: 1
        });

        this.bloomFilter = new BloomFilter({
            kernelSize: 5,
            quality: 4,
            resolution: 1.5,
            strength: 12
        });

        // Apply bloom to the world
        this.worldContainer.filters = [this.bloomFilter];

        // Apply the CRT filter to EVERYTHING
        this.app.stage.filters = [this.crtFilter];
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
        // NOW, it's time to add things / reinitialize the world
        // ------------------------
        this.setUpWorld();
    }

    private tearDownWorld() {
        // Tear down dynamic entities
        this.tearDownDynamicEntities();
        
        // Empty the various PIXI containers in order
        this.tearDownContainersInOrder();
        
        // Remove all bodies / fixtures from Planck world
        let body = this.world?.getBodyList();
        let counter = 0;
        while (body) {
            const nextBody = body.getNext();
            this.world?.destroyBody(body);
            counter++;
            body = nextBody;
        }
        this.bodiesToDestroy = [];

        // Remove any listeners
        if (this.world) {
            this.world.off('begin-contact', this.onBeginContact.bind(this));
        }
    }

    private setUpWorld() {
        // Add empty containers in the proper order / heiarchy, then we can add directly to the containers as needed
        this.setUpContainersInOrder();

        // Add the sprite that contains the render texture of the light map, to be draw sort of below everything else
        this.lightsContainer.addChild(this.lightmapSprite); // Do the lightmap before any of the other world entities are processed / rendered
        // TODO Any other render-to-textures that need to be at the screen level and NOT on the world (As the camera there moves)?

        // TODO This may be too drastic, but regenerate entire Planck world
        this.world = new planck.World(new planck.Vec2(0, 0)); // No gravity
        this.world.on('begin-contact', this.onBeginContact.bind(this));

        // Regenerate level and place player and finish tiles
        // const { map: levelMap, openSpaces} = MapUtils.generateFromCellularAutomata(
        //     Config.LevelDimensions.width, 
        //     Config.LevelDimensions.height,
        //     Config.MapGeneration.CellularAutomata.wallChance,
        //     Config.MapGeneration.CellularAutomata.smoothingSteps
        // );

        const { map: levelMap, openSpaces } = MapUtils.generateFromDrunkardsWalkWithSmoothing(
            Config.LevelDimensions.width,
            Config.LevelDimensions.height,
            Config.MapGeneration.DrunkardsWalkWithSmoothing.percentOpen,
            Config.MapGeneration.DrunkardsWalkWithSmoothing.maxWalkers,
            Config.MapGeneration.DrunkardsWalkWithSmoothing.walkerLifetime,
            Config.MapGeneration.DrunkardsWalkWithSmoothing.smoothingSteps
        );

        // Useful for look up information
        this.rawLevelMap = levelMap;

        // TODO Is this the better way to do edge detection?
        const horizontalEdges = MapUtils.createMergedHorizontalEdgesFromTilemap(this.rawLevelMap);
        const verticalEdges = MapUtils.createMergedVerticalEdgesFromTilemap(this.rawLevelMap)
        this.mergedEdges = [...horizontalEdges, ...verticalEdges];

        // Use text renderer for debug purposes
        // MapGenerator.renderMap(this.rawLevelMap); 

        // Construct the level and finish tiles (among other entities and lights)
        this.level = new Level(
            this.world, {
                levelGeometryContainer: this.levelGeometryContainer,
                entitiesContainer: this.entitiesContainer
            }, 
            this.rawLevelMap, 
            openSpaces,
            this.mergedEdges
        );

        // Find a random valid starting spot for player
        const [startX, startY] = openSpaces[Math.floor(Math.random() * openSpaces.length)].split(",");
        
        // Construct a player at a given location
        this.player = new Player(this.world, this.mergedEdges, this.entitiesContainer, {x: Number(startX), y: Number(startY)}, this.preEntitiesContainer);

        const playerPos = {
            x: this.player?.body.getPosition().x,
            y: this.player?.body.getPosition().y
        };

        // Store ALL the dynamic light and static light into two distinct arrays
        this.dynamicLights = this.player?.dynamicLight ? [this.player.dynamicLight] : [];
        this.staticLights = this.level.getLights();

        // Instantly center camera on player to avoid an initial soft follow
        this.instantlyCenterCamera();      
    }

    private tearDownDynamicEntities() {
        this.player?.destroy();
        
        // TODO Do we need to destroy the player light?
    }

    private tearDownContainersInOrder() {
        this.tempLightmapContainer.removeChildren();
        
        this.fgContainer.removeChildren();
        this.postEntitiesContainer.removeChildren();        
        this.entitiesContainer.removeChildren();
        this.preEntitiesContainer.removeChildren();
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
        this.worldContainer.addChild(this.levelGeometryContainer);
        
        // We MAY want to render without lights
        // TODO We might want multiple light containers are different layers with different light colors
        if (Config.Debug.drawLights) {
            this.worldContainer.addChild(this.lightsContainer); 
            
        }

        this.worldContainer.addChild(this.preEntitiesContainer);
        this.worldContainer.addChild(this.entitiesContainer);
        this.worldContainer.addChild(this.postEntitiesContainer);
        this.worldContainer.addChild(this.fgContainer); // End of world containers / layers
        
        this.app.stage.addChild(this.uiContainer); // Added lastly to the stage directly
    }
    
    /**
     * Handles collision events from Planck.js, such as the player reaching a finish tile
     * or interacting with walls.
     * @param {planck.Contact} contact - The collision contact event from Planck.js.
     */
    private onBeginContact(contact: planck.Contact) {
        const aData: EntityUserData = contact.getFixtureA().getBody().getUserData() as EntityUserData;
        const bData: EntityUserData = contact.getFixtureB().getBody().getUserData() as EntityUserData;

        if (
            (aData.type === Config.Player.type && bData.type === Config.Finish.type) ||
            (aData.type === Config.Finish.type && bData.type === Config.Player.type)
        ) {
            console.log("Player reached finish tile!");

            // Regenerate the world by reset game to reinitialize everything
            this.reset();
        } else if (
            (aData.type === Config.Player.type && bData.type === Config.Edges.type) ||
            (aData.type === Config.Edges.type && bData.type === Config.Player.type)
        ) {
            // TODO Handle player hitting a wall
            console.log("Player hit a wall!");
        } else if (
            (aData.type === Config.Player.type && bData.type === Config.Fuel.type) ||
            (aData.type === Config.Fuel.type && bData.type === Config.Player.type)
        ) {
            // Pick up and remove fuel
            console.log("Player picked up fuel!");

            const fuelEntity: EntityUserData = aData?.type === Config.Fuel.type ? aData : bData; // TODO Make this a little more foolproof
            this.entitiesContainer.removeChild(fuelEntity.sprite);

            // Remove body
            if (fuelEntity.body) {
                this.world?.destroyBody(fuelEntity.body);
            }

            // Remove light (if it exists)
            const index = this.staticLights.findIndex((light) => {
                return light.entityId === fuelEntity.id;
            });

            if (index !== -1) {
                const [light] = this.staticLights.splice(index, 1);
                light.mask.destroy();
                light.sprite.destroy();
            }

            // Lastly, flag the body of the fuel entity for destruction
            this.bodiesToDestroy.push(fuelEntity.body);
        }
    }

    /**
     * Instantly centers the camera on the player or the level, depending on which is smaller.
     * Used at game start to avoid jarring camera jumps.
     */
    private instantlyCenterCamera() {
        // If the level is smaller than the screen, center it. Otherwise, center on the player.
        if (!this.player || !this.worldContainer) return;

        const levelWidthInPixels = Config.LevelDimensions.width * Config.PixelsPerMeter;
        const levelHeightInPixels = Config.LevelDimensions.height * Config.PixelsPerMeter;
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
            this.worldContainer.x = Math.min(0, Math.max(this.worldContainer.x, this.viewportWidth - Config.LevelDimensions.width * Config.PixelsPerMeter));
         }

        if (levelHeightInPixels <= screenHeight) {
            this.worldContainer.y = (screenHeight - levelHeightInPixels) / 2;
        } else {
            // Camera target position: center the ball on the screen
            const screenCenterY = this.viewportHeight / 2;
            const targetY = -this.player.sprite.y + screenCenterY;
            this.worldContainer.y += (targetY - this.worldContainer.y);

            // Keep camera inside the world edges
            this.worldContainer.y = Math.min(0, Math.max(this.worldContainer.y, this.viewportHeight - Config.LevelDimensions.height * Config.PixelsPerMeter));
        }
    }

    /**
     * Called every frame. Steps physics, updates entities, and handles camera movement.
     * @param {number} deltaTime - Time since the last frame, in seconds.
     */
    update(deltaTime: number) {
        // Destroy any bodies that need to be destroyed
        this.processBodiesToDestroy();
        
        // Handle input, as this might affect the physics
        this.updateFromInput(deltaTime);

        // Step the physics
        this.world?.step(deltaTime);
    
        // Update player
        this.player?.update(deltaTime);
    
        // TODO Any other entities to update?    

        // Update level (For dynamic entities or geometry)
        this.level?.update();

        // Update camera
        this.updateCamera(deltaTime);

        // Update and render the lights
        this.updateAndRenderLights();

        // Update anything needed for post processing
        this.updatePostProcessing(deltaTime);
    }

    private processBodiesToDestroy() {
        this.bodiesToDestroy.forEach(body => {
            if (body) {
                this.world?.destroyBody(body);
            }
        });
        this.bodiesToDestroy = [];
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
        const swipe = this.inputManager.getSwipeState();
        const isTouchActive = this.inputManager.getIsTouchActive();
    
        this.player.handleInput(
            { pointer, swipe, isTouchActive },
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

        const levelWidthInPixels = Config.LevelDimensions.width * Config.PixelsPerMeter;
        const levelHeightInPixels = Config.LevelDimensions.height * Config.PixelsPerMeter;
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
            this.worldContainer.x = Math.min(0, Math.max(this.worldContainer.x, this.viewportWidth - Config.LevelDimensions.width * Config.PixelsPerMeter));
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
            this.worldContainer.y = Math.min(0, Math.max(this.worldContainer.y, this.viewportHeight - Config.LevelDimensions.height * Config.PixelsPerMeter));
        }
   
        // Lastly, reposition any container that needs to "stick" to the viewport (Lightmaps, etc)
        this.counteractWorldTransform();
    }

    private counteractWorldTransform() {
        this.lightsContainer.position.set(-this.worldContainer.x, -this.worldContainer.y);
    }

    private updateAndRenderLights() {
        // Get camera offset
        const cameraOffset = {
            x: -this.worldContainer.x,
            y: -this.worldContainer.y
        };

        // See if lights are on screen and render them if they are
        const screenLeft = -this.worldContainer.x;
        const screenTop = -this.worldContainer.y;
        const screenRight = screenLeft + this.viewportWidth;
        const screenBottom = screenTop + this.viewportHeight;

         // Render dynamic lights (Already updated during World.update() call)
         for (const light of this.dynamicLights) {
            if (!light) continue;
 
            if (this.isLightOnScreen(light, screenLeft, screenTop, screenRight, screenBottom)) {
                 light.sprite.visible = true;
                 light.mask.visible = true;
 
                 const screenX = (light.pos.x * Config.PixelsPerMeter) - cameraOffset.x;
                 const screenY = (light.pos.y * Config.PixelsPerMeter) - cameraOffset.y;
 
                 light.sprite.x = screenX;
                 light.sprite.y = screenY;
                 light.mask.x = screenX;
                 light.mask.y = screenY;
                 
                 light.render();
 
                 // Add sprite and mask to the lightmap container
                 this.tempLightmapContainer.addChild(light.sprite);
                 this.tempLightmapContainer.addChild(light.mask);
             } else {
                 light.sprite.visible = false;
                 light.mask.visible = false;
             }
        }

        // Process and update all static lights
        for (const light of this.staticLights) {
           if (!light) continue;
           
           light.update(null);

           if (this.isLightOnScreen(light, screenLeft, screenTop, screenRight, screenBottom)) {
                light.sprite.visible = true;
                light.mask.visible = true;

                const screenX = (light.pos.x * Config.PixelsPerMeter) - cameraOffset.x;
                const screenY = (light.pos.y * Config.PixelsPerMeter) - cameraOffset.y;

                light.sprite.x = screenX;
                light.sprite.y = screenY;
                light.mask.x = screenX;
                light.mask.y = screenY;
                
                light.render();

                // Add sprite and mask to the lightmap container
                this.tempLightmapContainer.addChild(light.sprite);
                this.tempLightmapContainer.addChild(light.mask);
            } else {
                light.sprite.visible = false;
                light.mask.visible = false;
            }
       }

       // Render all lights to the render texture (lightmap)
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

    private isLightOnScreen(light: Light, screenLeft: number, screenTop: number, screenRight: number, screenBottom: number): boolean {
        const x = light.sprite.x;
        const y = light.sprite.y;
        const r = light.radius * Config.PixelsPerMeter; // If radius is in meters
    
        return (
            x + r > screenLeft &&
            x - r < screenRight &&
            y + r > screenTop &&
            y - r < screenBottom
        );
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