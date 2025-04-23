import { Game } from '../core/Game';

import * as planck from 'planck-js';
import * as PIXI from 'pixi.js';

// TODO Maybe have an implements for Entity that contain a body and sprite
export class Player {
    private body: planck.Body;
    public sprite: PIXI.Graphics;

    constructor(world: planck.World, levelContainer: PIXI.Container | null, x: number, y: number) {
        // Create player
        const playerRadius = Game.Config.Player.radius;
        const center = new planck.Vec2(x + Game.Config.Wall.size / 2, y + Game.Config.Wall.size / 2); // Place in the center of whatever tile space it is at
        this.body = world.createDynamicBody(center);
        this.body.setLinearDamping(Game.Config.Physics.Player.linearDamping);

        this.body.createFixture(new planck.Circle(playerRadius), {
            restitution: Game.Config.Physics.Player.restitution,
            friction: 0,
            density: 1,
            userData: "PLAYER",
            filterCategoryBits: Game.Config.Physics.Collision.categoryPlayer,
            filterMaskBits: Game.Config.Physics.Collision.categoryWall | Game.Config.Physics.Collision.categoryFinish
        });

        this.sprite = new PIXI.Graphics();
        this.sprite
            .circle(0, 0, playerRadius * Game.Config.PixelsPerMeter)
            .fill(Game.Config.Player.color);
        this.sprite.x = this.body.getPosition().x * Game.Config.PixelsPerMeter;
        this.sprite.y = this.body.getPosition().y * Game.Config.PixelsPerMeter;
        levelContainer?.addChild(this.sprite);
    }

    applyImpulseTowards(levelRelativePositionInPixels: {x: number, y: number}) {
        // Convert pixel to world coordinates (meters)
        const playerPos = this.body.getPosition();
       
        const deltaX = playerPos.x - (levelRelativePositionInPixels.x / Game.Config.PixelsPerMeter);
        const deltaY = playerPos.y - (levelRelativePositionInPixels.y / Game.Config.PixelsPerMeter);
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
