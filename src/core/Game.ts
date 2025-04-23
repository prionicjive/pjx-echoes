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
            width: 80,
            height: 45
        },
        PixelsPerMeter: 16
    };

    private app: PIXI.Application | null = null;;
    private world: planck.World;
    private ball: Ball | null = null;
    private level: Level | null = null;
    
    // TODO See if input instance ever needs to be used
    //private input: InputManager;

    constructor() {
        this.world = new planck.World(new planck.Vec2(0, 0)); // No gravity
    }

    async init() {
        this.app = new PIXI.Application();
        await this.app.init({ width: Game.Config.ScreenDimensions.width, height: Game.Config.ScreenDimensions.height }); // TODO Fix deprecation
        document.body.appendChild(this.app.canvas); // TODO Fix deprecation

        // Generate a map
        const { map: levelMap, visitedFloors} = MapGenerator.generateFromCellularAutomata(Game.Config.WorldDimensions.width, Game.Config.WorldDimensions.height);
        MapGenerator.renderMap(levelMap); // TODO This is ONLY here for debug purposes
        this.level = new Level(this.world, this.app.stage, levelMap);

        // Find a random valid starting spot
        const [startX, startY] = visitedFloors[Math.floor(Math.random() * visitedFloors.length)].split(",");

        // Construct a ball at a given location
        this.ball = new Ball(this.world, this.app.stage, Number(startX), Number(startY));

        // TODO Likely need to assign this to an instance variable or property
         new InputManager(this.ball);

        // TODO How do I use 16.666ms as the time step AND limit the update delta to that?
        // TODO See if I can convert this to an arrow function
        this.app.ticker.add(this.update.bind(this));
        // TODO Handle additional setup if needed
    }

    update() {
        // Step the physics
        // TODO How do I use 16.666ms as the time step AND limit the update delta to that?
        this.world.step(1 / 60);

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
