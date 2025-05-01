// Player.ts
/**
 * Represents the player entity in the game.
 * Handles physics body creation, sprite setup, and movement logic.
 *
 * @module Player
 */

import { Config } from './Config';
import { Entity, EntityType } from '../entities/types';
import { EntityUtils } from '../utils/EntityUtils';
import { Point } from '../utils/types';
import * as planck from 'planck';
import * as PIXI from 'pixi.js';

/**
 * The Player class implements the controllable player character.
 * Handles physics, rendering, and input-based movement.
 */
export class Player implements Entity {
    id: string;
    body: planck.Body;
    sprite: PIXI.Sprite;

    /**
     * Creates a new Player instance, including its physics body and sprite.
     * Adds the sprite to the provided PIXI container.
     *
     * @param {planck.World} world - The Planck.js world to add the player to.
     * @param {PIXI.Container} container - Where to add the player's sprite for rendering.
     * @param {Point} spawnPoint - Initial position (in world units).
     */
    constructor(world: planck.World, container: PIXI.Container, spawnPoint: Point) {
        this.id = EntityUtils.generateRandomId(Config.Player.type);
        
        // Place player in the center of the tile
        const playerRadius = Config.Player.radius;
        const center = new planck.Vec2(spawnPoint.x + Config.Wall.size / 2, spawnPoint.y + Config.Wall.size / 2);

        // Generate sprite for the player
        this.sprite = PIXI.Sprite.from(Config.Textures.player);
        // Position the sprite to match the physics body
        this.sprite.x = center.x * Config.PixelsPerMeter;
        this.sprite.y = center.y * Config.PixelsPerMeter;
        this.sprite.width = 2 * playerRadius * Config.PixelsPerMeter;
        this.sprite.height = 2 * playerRadius * Config.PixelsPerMeter;
        this.sprite.tint = Config.Player.color;

        
        this.body = world.createDynamicBody(center);
        this.body.setLinearDamping(Config.Physics.Player.linearDamping);

        // Add a circular fixture for collisions
        this.body.createFixture(new planck.Circle(playerRadius), {
            restitution: Config.Physics.Player.restitution,
            friction: 0,
            density: 1,
            filterCategoryBits: Config.Physics.Collision.categoryPlayer,
            filterMaskBits: Config.Physics.Collision.categoryEdge | Config.Physics.Collision.categoryWall | Config.Physics.Collision.categoryFinish | Config.Physics.Collision.categoryFuel
        });

        this.body.setUserData({
            type: Config.Player.type as EntityType,
            id: this.id,
            sprite: this.sprite,
            body: this.body
        });
        
        container.addChild(this.sprite);
    }

    /**
     * Applies an impulse to the player body toward the given pixel position.
     * Used to move the player in response to input.
     *
     * @param {Point} levelRelativePositionInPixels - Target position in pixels, relative to the level.
     */
    applyImpulseTowards(levelRelativePositionInPixels: Point) {
        // Convert pixel coordinates to world (meter) coordinates
        const playerPos = this.body.getPosition();
        
        // Calculate vector from player to target
        const deltaX = playerPos.x - (levelRelativePositionInPixels.x / Config.PixelsPerMeter);
        const deltaY = playerPos.y - (levelRelativePositionInPixels.y / Config.PixelsPerMeter);
        const length = Math.hypot(deltaX, deltaY);

        // Tune this value for desired impulse strength
        const impulseScale = Config.Physics.Player.impulseFactor;

        // Calculate normalized impulse vector
        const impulse = new planck.Vec2((deltaX / length) * impulseScale, (deltaY / length) * impulseScale);

        // Apply impulse at the center of mass
        this.body.applyLinearImpulse(impulse, this.body.getWorldCenter(), true);
    }

    /**
     * Updates the player's sprite position to match the physics body.
     * Should be called every frame.
     */
    update() {
        // Keep the sprite visually synced with the physics body
        this.sprite.x = (this.body.getPosition().x - Config.Wall.size / 2) * Config.PixelsPerMeter;
        this.sprite.y = (this.body.getPosition().y - Config.Wall.size / 2) * Config.PixelsPerMeter;
        this.sprite.rotation = this.body.getAngle();
    }
}
