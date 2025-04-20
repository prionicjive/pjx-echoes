import * as PIXI from 'pixi.js';
import * as Matter from 'matter-js';
import { InputManager } from './InputManager.ts';
import { Ball } from '../entities/Ball.ts';
import { Maze } from '../entities/Maze.ts';
import { MazeGenerator } from '../utils/MazeGenerator.ts';

export class Game {
    private app: PIXI.Application | null = null;;
    private engine: Matter.Engine;
    private world: Matter.World;
    private ball: Ball | null = null;
    private maze: Maze | null = null;
    
    // TODO See if input instance ever needs to be used
    //private input: InputManager;

    constructor() {
        this.engine = Matter.Engine.create();
        this.engine.gravity.scale = 0; // TODO Is there a better way to disable gravity?
        this.world = this.engine.world;
    }

    async init() {
        this.app = new PIXI.Application();
        await this.app.init({ width: 1280, height: 720 }); // TODO Fix deprecation
        document.body.appendChild(this.app.canvas); // TODO Fix deprecation

        this.ball = new Ball(this.world, this.app.stage);
        const mazeLayout = MazeGenerator.generate(); // Consider if there should be params passed in
        this.maze = new Maze(this.world, this.app.stage, mazeLayout);

        // TODO Likely need to assign this to an instance variable or property
        new InputManager(this.ball);

        // TODO How do I use 16.666ms as the time step AND limit the update delta to that?
        // TODO See if I can convert this to an arrow function
        this.app.ticker.add(this.update.bind(this));
        // TODO Handle additional setup if needed
    }

    update() {
        Matter.Engine.update(this.engine, 16.666);

        this.ball?.update();
    
        this.maze?.update();
    
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
