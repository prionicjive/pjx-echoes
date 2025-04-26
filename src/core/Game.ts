// Game.ts
// Main game controller for pjx-echoes.
// Handles initialization, the main loop, entity management, input, and camera logic.
// Everything flows through here!

import * as PIXI from 'pixi.js';
import { CRTFilter } from 'pixi-filters';
import planck from 'planck';
import gsap from 'gsap';
import { PixiPlugin } from "gsap/PixiPlugin";
import { InputManager } from './InputManager.ts';
import { Player } from '../entities/Player.ts';
import { Level } from '../entities/Level.ts';
import { MapUtils } from '../utils/MapUtils.ts';
import { Point, Segment } from '../utils/types';
import { Light, DynamicLight } from '../entities/Light.ts';

export class Game {
    // Centralized game configuration
    // Tweak these values to adjust screen size, world generation, physics, and asset paths.
    static Config = {
        ScreenDimensions: {
            width: 1280,     // Size of the visible game window (in pixels)
            height: 720
        },
        LevelDimensions: {
            width: 64,       // Width of the generated level (in grid units)
            height: 64
        },
        PixelsPerMeter: 16, // How many pixels represent one physics meter
        Camera: {
            lerpFactor: 1.5, // Smoothing factor for camera movement (0 = slow, 1 = instant)
            DeadZone: {
                width: 320,   // Camera doesn't move unless player leaves this zone
                height: 180
            }
        },
        Physics: {
            Collision: {
                categoryPlayer: 0x0001, // Bitmasks for Planck.js collision filtering
                categoryWall: 0x0002,
                categoryFinish: 0x0004
            },
            Player: {
                linearDamping: 0.35,    // How quickly the player slows down
                impulseFactor: 1,       // How strong the impulse is on click
                restitution: 0.95,      // Bounciness
            }
        },
        MapGeneration: {
            wallChance: 0.45, // Chance that any given space is a wall
            smoothingSteps: 4 // How many times to smooth the map
        },
        Player: {
            color: 0x32ddff,  // Tint color for the player sprite
            radius: 0.48,     // Physics radius of the player (in meters)
        },
        Wall: {
            color: 0x444444,  // Tint color for walls
            size: 1,          // Wall size (in meters)
        },
        Torch: {
            color: 0xdfb503,  // Tint color for torches
            size: 1           // Torch size (in meters)
        },
        Finish: {
            color: 0x2ddf03,  // Tint color for finish tiles
            size: 1           // Finish tile size (in meters)
        },
        Boundaries: {
            color: 0x444444,
            thickness: 2
        },
        Textures: {
            player: '/assets/textures/player.png', // Paths to texture assets
            wall: '/assets/textures/wall.png',
            torch: '/assets/textures/torch.png',
            finish: '/assets/textures/finish.png'
        },
        PlayerLight: {
            numRays: 360,
            radius: 10,
            radiusVariance: 5,
            alpha: 0.5,
            alphaVariance: 0.4,
            startColor: 0x55aaff,
            endColor: 0x77edff
        },
        FinishLight: {
            numRays: 360,
            radius: 10,
            radiusVariance: 5,
            alpha: 0.5,
            alphaVariance: 0.4,
            startColor: 0x2ddf03,
            endColor: 0x27ffc3
        },
        TorchLight: {
            numRays: 360,
            radius: 5,
            radiusVariance: 2.5,
            alpha: 0.5,
            alphaVariance: 0.4,
            startColor: 0xdfb503,
            endColor: 0xab3347
        },
        FinishTilesDensity: 0.001,
        TorchesDensity: 0.007
    };

    // TODO It's annoying so many of these are null, is there any better way to restructure this and reset the game level / world?
    private app: PIXI.Application | null = null;
    private world: planck.World | null = null;
    private player: Player | null = null;
    private level: Level | null = null;
    private input: InputManager;
    private rawLevelMap: number[][] = []; // TODO Better place to put this?

    // TODO Is this the better way to do edge detection?
    private mergedEdges: Segment[] = [];

    // PIXI Containers for different groups of entities
    // TODO Better way to do this?
    private worldContainer: PIXI.Container;
    private wallsContainer: PIXI.Container;
    private edgesContainer: PIXI.Container;
    private playerContainer: PIXI.Container;
    private finishTilesContainer: PIXI.Container;
    private torchesContainer: PIXI.Container;
    private lightsContainer: PIXI.Container;

    // Filters
    // TODO Do we need to have these here?
    private crtFilter: CRTFilter

    // Lights
    // TODO Better structured elsewhere?
    // TODO Does this need to be in its own container so that it's rendered differently order wise?
    private playerLight: Light | null = null;
    private finishLights: Light[] = [];
    private torchLights: Light[] = [];

