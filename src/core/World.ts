import * as PIXI from 'pixi.js';
import planck from 'planck';
import { CRTFilter } from 'pixi-filters';
import { Player } from './Player.ts';
import { Level } from './Level.ts';
import { InputManager } from './InputManager.ts';
import { Segment } from '../utils/types';
import { Light, DynamicLight } from './Light.ts'; 
import { Config } from './Config.ts'; 
import { MapUtils } from '../utils/MapUtils.ts'; 
import { EntityUserData } from '../entities/types.ts'; 
import * as PixiParticles from '@barvynkoa/particle-emitter';

export class World {
    private world: planck.World | null = null;
    private bodiesToDestroy: (planck.Body | null)[] = []; // Quirky need to destory bodies that are flagged as such inside contact callbacks
    private player: Player | null = null;
    private level: Level | null = null;
    private input: InputManager;
    private rawLevelMap: number[][] = []; // TODO Better place to put this?

    // TODO Is this the better way to do edge detection?
    private mergedEdges: Segment[] = [];

    // PIXI Containers for different groups of entities
    // TODO Better way to do this?
    private app: PIXI.Application | null = null;
    private worldContainer: PIXI.Container;
    private lightmapContainer: PIXI.Container;

    // Partcile thangz
    private particlesContainer: PIXI.Container;
    private testEmitter: PixiParticles.Emitter | null = null;

    private blackBgRect: PIXI.Graphics;
    private whiteBgRect: PIXI.Graphics;

    // Lightmap used for our render-to-texture'ing and post processing of lights
    private lightmapTexture: PIXI.RenderTexture;
    private lightmapSprite: PIXI.Sprite;

    // Filters
    // TODO Do we need to have these here?
    private crtFilter: CRTFilter

    // Lights
    private playerLight: Light | null = null;
    private staticLights: Light[] = [];

    // Need for viewport calculations
    private viewportWidth: number;
    private viewportHeight: number;

    constructor(app: PIXI.Application) {
        this.app = app;
        
        this.input = new InputManager();

        // Set up input event handlers
        window.addEventListener('mousedown', this.handlePointerDown.bind(this));

        // Instantiate PIXI containers
        // TODO  Better way to do this?
        this.worldContainer = new PIXI.Container({isRenderGroup: true});

        // Set up viewport dimensions (Will change on resize)
        this.viewportWidth = window.innerWidth;
        this.viewportHeight = window.innerHeight;

        // Set up basic lightmap-related things
        // This doesn't get added to the world, it is just used for rendering lights to a texture
        const screenWidth = this.viewportWidth;
        const screenHeight = this.viewportHeight;
        this.lightmapTexture = PIXI.RenderTexture.create({ width: screenWidth, height: screenHeight });
        this.lightmapSprite = new PIXI.Sprite(this.lightmapTexture);
        this.lightmapSprite.blendMode = 'multiply'; // Can be either 'multiply' or 'add', depending on the desired effect
        this.lightmapSprite.width = screenWidth; // Make sure the lightmap sprite is as big as the screen
        this.lightmapSprite.height = screenHeight;
        this.lightmapContainer = new PIXI.Container();

        // Set up white and black background rects
        this.blackBgRect = new PIXI.Graphics();
        this.blackBgRect.rect(0, 0, screenWidth, screenHeight);
        this.blackBgRect.fill(0x000000);
        this.whiteBgRect = new PIXI.Graphics();
        this.whiteBgRect.rect(0, 0, screenWidth, screenHeight);
        this.whiteBgRect.fill(0xffffff);

        // Set up particle related things
        this.particlesContainer = new PIXI.Container();

        // Instantiate filters
        this.crtFilter = new CRTFilter({
            curvature: 1,
            lineWidth: 1.0,
            lineContrast: 0.25,
            vignetting: 0.3,
            vignettingAlpha: 0.4,
            noise: 0.2,
            noiseSize: 1,
            time: performance.now() * 0.001
        });

        // Set up post-processing
        // TODO Find out how to dynamically alter these
        this.setupPostProcessingFilters();

        // TODO Handle additional setup if needed

        // Lastly, reset / reinitialize the world
        this.reset();
    }

    /**
     * Sets up post-processing filters for the game.
     */
    setupPostProcessingFilters() {
        if(!this.app) {
            return;
        }

        // TODO Set up other filters

        // Apply to the lighting container
        this.app.stage.filters = [this.crtFilter];
    }

