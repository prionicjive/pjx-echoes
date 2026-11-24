// Player.ts
/**
 * Represents the player entity in the game.
 * Handles physics body creation, sprite setup, and movement logic.
 *
 * @module Player
 */

import * as planck from 'planck';
import { Color } from 'pixi.js';
import { Config } from '../config/Config';
import type { SkinPreset } from '../config/SkinsConfig';
import { SkinManager } from '../core/SkinManager';
import { PlayerActions } from '../input/ActionMapping';
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
    /** Called with the player's body position (meters) when LIDAR should fire. */
    onFireLidar: (origin: Point) => void,
}

export class Player extends BaseEntity {
    private readonly onFireLidar: (origin: Point) => void;

    constructor(options: PlayerOptions) {
        const preset = EntitiesConfig.Player;
        const center = Player.centerOf(options.spawnPoint, preset);
        const skin = SkinManager.instance.getActiveSkin();
        const sprite = Player.buildSprite(preset, options.spawnPoint, skin.ballColor);
        const body = Player.buildBody(preset, center, options.levelContext.getPhysicsWorld());

        // Create the light (colors come from the active skin)
        const light = new DynamicLight(
            {...body.getPosition()},
            options.levelContext.getEdgesList(),
            { ...EntitiesConfig.Player.light!, startColor: skin.lightStart, endColor: skin.lightEnd }
        );

        // Create the particle effect (trail colors come from the active skin)
        const baseEffect = EntitiesConfig.Player.particleEffect!;
        const particleEffect = new ParticleEffect({
            ...baseEffect,
            particleOptions: {
                ...baseEffect.particleOptions,
                startTint: new Color(skin.trailStart),
                endTint: new Color(skin.trailEnd),
            },
        });

        super({
            type: EntityType.Player,
            sprite,
            body,
            light,
            particleEffect,
            containers: options.containers
        });

        this.onFireLidar = options.onFireLidar;

        // Set initial position
        EntityUtils.syncEffectToSprite(this);

        // Play the effect
        this.particleEffect!.play();
    }

    /**
     * Applies a skin to this live player: sprite tint, light colors, and trail palette.
     * Light colors go through Light.setColors (tweenables), never the Light directly.
     * Trail particles already in flight finish with their old colors; new ones use the new palette.
     */
    applySkin(skin: SkinPreset) {
        this.sprite.tint = skin.ballColor;
        this.light?.setColors(skin.lightStart, skin.lightEnd);
        if (this.particleEffect) {
            this.particleEffect.template.startTint = new Color(skin.trailStart);
            this.particleEffect.template.endTint = new Color(skin.trailEnd);
        }
    }

    handleInput(
        actions: PlayerActions,
        context: {
            levelPosition: Point,
            playerScreenPos: Point
        },
        deltaTime: number
    ) {
        this.handleLidar(actions);
        if (actions.attractorScreenPos) {
            this.handleAttractorMove(actions.attractorScreenPos, context, deltaTime);
        } else if (actions.swipeVelocityPx) {
            this.handleSwipe(actions.swipeVelocityPx);
        } else if (actions.pointerReleasedScreenPos) {
            this.handlePointerRelease(actions.pointerReleasedScreenPos, context.levelPosition);
        }
        if (actions.moveVector && !actions.attractorScreenPos) {
            this.handleDirectionalMove(actions.moveVector, deltaTime);
        }
    }

    private handleLidar(actions: PlayerActions) {
        if (!actions.fireLidar) return;
        const pos = this.body!.getPosition();
        this.onFireLidar({ x: pos.x, y: pos.y });
    }

    /** Analog stick / WASD: force in the given direction, scaled by stick magnitude. */
    private handleDirectionalMove(moveVector: Point, deltaTime: number) {
        const magnitude = Math.hypot(moveVector.x, moveVector.y);
        if (magnitude === 0) return;
        this.applyDirectionalForce(
            new planck.Vec2(moveVector.x / magnitude, moveVector.y / magnitude),
            Math.min(1, magnitude),
            deltaTime
        );
    }

    /** Touch / mouse held: pull toward (or push away from) the pointer. */
    private handleAttractorMove(
        target: Point,
        context: { levelPosition: Point, playerScreenPos: Point },
        deltaTime: number
    ) {
        const levelRelative = {
            x: target.x - context.levelPosition.x,
            y: target.y - context.levelPosition.y
        };
        const screenDistance = Math.hypot(
            context.playerScreenPos.x - target.x,
            context.playerScreenPos.y - target.y
        );
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
    }

    /** Non-swipe release: stop the player if released close enough to them. */
    private handlePointerRelease(releasedScreenPos: Point, levelPosition: Point) {
        const targetPos = new planck.Vec2(
            (releasedScreenPos.x - levelPosition.x) / Config.PixelsPerMeter,
            (releasedScreenPos.y - levelPosition.y) / Config.PixelsPerMeter
        );
        if (targetPos.sub(this.body!.getPosition()).length() <= Config.Movement.pointerReleaseStopDistance) {
            this.body!.setLinearVelocity(new planck.Vec2(0, 0));
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
        const playerPos = this.body!.getPosition();
        const direction = PhysicsUtils.normalizeVector(new planck.Vec2(
            levelRelativePositionInPixels.x / Config.PixelsPerMeter - playerPos.x,
            levelRelativePositionInPixels.y / Config.PixelsPerMeter - playerPos.y
        ));
        this.applyDirectionalForce(direction, 1, deltaTime);
    }

    /**
     * Shared movement physics: applies force along a unit direction and
     * (optionally) re-aims the current velocity at it, capped at max speed.
     *
     * @param direction - Unit vector of desired movement.
     * @param intensity - 0..1 scale on the force (stick magnitude).
     * @param deltaTime - Frame time in seconds.
     */
    private applyDirectionalForce(direction: planck.Vec2, intensity: number, deltaTime: number) {
        const scale = Config.Movement.forceFactorPerSecond * deltaTime * intensity;
        const force = new planck.Vec2(direction.x * scale, direction.y * scale);

        const currLinearVelocity = this.body!.getLinearVelocity();
        const speed: number = Math.min(currLinearVelocity.length(), Config.Movement.maxSpeed);

        if (Config.Movement.instantlyChangeDirection) {
            this.body!.setLinearVelocity(PhysicsUtils.normalizeVector(force).mul(speed));
        } else if (speed !== 0 && !isNaN(speed)) {
            this.body!.setLinearVelocity(PhysicsUtils.normalizeVector(currLinearVelocity).mul(speed));
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