    /**
     * Constructs the main Game instance.
     * Sets up the input manager and attaches event listeners for mouse input.
     */
    constructor() {
        this.input = new InputManager();

        // Instantiate PIXI containers
        // TODO  Better way to do this?
        this.worldContainer = new PIXI.Container();
        this.wallsContainer = new PIXI.Container();
        this.edgesContainer = new PIXI.Container();
        this.playerContainer = new PIXI.Container();
        this.finishTilesContainer = new PIXI.Container();
        this.torchesContainer = new PIXI.Container();
        this.lightsContainer = new PIXI.Container();

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

        // Set up input event handlers
        window.addEventListener('mousedown', this.handlePointerDown.bind(this));
    }

    /**
     * Initializes the PIXI application, loads all required assets,
     * and starts the main game loop.
     * @async
     * @returns {Promise<void>}
     */
    async init() {
        // Set up PIXI application
        this.app = new PIXI.Application();
        await this.app.init({ width: Game.Config.ScreenDimensions.width, height: Game.Config.ScreenDimensions.height });
        document.body.appendChild(this.app.canvas);

        // Register the GSAP Pixi plugin
        gsap.registerPlugin(PixiPlugin);

        // Give the plugin a reference to the PIXI object
        PixiPlugin.registerPIXI(PIXI);

        // Preload textures before starting the game loop to avoid rendering glitches.
        await this.loadAssets();

        // Set up post-processing
        // TODO Find out how to dynamically alter these
        this.setupPostProcessingFilters();

        // Start the main loop
    this.app.ticker.add(this.update.bind(this, this.app.ticker.deltaMS));
    this.reset();

        // TODO Handle additional setup if needed
    }

    /**
     * Loads all texture assets needed for the game before gameplay begins.
     * @async
     * @returns {Promise<void>}
     */
    async loadAssets() {
        // Load textures
        await PIXI.Assets.load(Game.Config.Textures.player);
        await PIXI.Assets.load(Game.Config.Textures.wall);
        await PIXI.Assets.load(Game.Config.Textures.finish);
        await PIXI.Assets.load(Game.Config.Textures.torch);
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

        // Empty PIXI containers
        // TODO Is there a more elegant way of doing this?
        this.wallsContainer.removeChildren();
        this.edgesContainer.removeChildren();
        this.playerContainer.removeChildren();
        this.finishTilesContainer.removeChildren();
        this.torchesContainer.removeChildren();
        this.lightsContainer.removeChildren();
        this.worldContainer.removeChildren();
        this.app?.stage.removeChildren();

        // Setup the world container as a big container that will hold the entire world with all its entities (like a big carpet I can slide around)
        // ORDER IS IMPORTANT
        this.worldContainer.addChild(this.wallsContainer);
        this.worldContainer.addChild(this.edgesContainer);
        this.worldContainer.addChild(this.lightsContainer);
        this.worldContainer.addChild(this.finishTilesContainer);
        this.worldContainer.addChild(this.torchesContainer);
        this.worldContainer.addChild(this.playerContainer);

        // Add this mondo world container add the only direct child to the  stage
        this.app?.stage.addChild(this.worldContainer);

        // Remove all bodies / fixtures from Planck world
        let body = this.world?.getBodyList();
        let counter = 0;
        while (body) {
            const nextBody = body.getNext();
            this.world?.destroyBody(body);
            counter++;
            body = nextBody;
        }

        if (this.world) {
            this.world.off('begin-contact', this.onBeginContact.bind(this));
        }

        // TODO This may be too drastic, but regenerate entire Planck world
        this.world = new planck.World(new planck.Vec2(0, 0)); // No gravity
        this.world.on('begin-contact', this.onBeginContact.bind(this));

        // Regenerate level and place player and finish tiles
        const { map: levelMap, openSpaces} = MapUtils.generateFromCellularAutomata(
            Game.Config.LevelDimensions.width, 
            Game.Config.LevelDimensions.height,
            Game.Config.MapGeneration.wallChance,
            Game.Config.MapGeneration.smoothingSteps
        );

        // Useful for look up information
        this.rawLevelMap = levelMap;

        // TODO Is this the better way to do edge detection?
        const horizontalEdges = MapUtils.createMergedHorizontalEdgesFromTilemap(this.rawLevelMap, Game.Config.Wall.size);
        const verticalEdges = MapUtils.createMergedVerticalEdgesFromTilemap(this.rawLevelMap, Game.Config.Wall.size)
        this.mergedEdges = [...horizontalEdges, ...verticalEdges];

        // Use text renderer for debug purposes
        // MapGenerator.renderMap(this.rawLevelMap); 

        // Construct the level and finish tiles (among other entities)
        // TODO Add the walls and finish tiles to their own containers
        this.level = new Level(
            this.world, { 
                wallsContainer: this.wallsContainer, 
                finishTilesContainer: this.finishTilesContainer,
                edgesContainer: this.edgesContainer,
                torchesContainer: this.torchesContainer
            }, 
            this.rawLevelMap, 
            openSpaces,
            this.mergedEdges
        );

        // Find a random valid starting spot for player
        const [startX, startY] = openSpaces[Math.floor(Math.random() * openSpaces.length)].split(",");
        
        // Construct a player at a given location
        this.player = new Player(this.world, this.playerContainer, {x: Number(startX), y: Number(startY)});

        const playerPos = {
            x: this.player?.body.getPosition().x,
            y: this.player?.body.getPosition().y
        };

        // Set up light related stuff
        // TODO Better way or place  to do this?
        this.playerLight = new DynamicLight(playerPos, this.mergedEdges, Game.Config.PlayerLight);
        this.lightsContainer.addChild(this.playerLight.sprite);
        this.lightsContainer.addChild(this.playerLight.mask);

        // Set up lights for finish tiles
        // TODO This is a bit of a hack, but it works for now
        this.finishLights = [];
        const finishTiles = this.level?.getFinishTiles();

        if (finishTiles) {
            for (const tile of finishTiles) {
                const finishLight = new DynamicLight({
                    x: tile.body.getPosition().x + Game.Config.Wall.size / 2, 
                    y: tile.body.getPosition().y + Game.Config.Wall.size / 2
                },
                this.mergedEdges,
                 Game.Config.FinishLight);
                this.lightsContainer.addChild(finishLight.sprite);
                this.lightsContainer.addChild(finishLight.mask);
                this.finishLights.push(finishLight);
            }
        }

        // Set up torch lights
        // TODO This is a bit of a hack, but it works for now
        this.torchLights = [];
        const torches = this.level?.getTorches();

        if (torches) {
            for (const torch of torches) {
                const pos: Point = {
                    x: torch.sprite.x / Game.Config.PixelsPerMeter + Game.Config.Torch.size / 2,
                    y: torch.sprite.y / Game.Config.PixelsPerMeter + Game.Config.Torch.size / 2
                }
                const torchLight = new DynamicLight(pos, this.mergedEdges, Game.Config.TorchLight);
                this.lightsContainer.addChild(torchLight.sprite);
                this.lightsContainer.addChild(torchLight.mask);
                this.torchLights.push(torchLight);
            }
        }

        // Instantly center camera on player to avoid an initial soft follow
        this.instantlyCenterCamera();  
    }
    
