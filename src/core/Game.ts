// Game.ts
// Main game controller for pjx-echoes.
// Handles initialization, the main loop, entity management, input, and camera logic.
// Everything flows through here!

import * as PIXI from 'pixi.js';
import planck from 'planck';
import gsap from 'gsap';
import { PixiPlugin } from "gsap/PixiPlugin";
import { InputManager } from './InputManager.ts';
import { Player } from '../entities/Player.ts';
import { Level } from '../entities/Level.ts';
import { MapGenerator } from '../utils/MapGenerator.ts';
import { LightUtils } from '../utils/LightUtils.ts';
import { Segment } from '../utils/types';
import { Light } from '../entities/Light.ts';

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
        FinishTiles: {
            min: 1,           // Min/max number of finish tiles per level
            max: 7
        },
        Player: {
            color: 0x32ddff,  // Tint color for the player sprite
            radius: 0.48,     // Physics radius of the player (in meters)
        },
        Wall: {
            color: 0x444444,  // Tint color for walls
            size: 1           // Wall size (in meters)
        },
        Finish: {
            color: 0x2ddf03,  // Tint color for finish tiles
            size: 1           // Finish tile size (in meters)
        },
        OutOfBounds: {
            color: 0x32ddff,
            thickness: 0.5
        },
        Textures: {
            player: '/assets/textures/player.png', // Paths to texture assets
            wall: '/assets/textures/wall.png',
            finish: '/assets/textures/finish.png'
        },
        Light: {
            numRays: 360,
            radius: 10,
            radiusVariance: 3,
            defaultColor: 0xddbbbb,
            startColor: 0x55aaff,
            endColor: 0x77edff
        }
    };

    // TODO It's annoying so many of these are null, is there any better way to restructure this and reset the game level / world?
    private app: PIXI.Application | null = null;
    private levelContainer: PIXI.Container | null = null;
    private world: planck.World | null = null;
    private player: Player | null = null;
    private level: Level | null = null;
    private input: InputManager;
    private rawLevelMap: number[][] = []; // TODO Better place to put this?
    private validEdgesLookupTable: Segment[][][] = [];

    // Lights
    // TODO Better structured elsewhere?
    // TODO Does this need to be in its own container so that it's rendered differently order wise?
    private playerLight: Light | null = null;

    /**
     * Constructs the main Game instance.
     * Sets up the input manager and attaches event listeners for mouse input.
     */
    constructor() {
        this.input = new InputManager();

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
    }

    /**
     * Resets the game state: clears containers, destroys physics bodies,
     * and generates a fresh level and player.
     */
    reset() {
        // TODO Consider how / what to reset or destroy and rebuild

        // Empty PIXI containers
        // TODO Is there a more elegant way of doing this?
        this.levelContainer?.removeChildren();
        this.app?.stage.removeChildren();

        // Create a big container that will hold the entire level (like a big carpet I can slide around)
        this.levelContainer = new PIXI.Container();
        this.app?.stage.addChild(this.levelContainer);

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
        const { map: levelMap, openSpaces} = MapGenerator.generateFromCellularAutomata(
            Game.Config.LevelDimensions.width, 
            Game.Config.LevelDimensions.height,
            Game.Config.MapGeneration.wallChance,
            Game.Config.MapGeneration.smoothingSteps
        );

        // Useful for look up information
        this.rawLevelMap = levelMap;
        this.validEdgesLookupTable = LightUtils.getValidEdgesLookupForMap(this.rawLevelMap);

        // Use text renderer for debug purposes
        // MapGenerator.renderMap(this.rawLevelMap); 

        // Construct the level and finish tiles (among other entities)
        this.level = new Level(this.world, this.levelContainer, levelMap, openSpaces);

        // Find a random valid starting spot for player
        const [startX, startY] = openSpaces[Math.floor(Math.random() * openSpaces.length)].split(",");

        // Set up light related stuff
        // TODO Better way or place  to do this?
        this.playerLight = new Light(Game.Config.Light.radius);
        this.levelContainer.addChild(this.playerLight.sprite);
        this.levelContainer.addChild(this.playerLight.mask);
        
        // Construct a player at a given location
        this.player = new Player(this.world, this.levelContainer, {x: Number(startX), y: Number(startY)});

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
        if (!this.player || !this.levelContainer) return;

        const levelWidthInPixels = Game.Config.LevelDimensions.width * Game.Config.PixelsPerMeter;
        const levelHeightInPixels = Game.Config.LevelDimensions.height * Game.Config.PixelsPerMeter;
        const screenWidth = Game.Config.ScreenDimensions.width;
        const screenHeight = Game.Config.ScreenDimensions.height;

        // Center if level is smaller than screen
        if (levelWidthInPixels <= screenWidth) {
            this.levelContainer.x = (screenWidth - levelWidthInPixels) / 2;
        } else {
            // Camera target position: center the ball on the screen
            const screenCenterX = Game.Config.ScreenDimensions.width / 2;
            const targetX = -this.player.sprite.x + screenCenterX;
            this.levelContainer.x += (targetX - this.levelContainer.x);

            // Keep camera inside the world edges
            this.levelContainer.x = Math.min(0, Math.max(this.levelContainer.x, Game.Config.ScreenDimensions.width - Game.Config.LevelDimensions.width * Game.Config.PixelsPerMeter));
         }

        if (levelHeightInPixels <= screenHeight) {
            this.levelContainer.y = (screenHeight - levelHeightInPixels) / 2;
        } else {
            // Camera target position: center the ball on the screen
            const screenCenterY = Game.Config.ScreenDimensions.height / 2;
            const targetY = -this.player.sprite.y + screenCenterY;
            this.levelContainer.y += (targetY - this.levelContainer.y);

            // Keep camera inside the world edges
            this.levelContainer.y = Math.min(0, Math.max(this.levelContainer.y, Game.Config.ScreenDimensions.height - Game.Config.LevelDimensions.height * Game.Config.PixelsPerMeter));
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

        // Now, render the lights!
        this.renderLights();

        // Update camera
        this.updateCamera(deltaTime);

        // TODO Any other entities to update?
    }

    /**
     * Handles camera movement each frame, using soft-follow logic and dead zone.
     */
    updateCamera(deltaTime: number) {
        // If the level is smaller than the screen, keep it centered.
        // Otherwise, use soft-follow logic with a dead zone to track the player.

        // Smooth camera follow
        if (!this.player || !this.player.sprite || !this.levelContainer) return;

        const levelWidthInPixels = Game.Config.LevelDimensions.width * Game.Config.PixelsPerMeter;
        const levelHeightInPixels = Game.Config.LevelDimensions.height * Game.Config.PixelsPerMeter;
        const screenWidth = Game.Config.ScreenDimensions.width;
        const screenHeight = Game.Config.ScreenDimensions.height;

        // Center if level is smaller than screen
        if (levelWidthInPixels <= screenWidth) {
            this.levelContainer.x = (screenWidth - levelWidthInPixels) / 2;
        } else {
            // Camera target position: center the ball on the screen
            const screenCenterX = Game.Config.ScreenDimensions.width / 2;

            // World coordinates of screen center
            const cameraX = -this.levelContainer.x;

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
            this.levelContainer.x -= moveX * Game.Config.Camera.lerpFactor * deltaTime;

            // Keep camera inside the world edges
            this.levelContainer.x = Math.min(0, Math.max(this.levelContainer.x, Game.Config.ScreenDimensions.width - Game.Config.LevelDimensions.width * Game.Config.PixelsPerMeter));
        }

        if (levelHeightInPixels <= screenHeight) {
            this.levelContainer.y = (screenHeight - levelHeightInPixels) / 2;
        } else {
            // Camera target position: center the ball on the screen
            const screenCenterY = Game.Config.ScreenDimensions.height / 2;
            
            // World coordinates of screen center
            const cameraY = -this.levelContainer.y;

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
            this.levelContainer.y -= moveY * Game.Config.Camera.lerpFactor * deltaTime;
            
            // Keep camera inside the world edges
            this.levelContainer.y = Math.min(0, Math.max(this.levelContainer.y, Game.Config.ScreenDimensions.height - Game.Config.LevelDimensions.height * Game.Config.PixelsPerMeter));
        }
    }

    /**
     * Handles mouse click events: translates screen coordinates to world coordinates
     * and applies an impulse to the player.
     * @param {MouseEvent} e - The mouse event triggered by user input.
     */
    handlePointerDown(e: MouseEvent) {
        if (!this.player || !this.levelContainer || !this.app) return;
    
        const rect = this.app.canvas.getBoundingClientRect();  // absolute position of canvas
        const screenPosition = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        }
        const levelPosition = { x: this.levelContainer.x, y: this.levelContainer.y };

        this.input.handleMouseClick(this.player, screenPosition, levelPosition);
    }

    renderLights() {
        // Push rendering to the Light object itself

        // TODO What about handling multiple lights?
        if (!this.playerLight ||  !this.player) return;

        const playerPos = {
            x: this.player?.body.getPosition().x,
            y: this.player?.body.getPosition().y
        };

        // Build out the light points in world space (Meters)
        const validEdges = LightUtils.lookupValidEdgesForArea(this.validEdgesLookupTable, playerPos, this.playerLight.radius);
        const lightPoints = LightUtils.buildLightPolygon(playerPos, validEdges, Game.Config.Light.numRays, this.playerLight.radius);

        // Update light sprite to be under where the player
        this.playerLight.sprite.width = this.playerLight.radius * 2 * Game.Config.PixelsPerMeter;
        this.playerLight.sprite.height = this.playerLight.radius * 2 * Game.Config.PixelsPerMeter;
        this.playerLight.sprite.x = playerPos.x * Game.Config.PixelsPerMeter;
        this.playerLight.sprite.y = playerPos.y * Game.Config.PixelsPerMeter;
        
        // Draw mask
        this.playerLight.mask.clear();

        this.playerLight.mask.moveTo(playerPos.x * Game.Config.PixelsPerMeter, playerPos.y * Game.Config.PixelsPerMeter);
        for (const pt of lightPoints) {
            this.playerLight.mask.lineTo(pt.point.x * Game.Config.PixelsPerMeter, pt.point.y * Game.Config.PixelsPerMeter);
        }

        this.playerLight.mask.lineTo(lightPoints[0].point.x * Game.Config.PixelsPerMeter, lightPoints[0].point.y * Game.Config.PixelsPerMeter);
        this.playerLight.mask.fill();
    }
}
