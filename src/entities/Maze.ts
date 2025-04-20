import * as Matter from 'matter-js';
import * as PIXI from 'pixi.js';

export class Maze {
    private walls: { body: Matter.Body, sprite: PIXI.Graphics }[]; // TODO Consider what happens when we move to sprite instead of PIXI.Graphics
    constructor(world: Matter.World, stage: PIXI.Container, mazeLayout: { x: number, y: number, width: number, height: number }[]) {
        this.walls = [];

        mazeLayout.forEach(wallData => {
            const { x, y, width, height } = wallData;

            const wall = Matter.Bodies.rectangle(x, y, width, height, { 
                isStatic: true,
                restitution: 0.95,
    friction: 0,
    frictionStatic: 0
            });
            Matter.World.add(world, wall);

            const sprite = new PIXI.Graphics();
            sprite.beginFill(0xffffff).drawRect(-width/2, -height/2, width, height).endFill(); // TODO Fix deprecation
            sprite.x = wall.position.x;
            sprite.y = wall.position.y;
            stage.addChild(sprite);

            this.walls.push({ body: wall, sprite });
        });
    }

    update() {
        // TODO Read below...
        // If walls move (dynamic maze), update here.
        // Normally walls don't move, so you can leave this empty.
    }
}
