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
import { PointerState, SwipeState } from '../input/InputManager';
import { EntityFactory } from '../entities/EntityFactory';

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
        const entity = EntityFactory.create({
            type: Config.Player.type as EntityType,
            id: EntityUtils.generateRandomId(Config.Player.type),
            x: spawnPoint.x,
            y: spawnPoint.y,
            radius: Config.Player.radius,
            color: Config.Player.color,
            linearDamping: Config.Physics.Player.linearDamping
        }, world);

        this.id = entity.id;
        this.sprite = entity.sprite;
        this.body = entity.body!;
        container.addChild(this.sprite);
    }

    handleInput(
        input: { pointer: PointerState, swipe: SwipeState, isTouchActive: boolean },
        context: {
            levelPosition: { x: number, y: number },
            playerScreenPos: { x: number, y: number }
        },
        deltaTime: number
    ) {
        // If a swipe just happened, skip any pointer logic and handle the swipe
        if (input.swipe.detected) {
            this.handleSwipe(input.swipe);
            return;
        }
        
        // If we are in touch mode, skip any pointer logic
        if (input.isTouchActive) {
            return;
        }

        // Convert pointer to level-relative position
        const pointerLevelRelativePositionInPixels = {
            x: input.pointer.screen.x - context.levelPosition.x,
            y: input.pointer.screen.y - context.levelPosition.y
        };
    
        const dx = context.playerScreenPos.x - input.pointer.screen.x;
        const dy = context.playerScreenPos.y - input.pointer.screen.y;
        const screenDistance = Math.sqrt(dx * dx + dy * dy);
    
        const screenThreshold = Config.PixelsPerMeter / 2; // pixels, tweak as needed
    
        if (input.pointer.isDown) {
            if (screenDistance > screenThreshold || !Config.Movement.instantlyChangeDirection) {
                if (Config.Movement.towardsPoint) {
                    this.applyForceTowards(pointerLevelRelativePositionInPixels, deltaTime);
                } else {
                    this.applyForceAwayFrom(pointerLevelRelativePositionInPixels, deltaTime);
                }
            } else {
                this.body.setLinearVelocity(new planck.Vec2(0, 0));
            }
        } else if (input.pointer.justReleased) {
            // On mouse up, stop player if close enough
            const playerPos = this.body.getPosition();
            const targetPos = new planck.Vec2(
                pointerLevelRelativePositionInPixels.x / Config.PixelsPerMeter,
                pointerLevelRelativePositionInPixels.y / Config.PixelsPerMeter
            );
            const delta = targetPos.clone().sub(playerPos);
            const distance = delta.length();
            if (distance <= 0.15) { // TODO Make this configurable as dead zone
                this.body.setLinearVelocity(new planck.Vec2(0, 0));
            }
        }
    }

    handleSwipe(swipe: SwipeState) {
     // Convert to world units
        let vx = swipe.velocityX / Config.PixelsPerMeter;
        let vy = swipe.velocityY / Config.PixelsPerMeter;
         
        // This exaggerates fast flicks, and damps slow ones
        const speed = Math.sqrt(vx * vx + vy * vy);
        const nonlinearScale = Math.pow(speed, Config.Movement.Gesture.swipeSpeedScaleExponent) / Math.pow(Config.Movement.Gesture.maxSpeed, Config.Movement.Gesture.maxSpeedScaleExponent);
        vx = (vx / speed) * nonlinearScale;
        vy = (vy / speed) * nonlinearScale;
         
        // Apply to player body
        this.body.setLinearVelocity(new planck.Vec2(vx, vy));   
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

        // Fetch the current linear velocity in its various components
        const currLinearVelocity = this.body.getLinearVelocity()
        const speed: number = Math.min(currLinearVelocity.length(), Config.Movement.maxSpeed);
        const direction: planck.Vec2 = PhysicsUtils.normalizeVector(currLinearVelocity);

        // If we want to instantly change the direction, the capped speed needs to scale the new direction unit vector
        if(Config.Movement.instantlyChangeDirection) {
            this.body.setLinearVelocity(PhysicsUtils.normalizeVector(force).mul(speed));
        } else {
            // Otherwise check to see we have a speed at all (Meaning we have non-zero / non-NaN linerar velocity)
            // If we DO, then (And ONLY then) do we adjust the linear velocity
            if(speed !== 0 && !isNaN(speed)) {
                this.body.setLinearVelocity(direction.mul(speed));
            }
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
