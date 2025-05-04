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
import { PhysicsUtils } from '../utils/PhysicsUtils';

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
        const center = new planck.Vec2(spawnPoint.x + 0.5, spawnPoint.y + 0.5);

        // Generate sprite for the player
        this.sprite = PIXI.Sprite.from(Config.Textures.player);
        // Position the sprite to match the physics body
        this.sprite.x = center.x * Config.PixelsPerMeter;
        this.sprite.y = center.y * Config.PixelsPerMeter;
        this.sprite.width = 2 * 0.5 * Config.PixelsPerMeter; // TODO This assme the player's radius is roughly 0.5 meters
        this.sprite.height = 2 * 0.5 * Config.PixelsPerMeter;
        this.sprite.tint = Config.Player.color;

        
        this.body = world.createDynamicBody(center);
        this.body.setLinearDamping(Config.Physics.Player.linearDamping);

        // Add a circular fixture for collisions
        this.body.createFixture(new planck.Circle(playerRadius), {
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

    applyForceTowards(levelRelativePositionInPixels: Point, deltaTime: number) {
        // Convert pixel coordinates to world (meter) coordinates
        const playerPos = this.body.getPosition();
        
        // Calculate normalized force vector
        const force = PhysicsUtils.calculateForceVector(
            playerPos, 
            new planck.Vec2(
                levelRelativePositionInPixels.x / Config.PixelsPerMeter, 
                levelRelativePositionInPixels.y / Config.PixelsPerMeter
            ), 
            Config.Movement.forceFactorPerSecond * deltaTime
        );

        // If we want to instantly change the direction, linear velocity magnitude needs to be 
        // preserved and then used to scale the new direction unit vector
        if(Config.Movement.instantlyChangeDirection) {
            let speed = this.body.getLinearVelocity().length();

            // Cap to max speed
            if(speed > Config.Movement.maxSpeed) {
                speed = Config.Movement.maxSpeed;
            }

            this.body.setLinearVelocity(PhysicsUtils.normalizeVector(force).mul(speed));
        }

        // Apply force at the center of mass
        this.body.applyForceToCenter(force);
    }

    applyForceAwayFrom(levelRelativePositionInPixels: Point, deltaTime: number) {
        // Convert pixel coordinates to world (meter) coordinates
        const playerPos = this.body.getPosition();
        
        // Calculate normalized force vector
        const force = PhysicsUtils.calculateForceVector(
            new planck.Vec2(
                levelRelativePositionInPixels.x / Config.PixelsPerMeter, 
                levelRelativePositionInPixels.y / Config.PixelsPerMeter
            ),
            playerPos, 
            Config.Movement.forceFactorPerSecond * deltaTime
        );

        // Apply force at the center of mass
        this.body.applyForceToCenter(force);
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
        
        // Calculate normalized force vector
        const impulse = PhysicsUtils.calculateForceVector(
            playerPos, 
            new planck.Vec2(
                levelRelativePositionInPixels.x / Config.PixelsPerMeter, 
                levelRelativePositionInPixels.y / Config.PixelsPerMeter
            ), 
            Config.Movement.impulseFactor
        );
        // Apply impulse at the center of mass
        this.body.applyLinearImpulse(impulse, this.body.getWorldCenter(), true);
    }

    /**
     * Applies an impulse to the player body away from the given pixel position.
     * Used to move the player in response to input.
     *
     * @param {Point} levelRelativePositionInPixels - Target position in pixels, relative to the level.
     */
    applyImpulseAwayFrom(levelRelativePositionInPixels: Point) {
        // Convert pixel coordinates to world (meter) coordinates
        const playerPos = this.body.getPosition();
        
        // Calculate normalized force vector
        const impulse = PhysicsUtils.calculateForceVector(
            new planck.Vec2(
                levelRelativePositionInPixels.x / Config.PixelsPerMeter, 
                levelRelativePositionInPixels.y / Config.PixelsPerMeter
            ),
            playerPos, 
            Config.Movement.impulseFactor
        );
        // Apply impulse at the center of mass
        this.body.applyLinearImpulse(impulse, this.body.getWorldCenter(), true);
    }

    /**
     * Updates the player's sprite position to match the physics body.
     * Should be called every frame.
     */
    update() {
        // Keep the sprite visually synced with the physics body
        this.sprite.x = (this.body.getPosition().x - 0.5) * Config.PixelsPerMeter;
        this.sprite.y = (this.body.getPosition().y - 0.5) * Config.PixelsPerMeter;
        this.sprite.rotation = this.body.getAngle();
    }
}