    /**
     * Handles collision events from Planck.js, such as the player reaching a finish tile
     * or interacting with walls.
     * @param {planck.Contact} contact - The collision contact event from Planck.js.
     */
    onBeginContact(contact: planck.Contact) {
        const fixtureA = contact.getFixtureA();
        const fixtureB = contact.getFixtureB();

        const aType = fixtureA.getUserData();
        const bType = fixtureB.getUserData();

        if (
            (aType === "PLAYER" && bType === "FINISH") ||
            (aType === "FINISH" && bType === "PLAYER")
        ) {
            // TODO Handle player reaching finish tile
            //console.log("Player reached finish tile!");

            // Reset game to reinitialize everything
            this.reset();
        } else if (
            (aType === "PLAYER" && bType === "WALL") ||
            (aType === "WALL" && bType === "PLAYER")
        ) {
            // TODO Handle player hitting a wall
            //console.log("Player hit a wall!");
        }
    }

    /**
     * Instantly centers the camera on the player or the level, depending on which is smaller.
     * Used at game start to avoid jarring camera jumps.
     */
     instantlyCenterCamera() {
        // If the level is smaller than the screen, center it. Otherwise, center on the player.
        if (!this.player || !this.worldContainer) return;

        const levelWidthInPixels = Game.Config.LevelDimensions.width * Game.Config.PixelsPerMeter;
        const levelHeightInPixels = Game.Config.LevelDimensions.height * Game.Config.PixelsPerMeter;
        const screenWidth = Game.Config.ScreenDimensions.width;
        const screenHeight = Game.Config.ScreenDimensions.height;

        // Center if level is smaller than screen
        if (levelWidthInPixels <= screenWidth) {
            this.worldContainer.x = (screenWidth - levelWidthInPixels) / 2;
        } else {
            // Camera target position: center the ball on the screen
            const screenCenterX = Game.Config.ScreenDimensions.width / 2;
            const targetX = -this.player.sprite.x + screenCenterX;
            this.worldContainer.x += (targetX - this.worldContainer.x);

            // Keep camera inside the world edges
            this.worldContainer.x = Math.min(0, Math.max(this.worldContainer.x, Game.Config.ScreenDimensions.width - Game.Config.LevelDimensions.width * Game.Config.PixelsPerMeter));
         }

        if (levelHeightInPixels <= screenHeight) {
            this.worldContainer.y = (screenHeight - levelHeightInPixels) / 2;
        } else {
            // Camera target position: center the ball on the screen
            const screenCenterY = Game.Config.ScreenDimensions.height / 2;
            const targetY = -this.player.sprite.y + screenCenterY;
            this.worldContainer.y += (targetY - this.worldContainer.y);

            // Keep camera inside the world edges
            this.worldContainer.y = Math.min(0, Math.max(this.worldContainer.y, Game.Config.ScreenDimensions.height - Game.Config.LevelDimensions.height * Game.Config.PixelsPerMeter));
        }
    }

