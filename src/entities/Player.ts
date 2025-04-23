import { Game } from '../core/Game';

import * as planck from 'planck-js';
import * as PIXI from 'pixi.js';

export class Player {
    private body: planck.Body;
    public sprite: PIXI.Graphics; // TODO Convert to sprite with an image from an assets folder

    constructor(world: planck.World, stage: PIXI.Container | undefined, x: number, y: number) {
        // Create player
        const playerRadius = Game.Config.Physics.Player.radius;

        this.body = world.createDynamicBody(planck.Vec2(x + 0.5, y + 0.5));
        this.body.setLinearDamping(Game.Config.Physics.Player.linearDamping);

        this.body.createFixture(new planck.Circle(playerRadius), {
            restitution: Game.Config.Physics.Player.restitution,
            friction: 0,
            density: 1,
            userData: "PLAYER",
            filterCategoryBits: Game.Config.Physics.Collision.categoryPlayer,
            filterMaskBits: Game.Config.Physics.Collision.categoryWall | Game.Config.Physics.Collision.categoryFinish
        });

        // TODO Understand how PIXI.Graphic generates a renderable entity
        this.sprite = new PIXI.Graphics(); // TODO Convert to sprite with an image / texture from an assets folder
        this.sprite.beginFill(0x00aaee).drawCircle(0, 0, playerRadius * Game.Config.PixelsPerMeter).endFill(); // TODO Fix deprecation
        this.sprite.x = this.body.getPosition().x * Game.Config.PixelsPerMeter;
        this.sprite.y = this.body.getPosition().y * Game.Config.PixelsPerMeter;
        stage?.addChild(this.sprite);
    }

    applyImpulseTowards(target: {x: number, y: number}) {
        // TODO Rewrite this to make it repulse from instead of attract to position
        // TODO How can we make sure we've properly map a click from screen coordinates to Box2D meter coordinates?
        // Convert target to world coordinates (meters)
        const playerPos = this.body.getPosition();
        const targetWorld = {
            x: target.x / Game.Config.PixelsPerMeter,
            y: target.y / Game.Config.PixelsPerMeter
        };
        const deltaX = playerPos.x - targetWorld.x;
        const deltaY = playerPos.y - targetWorld.y;
        const length = Math.hypot(deltaX, deltaY);

        // Tune this value for desired impulse strength
        const impulseScale = Game.Config.Physics.Player.impulseFactor;

        // Calculate impulse vector (direction * scale)
        const impulse = new planck.Vec2((deltaX / length) * impulseScale, (deltaY / length) * impulseScale);

        // Apply impulse at the center of mass
        this.body.applyLinearImpulse(impulse, this.body.getWorldCenter(), true);
    }

    update() {
        this.sprite.x = this.body.getPosition().x * Game.Config.PixelsPerMeter;
        this.sprite.y = this.body.getPosition().y * Game.Config.PixelsPerMeter;
        this.sprite.rotation = this.body.getAngle();
    }
}
