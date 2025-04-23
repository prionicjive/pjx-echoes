import * as PIXI from 'pixi.js';
import planck from 'planck-js';
import { InputManager } from './InputManager.ts';
import { Ball } from '../entities/Ball.ts';
import { Level } from '../entities/Level.ts';
import { MapGenerator } from '../utils/MapGenerator.ts';

export class Game {
    // TODO Make the internals readonly
    static Config = {
        // TODO Add useful config options here
        ScreenDimensions: {
            width: 1280,
            height: 720
        },
        WorldDimensions: {
            width: 160,
            height: 90
        },
        PixelsPerMeter: 8,
        Physics: {
            CategoryPlayer: 0x0001,
            CategoryWall: 0x0002,
            CategoryFinish: 0x0004,
        },
        FinishTiles: {
            min: 1,
            max: 7
        }
    };

    private app: PIXI.Application | null = null;;
    private world: planck.World | null = null;
    private ball: Ball | null = null;
    private level: Level | null = null;
    private input: InputManager;

    constructor() {
        this.input = new InputManager();
    }

    async init() {
        this.app = new PIXI.Application();
        await this.app.init({ width: Game.Config.ScreenDimensions.width, height: Game.Config.ScreenDimensions.height }); // TODO Fix deprecation
        document.body.appendChild(this.app.canvas); // TODO Fix deprecation

        // TODO How do I use 16.666ms as the time step AND limit the update delta to that?
        // TODO See if I can convert this to an arrow function
        this.app.ticker.add(this.update.bind(this));

        // Call reset() to (re)initialize all the meaning bits
        this.reset();

        // TODO Handle additional setup if needed
    }

    reset() {
        // Empty PIXI stage
        this.app?.stage.removeChildren();

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

        // TODO Regenerate level and place player and finish tiles
        // Generate a map
        const { map: levelMap, visitedFloors} = MapGenerator.generateFromCellularAutomata(Game.Config.WorldDimensions.width, Game.Config.WorldDimensions.height);
        MapGenerator.renderMap(levelMap); // TODO This is ONLY here for debug purposes
        this.level = new Level(this.world, this.app?.stage, levelMap, visitedFloors);

        // Find a random valid starting spot for player
        // TODO Better place to do this?
        const [startX, startY] = visitedFloors[Math.floor(Math.random() * visitedFloors.length)].split(",");

        // Construct a ball at a given location
        this.ball = new Ball(this.world, this.app?.stage, Number(startX), Number(startY));

        // Reset the Input Manager (to clear out event listener and have latest player object)
        this.input.reset(this.ball);
        
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

    update() {
        // Step the physics
        // TODO How do I use 16.666ms as the time step AND limit the update delta to that?
        this.world?.step(1 / 60);

        this.ball?.update();
    
        this.level?.update();
    
        // TODO Figure out camera follow system
        // // Smooth camera follow
    // const cameraSpeed = 0.0; // TODO Lower = smoother

    // const targetPivotX: number | undefined = this.ball?.sprite.x;
    // const targetPivotY: number | undefined = this.ball?.sprite.y;

        // (this.app && targetPivotX) && (this.app.stage.pivot.x += (targetPivotX - this.app.stage.pivot.x) * cameraSpeed);
        // (this.app && targetPivotY) && (this.app.stage.pivot.y += (targetPivotY - this.app.stage.pivot.y) * cameraSpeed);
        // this.app?.stage.position.set(this.app?.renderer.width / 2, this.app?.renderer.height / 2);
    }
}
