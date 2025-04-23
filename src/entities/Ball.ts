import * as planck from 'planck-js';
import * as PIXI from 'pixi.js';

// TODO Figure out how to best centralize this
const PIXELS_PER_METER = 16;

export class Ball {
    private body: planck.Body;
    public sprite: PIXI.Graphics; // TODO Convert to sprite with an image from an assets folder

    constructor(world: planck.World, stage: PIXI.Container) {
        // Create ball
        // TODO Figure out if I externalize / centralize ball configuration
        const ballRadius = 0.48;

        // TODO Look at echoes for examples of how Box2D creates bodies and fixtures
        this.body = world.createDynamicBody(planck.Vec2(10, 10));
        this.body.createFixture(new planck.Circle(ballRadius), {
            restitution: 0.95,
            friction: 0,
            density: 1
        });

        // TODO Understand how PIXI.Graphic generates a renderable entity
        this.sprite = new PIXI.Graphics(); // TODO Convert to sprite with an image / texture from an assets folder
        this.sprite.beginFill(0x00aaee).drawCircle(0, 0, ballRadius * PIXELS_PER_METER).endFill(); // TODO Fix deprecation
        this.sprite.x = this.body.getPosition().x * PIXELS_PER_METER;
        this.sprite.y = this.body.getPosition().y * PIXELS_PER_METER;
        stage.addChild(this.sprite);
    }

    applyImpulseTowards(target: {x: number, y: number}) {
        // TODO Rewrite this to make it repulse from instead of attract to position
        // TODO How can we make sure we've properly map a click from screen coordinates to Box2D meter coordinates?
        // Convert target to world coordinates (meters)
        const ballPos = this.body.getPosition();
        const targetWorld = {
            x: target.x / PIXELS_PER_METER,
            y: target.y / PIXELS_PER_METER
        };
        const deltaX = ballPos.x - targetWorld.x;
        const deltaY = ballPos.y - targetWorld.y;
        const length = Math.hypot(deltaX, deltaY);

        // Tune this value for desired impulse strength
        const impulseScale = 3.0; // TODO Try different values but see what is done in echoes

        // Calculate impulse vector (direction * scale)
        const impulse = new planck.Vec2((deltaX / length) * impulseScale, (deltaY / length) * impulseScale);

        // Apply impulse at the center of mass
        this.body.applyLinearImpulse(impulse, this.body.getWorldCenter(), true);
    }

    update() {
        this.sprite.x = this.body.getPosition().x * PIXELS_PER_METER;
        this.sprite.y = this.body.getPosition().y * PIXELS_PER_METER;
        this.sprite.rotation = this.body.getAngle();
    }
}
