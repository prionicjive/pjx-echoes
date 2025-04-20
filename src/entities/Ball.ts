import * as Matter from 'matter-js';
import * as PIXI from 'pixi.js';

export class Ball {
    private body: Matter.Body;
    public sprite: PIXI.Graphics; // TODO Convert to sprite with an image from an assets folder

    constructor(world: Matter.World, stage: PIXI.Container) {
        // TODO Research params, particularly around friction and air friction
        // TODO Figure out how to spawn in a particular, configurable position
        this.body = Matter.Bodies.circle(1280 / 2, 720 / 2, 20, { 
            restitution: 0.95,
            friction: 0,
            frictionStatic: 0, 
            frictionAir: 0.001 
        });
        Matter.World.add(world, this.body);

        // TODO Understand how PIXI.Graphic generates a renderable entity
        this.sprite = new PIXI.Graphics(); // TODO Convert to sprite with an image from an assets folder
        this.sprite.beginFill(0xff0000).drawCircle(0, 0, 20).endFill(); // TODO Fix deprecation
        this.sprite.x = this.body.position.x;
        this.sprite.y = this.body.position.y;
        stage.addChild(this.sprite);
    }

    applyImpulseTowards(target: {x: number, y: number}) {
        // TODO Rewrite this to make it repulse from instead of attract to position
        const deltaX = this.body.position.x - target.x;
        const deltaY = this.body.position.y - target.y;
        const length = Math.hypot(deltaX, deltaY);
        const forceScale = 0.0025; // TODO Tune as needed

        Matter.Body.applyForce(this.body, this.body.position, {
            x: (deltaX / length) * forceScale,
            y: (deltaY / length) * forceScale
        });
    }

    update() {
        this.sprite.x = this.body.position.x;
        this.sprite.y = this.body.position.y;
        this.sprite.rotation = this.body.angle;
    }
}
