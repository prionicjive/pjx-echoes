import { Game } from '../core/Game';
import { Entity } from './types';
import * as planck from 'planck';
import * as PIXI from 'pixi.js';

export class Player implements Entity {
    body: planck.Body;
    sprite: PIXI.Sprite;

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

        // Generate sprite
        this.sprite = PIXI.Sprite.from(Game.Config.Textures.player);
        this.sprite.x = (this.body.getPosition().x - Game.Config.Wall.size / 2) * Game.Config.PixelsPerMeter;
        this.sprite.y = (this.body.getPosition().y - Game.Config.Wall.size / 2) * Game.Config.PixelsPerMeter;
        this.sprite.width = 2 * playerRadius * Game.Config.PixelsPerMeter;
        this.sprite.height = 2 * playerRadius * Game.Config.PixelsPerMeter;
        this.sprite.tint = Game.Config.Player.color;
        
        console.log("Player : ", this.sprite.x, this.sprite.y)
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
        this.sprite.x = (this.body.getPosition().x - Game.Config.Wall.size / 2) * Game.Config.PixelsPerMeter;
        this.sprite.y = (this.body.getPosition().y - Game.Config.Wall.size / 2) * Game.Config.PixelsPerMeter;
        this.sprite.rotation = this.body.getAngle();
    }
}
