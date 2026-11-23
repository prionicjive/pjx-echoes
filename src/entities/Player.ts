// Player.ts
/**
 * Represents the player entity in the game.
 * Handles physics body creation, sprite setup, and movement logic.
 *
 * @module Player
 */

import * as planck from 'planck';
import { Config } from '../config/Config';
import { PlayerActions } from '../input/ActionMapping';
import { LidarManager } from '../lidar/LidarManager.ts';
import { LevelContext } from '../level/LevelContext';
import { DynamicLight } from '../light/Light';
import { ParticleEffect } from '../particles/ParticleEffect';
import { PhysicsUtils } from '../utils/PhysicsUtils';
import { Point } from '../utils/types';
import { BaseEntity, EntityContainers } from './BaseEntity';
import { EntityType, BodyType } from './types';
import { EntitiesConfig } from '../config/EntitiesConfig';
import { EntityUtils } from '../utils/EntityUtils';

export interface PlayerOptions {
    spawnPoint: Point,
    containers: EntityContainers,
    levelContext: LevelContext,
    lidarManager: LidarManager,
}

export class Player extends BaseEntity {
    private readonly levelContext: LevelContext;
    private readonly lidarManager: LidarManager;

    constructor(options: PlayerOptions) {
        const preset = EntitiesConfig.Player;
        const center = Player.centerOf(options.spawnPoint, preset);
        const sprite = Player.buildSprite(preset, options.spawnPoint);
        const body = Player.buildBody(preset, center, options.levelContext.getPhysicsWorld());

        // Create the light
        const light = new DynamicLight(
            {...body.getPosition()},
            options.levelContext.getEdgesList(),
            { ...EntitiesConfig.Player.light! }
        );

        // Create the particle effect
        const particleEffect = new ParticleEffect({
            ...EntitiesConfig.Player.particleEffect!,
        });

        super({
            type: EntityType.Player,
            sprite,
            body,
            light,
            particleEffect,
            containers: options.containers
        });

        this.levelContext = options.levelContext;
        this.lidarManager = options.lidarManager;

        // Set initial position
        EntityUtils.syncEffectToSprite(this);

        // Play the effect
        this.particleEffect!.play();
    }

    handleInput(
        actions: PlayerActions,
        context: {
            levelPosition: { x: number, y: number },
            playerScreenPos: { x: number, y: number }
        },
        deltaTime: number
    ) {
        if (actions.fireLidar) {
            const pos = this.body!.getPosition();
            this.lidarManager.fire({ x: pos.x, y: pos.y }, this.levelContext.getEdgesList());
        }

        // 1. Attractor logic while touch / mouse is held
        if (actions.attractorScreenPos) {
            const target = actions.attractorScreenPos;
            const levelRelative = {
                x: target.x - context.levelPosition.x,
                y: target.y - context.levelPosition.y
            };
            const dx = context.playerScreenPos.x - target.x;
            const dy = context.playerScreenPos.y - target.y;
            const screenDistance = Math.sqrt(dx * dx + dy * dy);
            const screenThreshold = Config.PixelsPerMeter / 2;

            if (screenDistance > screenThreshold || !Config.Movement.instantlyChangeDirection) {
                if (Config.Movement.towardsPoint) {
                    this.applyForceTowards(levelRelative, deltaTime);
                } else {
                    this.applyForceAwayFrom(levelRelative, deltaTime);
                }
            } else {
                this.body!.setLinearVelocity(new planck.Vec2(0, 0));
            }
            return;
        }

        // 2. Flick on touch release
        if (actions.swipeVelocityPx) {
            this.handleSwipe(actions.swipeVelocityPx);
            return;
        }

        // 3. Non-swipe release: stop the player if the release point is close enough
        if (actions.pointerReleasedScreenPos) {
            const released = actions.pointerReleasedScreenPos;
            const playerPos = this.body!.getPosition();
            const targetPos = new planck.Vec2(
                (released.x - context.levelPosition.x) / Config.PixelsPerMeter,
                (released.y - context.levelPosition.y) / Config.PixelsPerMeter
            );
            if (targetPos.sub(playerPos).length() <= 0.15) { // TODO Make this configurable as dead zone
                this.body!.setLinearVelocity(new planck.Vec2(0, 0));
            }
        }

        // 4. Analog stick / WASD: continuous force in the given direction, scaled by magnitude
        if (actions.moveVector) {
            const { x, y } = actions.moveVector;
            const magnitude = Math.hypot(x, y);
            if (magnitude > 0) {
                this.applyForceInDirection(x / magnitude, y / magnitude, deltaTime * Math.min(1, magnitude));
            }
        }
    }

