import * as PIXI from 'pixi.js';
import { ParticleEffectOptions } from '../particles/ParticleEffect';
import { Config } from './Config';

export type ParticleEffectType = 'SentryTrail' | 'PlayerTrail' | 'Explosion' | 'TorchRadiance' | 'BlueFlame' | 'SwitchEffect';

// Centralized particle effect configuration
export const ParticleEffectsConfig: Record<ParticleEffectType, ParticleEffectOptions> = {
    PlayerTrail: {
        texturePath: Config.Textures.Particles.ringSoft,
        emitPerSecond: 30,
        maxParticles: 250,
        emitAngle: 0,
        spreadAmount: 0,
        particleOptions: {
            maxAge: 0.5,
            maxAgeVariance: { min: 0.8, max: 1.2 }, // ±20% variation in lifetime
            startAlpha: 0.75,
            startAlphaVariance: { min: 0.9, max: 1.1 },
            endAlpha: 0,
            startScaleX: 0.9,
            startScaleXVariance: { min: 0.8, max: 1.2 },
            startScaleY: 0.9,
            startScaleYVariance: { min: 0.8, max: 1.2 },
            endScaleX: 0.42,
            endScaleXVariance: { min: 0.8, max: 1.2 },
            endScaleY: 0.42,
            endScaleYVariance: { min: 0.8, max: 1.2 },
            width: Config.Player.radius * 2 * Config.PixelsPerMeter,
            height: Config.Player.radius * 2 * Config.PixelsPerMeter,
            startTint: new PIXI.Color(Config.Player.color),
            startTintVariance: {
                r: { min: 0.9, max: 1.1 },
                g: { min: 0.9, max: 1.1 },
                b: { min: 0.9, max: 1.1 }
            },
            endTint: new PIXI.Color(0xff13bb),
            endTintVariance: {
                r: { min: 0.8, max: 1.2 },
                g: { min: 0.8, max: 1.2 },
                b: { min: 0.8, max: 1.2 }
            },
            endDirection: { x: 0, y: 0 },
            startSpeed: 0,
            endSpeed: 0
        }
    },
    SentryTrail: {
        texturePath: Config.Textures.Particles.circleSoft,
        emitPerSecond: 10,
        maxParticles: 100,
        emitAngle: 0,
        spreadAmount: 0,
        particleOptions: {
            maxAge: 2,
            maxAgeVariance: { min: 0.9, max: 1.1 },
            startAlpha: 1,
            startAlphaVariance: { min: 0.9, max: 1.1 },
            endAlpha: 0,
            startScaleX: 1,
            startScaleXVariance: { min: 0.9, max: 1.1 },
            startScaleY: 1,
            startScaleYVariance: { min: 0.9, max: 1.1 },
            endScaleX: 0.42,
            endScaleXVariance: { min: 0.9, max: 1.1 },
            endScaleY: 0.42,
            endScaleYVariance: { min: 0.9, max: 1.1 },
            width: Config.Sentry.radius * 2 * Config.PixelsPerMeter,
            height: Config.Sentry.radius * 2 * Config.PixelsPerMeter,
            startTint: new PIXI.Color(0x991dFF),
            startTintVariance: {
                r: { min: 0.95, max: 1.05 },
                g: { min: 0.9, max: 1.1 },
                b: { min: 0.8, max: 1.2 }
            },
            endTint: new PIXI.Color(0x0000ff),
            endTintVariance: {
                r: { min: 0.9, max: 1.1 },
                g: { min: 0.8, max: 1.2 },
                b: { min: 0.7, max: 1.3 }
            },
            endDirection: { x: 0, y: 0 },
            startSpeed: 0,
            endSpeed: 0
        }
    },
    TorchRadiance: {
        texturePath: Config.Textures.Particles.ringSoft,
        emitPerSecond: 1,
        maxParticles: 10,
        emitAngle: 0,
        spreadAmount: 0,
        particleOptions: {
            maxAge: 3,
            maxAgeVariance: { min: 0.9, max: 1.1 },
            startAlpha: 1,
            startAlphaVariance: { min: 0.9, max: 1.1 },
            endAlpha: 0,
            startScaleX: 0.25,
            startScaleXVariance: { min: 0.9, max: 1.1 },
            startScaleY: 0.25,
            startScaleYVariance: { min: 0.9, max: 1.1 },
            endScaleX: 3,
            endScaleXVariance: { min: 0.9, max: 1.1 },
            endScaleY: 3,
            endScaleYVariance: { min: 0.9, max: 1.1 },
            width: Config.Torch.width * Config.PixelsPerMeter,
            height: Config.Torch.height * Config.PixelsPerMeter,
            startTint: new PIXI.Color(Config.Torch.color),
            startTintVariance: {
                r: { min: 0.95, max: 1.05 },
                g: { min: 0.9, max: 1.1 },
                b: { min: 0.8, max: 1.2 }
            },
            endTint: new PIXI.Color(Config.Torch.color),
            endTintVariance: {
                r: { min: 0.9, max: 1.1 },
                g: { min: 0.8, max: 1.2 },
                b: { min: 0.7, max: 1.3 }
            },
            endDirection: { x: 0, y: 0 },
            startSpeed: 0,
            endSpeed: 0,
        }
    },
    SwitchEffect: {
        texturePath: Config.Textures.Particles.circleSoft,
        emitPerSecond: 20,
        maxParticles: 50,
        emitAngle: 0,
        spreadAmount: 360,
        particleOptions: {
            maxAge: 2,
            maxAgeVariance: { min: 0.9, max: 1.1 },
            startAlpha: 1,
            startAlphaVariance: { min: 0.9, max: 1.1 },
            endAlpha: 0,
            startScaleX: 0.75,
            startScaleXVariance: { min: 0.9, max: 1.1 },
            startScaleY: 0.75,
            startScaleYVariance: { min: 0.9, max: 1.1 },
            endScaleX: 0.25,
            endScaleXVariance: { min: 0.9, max: 1.1 },
            endScaleY: 0.25,
            endScaleYVariance: { min: 0.9, max: 1.1 },
            width: Config.Switch.width * Config.PixelsPerMeter,
            height: Config.Switch.height * Config.PixelsPerMeter,
            startTint: new PIXI.Color(Config.Switch.color),
            startTintVariance: {
                r: { min: 0.95, max: 1.05 },
                g: { min: 0.9, max: 1.1 },
                b: { min: 0.8, max: 1.2 }
            },
            endTint: new PIXI.Color(Config.Switch.color),
            endTintVariance: {
                r: { min: 0.9, max: 1.1 },
                g: { min: 0.8, max: 1.2 },
                b: { min: 0.7, max: 1.3 }
            },
            endDirection: { x: 0, y: 0 },
            startSpeed: 33,
            startSpeedVariance: { min: 0.8, max: 1.2 },
            endSpeed: 13,
            endSpeedVariance: { min: 0.8, max: 1.2 }
        }
    },
    Explosion: {
        texturePath: Config.Textures.Particles.circleSoft,
        emitPerSecond: 20,
        maxParticles: 100,
        duration: 2,
        emitAngle: 0,
        spreadAmount: 360,
        particleOptions: {
            maxAge: 2.5,
            maxAgeVariance: { min: 0.7, max: 1.3 },
            startAlpha: 1,
            startAlphaVariance: { min: 0.9, max: 1.1 },
            endAlpha: 0,
            startScaleX: 5,
            startScaleXVariance: { min: 0.8, max: 1.2 },
            startScaleY: 5,
            startScaleYVariance: { min: 0.8, max: 1.2 },
            endScaleX: 2,
            endScaleXVariance: { min: 0.8, max: 1.2 },
            endScaleY: 2,
            endScaleYVariance: { min: 0.8, max: 1.2 },
            width: Config.Torch.width * Config.PixelsPerMeter,
            height: Config.Torch.height * Config.PixelsPerMeter,
            startTint: new PIXI.Color(Config.Torch.color),
            startTintVariance: {
                r: { min: 0.9, max: 1.1 },
                g: { min: 0.8, max: 1.2 },
                b: { min: 0.8, max: 1.2 }
            },
            endTint: new PIXI.Color(Config.Torch.color),
            endTintVariance: {
                r: { min: 0.8, max: 1.2 },
                g: { min: 0.7, max: 1.3 },
                b: { min: 0.7, max: 1.3 }
            },
            endDirection: { x: 0, y: 0 },
            startSpeed: 200,
            startSpeedVariance: { min: 0.8, max: 1.2 },
            endSpeed: 100,
            endSpeedVariance: { min: 0.8, max: 1.2 }
        }
    },
    BlueFlame: {
        texturePath: Config.Textures.Particles.circleSoft,
        emitPerSecond: 20,
        maxParticles: 100,
        emitAngle: 90,
        spreadAmount: 45,
        emitRotateClockwise: true,
        emitRotationSpeed: 75,
        particleOptions: {
            maxAge: 2.5,
            startAlpha: 1,
            endAlpha: 0,
            startScaleX: 5,
            startScaleY: 5,
            endScaleX: 2,
            endScaleY: 2,
            width: Config.Torch.width * Config.PixelsPerMeter,
            height: Config.Torch.height * Config.PixelsPerMeter,
            startTint: new PIXI.Color(0x0000ff),
            endTint: new PIXI.Color(0xbbbbff), // TODO Just for test, should be configurable
            endDirection: {x: 0, y: 0},
            startSpeed: 200,
            endSpeed: 100
        }
    }
};