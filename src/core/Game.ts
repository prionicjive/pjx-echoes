import * as PIXI from 'pixi.js';
import planck from 'planck';
import { InputManager } from './InputManager.ts';
import { Player } from '../entities/Player.ts';
import { Level } from '../entities/Level.ts';
import { MapGenerator } from '../utils/MapGenerator.ts';

export class Game {
    // TODO Better structure all of this
    static Config = {
        ScreenDimensions: {
            width: 1280,
            height: 720
        },
        LevelDimensions: {
            width: 64,
            height: 36
        },
        PixelsPerMeter: 16,
        Camera: {
            lerpFactor: 0.05,
            DeadZone: {
                width: 320,
                height: 180
            }
        },
        Physics: {
            Collision: {
                categoryPlayer: 0x0001,
                categoryWall: 0x0002,
                categoryFinish: 0x0004
            },
            Player: {
                linearDamping: 0.35,
                impulseFactor: 1,
                restitution: 0.95,
            }
        },
        MapGeneration: {
            wallChance: 0.45, // Chance that any given space is a wall
            smoothingSteps: 4
        },
        FinishTiles: {
            min: 1,
            max: 7
        },
        Player: {
            color: 0x00aaee,
            radius: 0.48,
        },
        Wall: {
            color: 0x3d3d3d,
            size: 1
        },
        Finish: {
            color: 0x00ff00,
            size: 1
        },
        Textures: {
            player: 'assets/textures/player.png',
            wall: 'assets/textures/wall.png',
            finish: 'assets/textures/finish.png'
        }
    };

    private app: PIXI.Application | null = null;
    private levelContainer: PIXI.Container | null = null;
    private world: planck.World | null = null;
    private player: Player | null = null;
    private level: Level | null = null;
    private input: InputManager;

    constructor() {
        this.input = new InputManager();

        // Set up input event handlers
        window.addEventListener('mousedown', this.handlePointerDown.bind(this));
    }

    async init() {
        // Set up PIXI application
        this.app = new PIXI.Application();
        await this.app.init({ width: Game.Config.ScreenDimensions.width, height: Game.Config.ScreenDimensions.height });
        document.body.appendChild(this.app.canvas);

        // Load assets
        await this.loadAssets();

        // TODO See if I can convert this to an arrow function
        this.app.ticker.add(this.update.bind(this, this.app.ticker.deltaMS));

        // Call reset() to (re)initialize all the meaning bits
        this.reset();

        // TODO Handle additional setup if needed
    }

    async loadAssets() {
        // Load textures
        await PIXI.Assets.load(Game.Config.Textures.player);
        await PIXI.Assets.load(Game.Config.Textures.wall);
        await PIXI.Assets.load(Game.Config.Textures.finish);
    }

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

        // Use text renderer for debug purposes
        // MapGenerator.renderMap(levelMap); 

        // Construct the level and finish tiles (among other entities)
        this.level = new Level(this.world, this.levelContainer, levelMap, openSpaces);

        // Find a random valid starting spot for player
        const [startX, startY] = openSpaces[Math.floor(Math.random() * openSpaces.length)].split(",");

        // Construct a player at a given location
        this.player = new Player(this.world, this.levelContainer, Number(startX), Number(startY));

        // Instantly center camera on player to avoid an initial soft follow
        this.instantlyCenterCamera();  
    }

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

    // TODO Maybe a better place for this?
    instantlyCenterCamera() {
        if (this.player?.sprite && this.levelContainer) {
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

                // Move the camera a little bit toward the target each frame
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

                // Move the camera a little bit toward the target each frame
                this.levelContainer.y += (targetY - this.levelContainer.y);
                // Keep camera inside the world edges
                this.levelContainer.y = Math.min(0, Math.max(this.levelContainer.y, Game.Config.ScreenDimensions.height - Game.Config.LevelDimensions.height * Game.Config.PixelsPerMeter));
            }
        }
    }

    update(deltaMS: number) {
        const deltaTime = deltaMS / 1000;

        // Step the physics
        this.world?.step(deltaTime);

        // Update player and level
        this.player?.update();
        this.level?.update();

        // TODO Any other entities to update?

        // Smooth camera follow
        if (this.player?.sprite && this.levelContainer) {
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
                this.levelContainer.x -= moveX * Game.Config.Camera.lerpFactor;

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
                this.levelContainer.y -= moveY * Game.Config.Camera.lerpFactor;
                
                // Keep camera inside the world edges
                this.levelContainer.y = Math.min(0, Math.max(this.levelContainer.y, Game.Config.ScreenDimensions.height - Game.Config.LevelDimensions.height * Game.Config.PixelsPerMeter));
            }
        }
    }

    handlePointerDown(e: MouseEvent) {
        if (!this.player || !this.levelContainer) return;

        const levelPosition = { x: this.levelContainer.x, y: this.levelContainer.y };
        const screenPosition = { x: e.clientX, y: e.clientY };

        this.input.handleMouseClick(this.player, screenPosition, levelPosition);
    }
}