    private handleSwipe(velocityInPixelsPerSecond: { x: number, y: number }) {
        // Convert to meters (Physics space)
        let velocityInMetersPerSecond = { 
            x: velocityInPixelsPerSecond.x / Config.PixelsPerMeter, 
            y: velocityInPixelsPerSecond.y / Config.PixelsPerMeter
        };
         
        // This exaggerates fast flicks, and damps slow ones
        const speedMetersPerSecond = Math.sqrt(
            velocityInMetersPerSecond.x * velocityInMetersPerSecond.x + velocityInMetersPerSecond.y * velocityInMetersPerSecond.y
        );
        
        if (speedMetersPerSecond === 0) return;

        // Calculate the non-linear scale to boost and smooth flickers / swipes
        const nonlinearScale = Math.pow(
            speedMetersPerSecond, 
            Config.Movement.Gesture.swipeSpeedScaleExponent) / Math.pow(
                Config.Movement.Gesture.maxSpeedMetersPerSecond, 
                Config.Movement.Gesture.maxSpeedScaleExponent
            );
        
        let vx = (velocityInMetersPerSecond.x / speedMetersPerSecond);
        vx *= nonlinearScale;
        let vy = (velocityInMetersPerSecond.y / speedMetersPerSecond);
        vy *= nonlinearScale;
         
        // Apply to player body
        this.body!.setLinearVelocity(new planck.Vec2(vx, vy));   
    }

    private applyForceTowards(levelRelativePositionInPixels: Point, deltaTime: number) {
        // Convert pixel coordinates to world (meter) coordinates
        const playerPos = this.body!.getPosition();
        
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
        const currLinearVelocity = this.body!.getLinearVelocity()
        const speed: number = Math.min(currLinearVelocity.length(), Config.Movement.maxSpeed);
        const direction: planck.Vec2 = PhysicsUtils.normalizeVector(currLinearVelocity);

        // If we want to instantly change the direction, the capped speed needs to scale the new direction unit vector
        if(Config.Movement.instantlyChangeDirection) {
            this.body!.setLinearVelocity(PhysicsUtils.normalizeVector(force).mul(speed));
        } else {
            // Otherwise check to see we have a speed at all (Meaning we have non-zero / non-NaN linerar velocity)
            // If we DO, then (And ONLY then) do we adjust the linear velocity
            if(speed !== 0 && !isNaN(speed)) {
                this.body!.setLinearVelocity(direction.mul(speed));
            }
        }

        // Apply force at the center of mass
        this.body!.applyForceToCenter(force);
    }

    private applyForceInDirection(dx: number, dy: number, deltaTime: number) {
        const magnitude = Config.Movement.forceFactorPerSecond * deltaTime;
        const force = new planck.Vec2(dx * magnitude, dy * magnitude);

        const currLinearVelocity = this.body!.getLinearVelocity();
        const speed: number = Math.min(currLinearVelocity.length(), Config.Movement.maxSpeed);
        const direction: planck.Vec2 = PhysicsUtils.normalizeVector(currLinearVelocity);

        if (Config.Movement.instantlyChangeDirection) {
            this.body!.setLinearVelocity(PhysicsUtils.normalizeVector(force).mul(speed));
        } else {
            if (speed !== 0 && !isNaN(speed)) {
                this.body!.setLinearVelocity(direction.mul(speed));
            }
        }

        this.body!.applyForceToCenter(force);
    }

    private applyForceAwayFrom(levelRelativePositionInPixels: Point, deltaTime: number) {
        // Convert pixel coordinates to world (meter) coordinates
        const playerPos = this.body!.getPosition();
        
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
        this.body!.applyForceToCenter(force);
    }

    /**
     * Applies an impulse to the player body toward the given pixel position.
     * Used to move the player in response to input.
     *
     * @param {Point} levelRelativePositionInPixels - Target position in pixels, relative to the level.
     */
    // @ts-ignore
    private applyImpulseTowards(levelRelativePositionInPixels: Point) {
        // Convert pixel coordinates to world (meter) coordinates
        const playerPos = this.body!.getPosition();
        
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
        this.body!.applyLinearImpulse(impulse, this.body!.getWorldCenter(), true);
    }

    /**
     * Applies an impulse to the player body away from the given pixel position.
     * Used to move the player in response to input.
     *
     * @param {Point} levelRelativePositionInPixels - Target position in pixels, relative to the level.
     */
    // @ts-ignore
    private applyImpulseAwayFrom(levelRelativePositionInPixels: Point) {
        // Convert pixel coordinates to world (meter) coordinates
        const playerPos = this.body!.getPosition();
        
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
        this.body!.applyLinearImpulse(impulse, this.body!.getWorldCenter(), true);
    }

    /**
     * Updates the player's sprite position to match the physics body.
     * Should be called every frame.
     */
    override update(_deltaTime: number) {
        // Keep the sprite visually synced with the physics body
        this.sprite.x = (this.body!.getPosition().x - Config.Player.radius) * Config.PixelsPerMeter;
        this.sprite.y = (this.body!.getPosition().y - Config.Player.radius) * Config.PixelsPerMeter;
        this.sprite.rotation = this.body!.getAngle();

        EntityUtils.syncLightToBody(this);
        EntityUtils.syncEffectToSprite(this);
    }

    onPickup(type: BodyType) {
        switch (type) {
            case EntityType.Torch:
                // Grow the light
                this.light?.increaseBaseRadius(
                    this.light.options.baseRadius + Config.Player.lightRadiusIncrement,
                    Config.Player.maxLightRadius,
                    Config.Player.lightChangeDuration
                );
                break;
            case EntityType.Anti:
                // Shrink the light
                this.light?.decreaseBaseRadius(
                    this.light.options.baseRadius - Config.Player.lightRadiusDecrement,
                    Config.Player.minLightRadius,
                    Config.Player.lightChangeDuration
                );
                break;
            case EntityType.Sentry:
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