    /**
     * Called every frame. Steps physics, updates entities, and handles camera movement.
     * @param {number} deltaMS - Time since the last frame, in milliseconds.
     */
    update(deltaMS: number) {
        const deltaTime = deltaMS / 1000;

        // Step the physics
        this.world?.step(deltaTime);

        // Update player and level
        this.player?.update();
        this.level?.update();

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

        const levelWidthInPixels = Game.Config.LevelDimensions.width * Game.Config.PixelsPerMeter;
        const levelHeightInPixels = Game.Config.LevelDimensions.height * Game.Config.PixelsPerMeter;
        const screenWidth = Game.Config.ScreenDimensions.width;
        const screenHeight = Game.Config.ScreenDimensions.height;

        // Center if level is smaller than screen
        if (levelWidthInPixels <= screenWidth) {
            this.worldContainer.x = (screenWidth - levelWidthInPixels) / 2;
        } else {
            // Camera target position: center the ball on the screen
            const screenCenterX = Game.Config.ScreenDimensions.width / 2;

            // World coordinates of screen center
            const cameraX = -this.worldContainer.x;

            // Get ball position relative to camera center
            const offsetX = this.player.sprite.x - cameraX;

            // Only move camera if the ball is outside the dead zone
            let moveX = 0;

            if (offsetX < screenCenterX - Game.Config.Camera.DeadZone.width / 2) {
                moveX = offsetX - (screenCenterX - Game.Config.Camera.DeadZone.width / 2);
            } else if (offsetX > screenCenterX + Game.Config.Camera.DeadZone.width / 2) {
                moveX = offsetX - (screenCenterX + Game.Config.Camera.DeadZone.width / 2);
            }

            // Move the camera a little bit toward the target each frame
            this.worldContainer.x -= moveX * Game.Config.Camera.lerpFactor * deltaTime;

            // Keep camera inside the world edges
            this.worldContainer.x = Math.min(0, Math.max(this.worldContainer.x, Game.Config.ScreenDimensions.width - Game.Config.LevelDimensions.width * Game.Config.PixelsPerMeter));
        }

        if (levelHeightInPixels <= screenHeight) {
            this.worldContainer.y = (screenHeight - levelHeightInPixels) / 2;
        } else {
            // Camera target position: center the ball on the screen
            const screenCenterY = Game.Config.ScreenDimensions.height / 2;
            
            // World coordinates of screen center
            const cameraY = -this.worldContainer.y;

            // Get ball position relative to camera center
            const offsetY = this.player.sprite.y - cameraY;

            // Only move camera if the ball is outside the dead zone
            let moveY = 0;

            if (offsetY < screenCenterY - Game.Config.Camera.DeadZone.height / 2) {
                moveY = offsetY - (screenCenterY - Game.Config.Camera.DeadZone.height / 2);
            } else if (offsetY > screenCenterY + Game.Config.Camera.DeadZone.height / 2) {
                moveY = offsetY - (screenCenterY + Game.Config.Camera.DeadZone.height / 2);
            }

            // Move the camera a little bit toward the target each frame
            this.worldContainer.y -= moveY * Game.Config.Camera.lerpFactor * deltaTime;
            
            // Keep camera inside the world edges
            this.worldContainer.y = Math.min(0, Math.max(this.worldContainer.y, Game.Config.ScreenDimensions.height - Game.Config.LevelDimensions.height * Game.Config.PixelsPerMeter));
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

       this.playerLight.update(playerPos);
       this.playerLight.render();

       // TODO Is something static even if it's radius might fluctuate??
       for (const light of this.finishLights) {
           light.update(null);
           light.render();

       }

       for (const light of this.torchLights) {
           light.update(null);
           light.render();
       }
    }
}