    /**
     * Resets the game state: clears containers, destroys physics bodies,
 * and generates a fresh level and player.
     */
    reset() {
        // TODO Consider how / what to reset or destroy and rebuild
        if (!this.app) return;

        // Empty PIXI containers
        // TODO Is there a more elegant way of doing this?
        this.particlesContainer.removeChildren();
        this.testEmitter?.destroy();
        this.lightmapContainer.removeChildren();
        this.worldContainer.removeChildren();
        this.app.stage.removeChildren();

        // Draw a full screen white texture for proper blending effects with post-processing
        this.app.stage.addChild(this.whiteBgRect);

        // Setup the world container as a big container that will hold the entire world with all its entities (like a big carpet I can slide around)
        // ORDER IS IMPORTANT
        this.app.stage.addChild(this.lightmapSprite); // Do the lightmap before any of the other world entities are processed / rendered
        // TODO Any other render-to-textures that need to be at the screen level and NOT on the world (As the camera there moves)?

        // Add this mondo world container add the only direct child to the  stage
        this.app.stage.addChild(this.worldContainer);

        // Set up particles
        // TODO Better break out how particle emitters are defined and used
        // TODO Figure out best way to add container and do LAYERING in the world
        this.worldContainer.addChild(this.particlesContainer);
        this.testEmitter = new PixiParticles.Emitter(this.particlesContainer, {
            lifetime: {
                min: 2.5,
                max: 4.5
            },
            frequency: 0.33,
            spawnChance: 1,
            particlesPerWave: 1,
            maxParticles: 1000,
            pos: {
                x: 300,
                y: 300
            },
            addAtBack: false,
            behaviors: [
                {
                    type: 'alpha',
                    config: {
                        alpha: {
                            list: [
                                {
                                    value: 0.8,
                                    time: 0
                                },
                                {
                                    value: 0.0,
                                    time: 1
                                }
                            ],
                        },
                    }
                },
                {
                    type: 'scale',
                    config: {
                        scale: {
                            list: [
                                {
                                    value: 32,
                                    time: 0
                                },
                                {
                                    value: 0,
                                    time: 1
                                }
                            ],
                        },
                    }
                },
                {
                    type: 'color',
                    config: {
                        color: {
                            list: [
                                {
                                    value: "fb1010",
                                    time: 0
                                },
                                {
                                    value: "f5b830",
                                    time: 1
                                }
                            ],
                        },
                    }
                },
                {
                    type: 'moveSpeed',
                    config: {
                        speed: {
                            list: [
                                {
                                    value: 200,
                                    time: 0
                                },
                                {
                                    value: 100,
                                    time: 1
                                }
                            ],
                            isStepped: false
                        },
                    }
                },
                {
                    type: 'rotationStatic',
                    config: {
                        min: 0,
                        max: 360
                    }
                },
                {
                    type: 'spawnShape',
                    config: {
                        type: 'torus',
                        data: {
                            x: 0,
                            y: 0,
                            radius: 10
                        }
                    }
                },
                {
                    type: 'textureSingle',
                    config: {
                        texture: PIXI.Texture.WHITE
                    }
                }
            ],
        });

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

        if (this.world) {
            this.world.off('begin-contact', this.onBeginContact.bind(this));
        }

        // TODO This may be too drastic, but regenerate entire Planck world
        this.world = new planck.World(new planck.Vec2(0, 0)); // No gravity
        this.world.on('begin-contact', this.onBeginContact.bind(this));

        // Regenerate level and place player and finish tiles
        const { map: levelMap, openSpaces} = MapUtils.generateFromCellularAutomata(
            Config.LevelDimensions.width, 
            Config.LevelDimensions.height,
            Config.MapGeneration.wallChance,
            Config.MapGeneration.smoothingSteps
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
            this.world,
            this.worldContainer, 
            this.rawLevelMap, 
            openSpaces,
            this.mergedEdges
        );

        this.staticLights = this.level.getLights();

        // Find a random valid starting spot for player
        const [startX, startY] = openSpaces[Math.floor(Math.random() * openSpaces.length)].split(",");
        
        // Construct a player at a given location
        this.player = new Player(this.world, this.worldContainer, {x: Number(startX), y: Number(startY)});

        const playerPos = {
            x: this.player?.body.getPosition().x,
            y: this.player?.body.getPosition().y
        };

        // TODO Set up dynamic lights, including player light
        this.playerLight = new DynamicLight(playerPos, this.mergedEdges, Config.PlayerLight);
        this.playerLight.entityId = this.player?.id;

        // Instantly center camera on player to avoid an initial soft follow
        this.instantlyCenterCamera();  
    }
    
