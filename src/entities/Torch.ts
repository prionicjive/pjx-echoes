import * as PIXI from 'pixi.js';
import * as planck from 'planck';
import { Config } from '../config/Config';
import { LightsConfig } from '../config/LightsConfig';
import { ParticleEffectsConfig } from '../config/ParticleEffectsConfig';
import { LevelContext } from '../level/LevelContext';
import { StaticLight } from '../light/Light';
import { ParticleEffect } from '../particles/ParticleEffect';
import { EntityUtils } from '../utils/EntityUtils';
import { PhysicsUtils } from '../utils/PhysicsUtils';
import { SpriteUtils } from '../utils/SpriteUtils';
import { Point } from '../utils/types';
import { BaseEntity, EntityContainers, EntityUserData } from './BaseEntity';

export interface TorchOptions { 
    levelContext: LevelContext, 
    spawnPoint: Point,
    containers: EntityContainers
}

export class Torch extends BaseEntity {
    constructor(options: TorchOptions) {
        // Generate unique ID
        const id = EntityUtils.generateRandomId(Config.Torch.type);

        // Create the sprite
        const sprite = SpriteUtils.createSprite({
            texture: PIXI.Texture.from(Config.Textures.torch),
            x: options.spawnPoint.x * Config.PixelsPerMeter,
            y: options.spawnPoint.y * Config.PixelsPerMeter,
            width: Config.Torch.width * Config.PixelsPerMeter,
            height: Config.Torch.height * Config.PixelsPerMeter,
            color: Config.Torch.color
        });

        // Create static body
        const body = PhysicsUtils.createBody(options.levelContext.getPhysicsWorld(), {
            type: 'static',
            position: new planck.Vec2(options.spawnPoint.x, options.spawnPoint.y),
            box: { width: Config.Torch.width, height: Config.Torch.height },
            fixture: {
                isSensor: true,
                filterCategoryBits: Config.Physics.Collision.categoryTorch,
                filterMaskBits: Config.Physics.Collision.categoryPlayer,
            }
        });

        // Construct a static light
        const center = {
            x: options.spawnPoint.x + Config.Torch.width / 2,
            y: options.spawnPoint.y + Config.Torch.height / 2
        };

        const light = new StaticLight(
            center,
            options.levelContext.getEdgesList(),
            { ...LightsConfig.TorchLight },
            id
        );

        // Create the particle effect and set initial position
        const particleEffect = new ParticleEffect({
            ...ParticleEffectsConfig.TorchRadiance,
        });

        super({
            id,
            sprite,
            body,
            light,
            particleEffect,
            containers: options.containers,
        });

        // Set user data with a self-referencing data
        body.setUserData({
            type: Config.Torch.type,
            entity: this
        } as EntityUserData);
    
        // Set the initial position of the particle effect
        EntityUtils.syncEffectToSprite(this);
    }

    // @ts-ignore
    update(deltaTime: number) {
        // No need to update light or particle effect positions... yet? 
    }

    // Optionally, add any unique logic on pickup
    onPickup() {
        // TODO Fade out, play effect, etc.
    }
}