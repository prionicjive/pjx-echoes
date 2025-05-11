// Player.ts
/**
 * Represents the player entity in the game.
 * Handles physics body creation, sprite setup, and movement logic.
 *
 * @module Player
 */

import { Config } from '../config/Config';
import { EntityType, EntityUserData } from './types';
import { EntityUtils } from '../utils/EntityUtils';
import { Point } from '../utils/types';
import * as planck from 'planck';
import { PhysicsUtils } from '../utils/PhysicsUtils';
import { PointerState, SwipeState } from '../input/InputManager';
import { EntityContainers } from './BaseEntity';
import { DynamicEntity } from './DynamicEntity';
import { ParticleEffectsConfig } from '../config/ParticleEffectsConfig';
import { LightsConfig } from '../config/LightsConfig';
import { SpriteUtils } from '../utils/SpriteUtils';
import * as PIXI from 'pixi.js';
import { LightOwner } from '../light/Light';
import { LevelContext } from '../level/LevelContext';

export interface PlayerOptions { 
    spawnPoint: Point,
    containers: EntityContainers,
    levelContext: LevelContext
}

export class Player extends DynamicEntity implements LightOwner {
    constructor(options: PlayerOptions) {
        // Generate unique ID
        const id = EntityUtils.generateRandomId(Config.Player.type);

        // Create the sprite
        const sprite = SpriteUtils.createSprite({
            texture: PIXI.Texture.from(Config.Textures.player),
            x: options.spawnPoint.x * Config.PixelsPerMeter,
            y: options.spawnPoint.y * Config.PixelsPerMeter,
            width: Config.Player.radius * 2 * Config.PixelsPerMeter,
            height: Config.Player.radius * 2 * Config.PixelsPerMeter,
            color: Config.Player.color
        });

        // Create dynamic body
        const body = PhysicsUtils.createBody(options.levelContext.getPhysicsWorld(), {
            type: 'dynamic',
            position: new planck.Vec2(options.spawnPoint.x + Config.Player.radius, options.spawnPoint.y + Config.Player.radius),
            circle: { radius: Config.Player.radius },
            fixture: {
                friction: 0,
                density: 1,
                restitution: 0, // No bounce
                filterCategoryBits: Config.Physics.Collision.categoryPlayer,
                filterMaskBits: Config.Physics.Collision.categoryEdge
                    | Config.Physics.Collision.categorySentry
                    | Config.Physics.Collision.categoryWall
                    | Config.Physics.Collision.categoryFinishArea
                    | Config.Physics.Collision.categoryAnti
                    | Config.Physics.Collision.categoryTorch
            },
            linearDamping: Config.Physics.Player.linearDamping
        });

        super({
            id,
            sprite,
            body,
            particleEffectOptions: { ...ParticleEffectsConfig.PlayerTrail },
            containers: options.containers,
            lightOptions: { ...LightsConfig.PlayerLight },
            levelContext: options.levelContext
        });

        // Set user data with a self-referencing data
        body.setUserData({
            type: Config.Player.type,
            entity: this
        } as EntityUserData);
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
    // @ts-ignore
    update(deltaTime: number) {
        // Keep the sprite visually synced with the physics body
        this.sprite.x = (this.body.getPosition().x - Config.Player.radius) * Config.PixelsPerMeter;
        this.sprite.y = (this.body.getPosition().y - Config.Player.radius) * Config.PixelsPerMeter;
        this.sprite.rotation = this.body.getAngle();

        // Set the initial position of the particle effect
        this.particleEffect?.setEffectPosition(
            this.sprite.x + this.sprite.width / 2,
            this.sprite.y + this.sprite.height / 2
        );
    }

    onPickup(type: EntityType) {
        switch (type) {
            case Config.Torch.type:
                // Grow the light
                this.light?.increaseBaseRadius(
                    this.light.options.baseRadius + Config.Player.lightRadiusIncrement,
                    Config.Player.maxLightRadius,
                    Config.Player.lightChangeDuration
                );
                break;
            case Config.Anti.type:
                // Shrink the light
                this.light?.decreaseBaseRadius(
                    this.light.options.baseRadius - Config.Player.lightRadiusDecrement,
                    Config.Player.minLightRadius,
                    Config.Player.lightChangeDuration
                );
                break;
            case Config.Sentry.type:
                // Increase the age of the particle trail
                if(this.particleEffect) {
                    this.particleEffect.template.maxAge += Config.Player.particleTrailMaxAgeIncrement;
                    this.particleEffect.template.maxAge = Math.min(this.particleEffect.template.maxAge, Config.Player.particleTrailMaxAgeCap);
                }
                break;
            default:
                break;
        }
    }
}
