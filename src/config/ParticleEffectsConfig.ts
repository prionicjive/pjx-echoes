import * as PIXI from 'pixi.js';
import { ParticleEffectOptions } from '../particles/ParticleEffect';
import { Config } from './Config';

export type ParticleEffectType = 'SentryTrail' | 'PlayerTrail' | 'Explosion' | 'TorchRadiance';

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
            startAlpha: 1,
            endAlpha: 0,
            startScaleX: 1,
            startScaleY: 1,
            endScaleX: 0.42,
            endScaleY: 0.42,
            width: Config.Player.radius * 2 * Config.PixelsPerMeter,
            height: Config.Player.radius * 2 * Config.PixelsPerMeter,
            startTint: new PIXI.Color(Config.Player.color),
            endTint: new PIXI.Color(0xff13bb), // TODO Just for test, should be configurable
            endDirection: {x: 0, y: 0},
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
            startAlpha: 1,
            endAlpha: 0,
            startScaleX: 1,
            startScaleY: 1,
            endScaleX: 0.42,
            endScaleY: 0.42,
            width: Config.Sentry.radius * 2 * Config.PixelsPerMeter,
            height: Config.Sentry.radius * 2 * Config.PixelsPerMeter,
            startTint: new PIXI.Color(0x991dFF),
            endTint: new PIXI.Color(0x0000ff), // TODO Just for test, should be configurable
            endDirection: {x: 0, y: 0},
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
            maxAge: 5,
            startAlpha: 1,
            endAlpha: 0,
            startScaleX: 0.25,
            startScaleY: 0.25,
            endScaleX: 3,
            endScaleY: 3,
            width: Config.Torch.width * Config.PixelsPerMeter,
            height: Config.Torch.height * Config.PixelsPerMeter,
            startTint: new PIXI.Color(Config.Torch.color),
            endTint: new PIXI.Color(Config.Torch.color), // TODO Just for test, should be configurable
            endDirection: {x: 0, y: 0},
            startSpeed: 0,
            endSpeed: 0,
        }
    },
    Explosion: {
        texturePath: Config.Textures.Particles.circleSoft,
        emitPerSecond: 20,
        maxParticles: 100,
        duration: 10,
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
            startTint: new PIXI.Color(Config.Torch.color),
            endTint: new PIXI.Color(Config.Torch.color), // TODO Just for test, should be configurable
            endDirection: {x: 0, y: 0},
            startSpeed: 200,
            endSpeed: 100
        }
    }
};