    /**
     * Handles collision events from Planck.js, such as the player reaching a finish tile
     * or interacting with walls.
     * @param {planck.Contact} contact - The collision contact event from Planck.js.
     */
    onBeginContact(contact: planck.Contact) {
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
            this.worldContainer.removeChild(fuelEntity.sprite);

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
     instantlyCenterCamera() {
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
        // Destroy any flagged bodies
        this.bodiesToDestroy.forEach(body => {
            if (body) {
                this.world?.destroyBody(body);
            }
        });
        this.bodiesToDestroy = [];
        
        // Step the physics
        this.world?.step(deltaTime);
        // Update player and level
        this.player?.update();
        this.level?.update();

        // Update particles
        this.testEmitter?.update(deltaTime);

        // Update camera
        this.updateCamera(deltaTime);

        // Update and render the lights
        this.updateAndRenderLights();

        // TODO Any other entities to update?
    
        // TODO Update any changing values for filters
        this.crtFilter.seed = Math.random(); // For regenerating noise for animation purposes
    }

     /**
     * Handles camera movement each frame, using soft-follow logic and dead zone.
     */
     updateCamera(deltaTime: number) {
        // If the level is smaller than the screen, keep it centered.
        // Otherwise, use soft-follow logic with a dead zone to track the player.

        // Smooth camera follow
        if (!this.player || !this.player.sprite || !this.worldContainer) return;

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
    }

    /**
     * Handles mouse click events: translates screen coordinates to world coordinates
     * and applies an impulse to the player.
     * @param {MouseEvent} e - The mouse event triggered by user input.
     */
    handlePointerDown(e: MouseEvent) {
        if (!this.player || !this.worldContainer || !this.app) return;
    
        const rect = this.app.canvas.getBoundingClientRect();  // absolute position of canvas
        const screenPosition = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        }
        const levelPosition = { x: this.worldContainer.x, y: this.worldContainer.y };

        this.input.handleMouseClick(this.player, screenPosition, levelPosition);
    }

    updateAndRenderLights() {
        // TODO What about handling multiple lights?
        if (!this.playerLight ||  !this.player) return;

        const playerPos = {
            x: this.player?.body.getPosition().x,
            y: this.player?.body.getPosition().y
        };

        // Get camera offset
        const cameraOffset = {
            x: -this.worldContainer.x,
            y: -this.worldContainer.y
        };

        // Before rendering to texture, make sure we clear out any old lights from the lightmap container
        this.lightmapContainer.removeChildren();

        // Player light is always on screen
        this.playerLight.update(playerPos);
        this.playerLight.render();

        const screenX = (playerPos.x * Config.PixelsPerMeter) - cameraOffset.x;
        const screenY = (playerPos.y * Config.PixelsPerMeter) - cameraOffset.y;

        // Set the light sprite's position in screen space
        this.playerLight.sprite.x = screenX;
        this.playerLight.sprite.y = screenY;
        this.playerLight.mask.x = screenX;
        this.playerLight.mask.y = screenY;

        this.lightmapContainer.addChild(this.playerLight.sprite);
        this.lightmapContainer.addChild(this.playerLight.mask);

        // 
        // TODO Add any dynamic lights that need some more special update logic to their position, life span, etc...
        // TODO Consider hiding them when they are offscreen but still alive

        // See if lights are on screen and render them if they are
        const screenLeft = -this.worldContainer.x;
        const screenTop = -this.worldContainer.y;
        const screenRight = screenLeft + this.viewportWidth;
        const screenBottom = screenTop + this.viewportHeight;

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
                this.lightmapContainer.addChild(light.sprite);
                this.lightmapContainer.addChild(light.mask);
            } else {
                light.sprite.visible = false;
                light.mask.visible = false;
            }
       }

       // Render all lights to the render texture (lightmap)
       // Clear the RTT to white by rendering the white rectangle first
       this.app?.renderer.render({
            container: this.blackBgRect,
            target: this.lightmapTexture,
            clear: true // This clears to transparent, but then you immediately draw white over it
        });

        this.app?.renderer.render({
            container: this.lightmapContainer, 
            target: this.lightmapTexture, 
            clear: false
        });
        
        // Set the lightmap container back
        // Shift the lightmap container to take world "camera" into account
        this.lightmapContainer.x = 0;
        this.lightmapContainer.y = 0;
    }

    isLightOnScreen(light: Light, screenLeft: number, screenTop: number, screenRight: number, screenBottom: number): boolean {
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
    
        // Recreate the lightmap texture to avoid artifacts
        if (this.lightmapTexture) {
            this.lightmapTexture.destroy(true);
        }
        this.lightmapTexture = PIXI.RenderTexture.create({ width, height });
        this.lightmapSprite.texture = this.lightmapTexture;
        this.lightmapSprite.width = width;
        this.lightmapSprite.height = height;
        this.lightmapSprite.anchor.set(0, 0); // Ensure anchor is top-left
    
        // Resize backgrounds or overlays
        if (this.blackBgRect) {
            this.blackBgRect.width = width;
            this.blackBgRect.height = height;
        }
        if (this.whiteBgRect) {
            this.whiteBgRect.width = width;
            this.whiteBgRect.height = height;
        }
    
        // Optionally, recenter camera or update camera logic
        this.instantlyCenterCamera();
    }
}