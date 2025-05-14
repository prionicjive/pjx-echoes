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
import { EntitiesConfig } from '../config/EntitiesConfig';

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
            texture: PIXI.Texture.from(EntitiesConfig.Torch.sprite.texture),
            x: options.spawnPoint.x * Config.PixelsPerMeter,
            y: options.spawnPoint.y * Config.PixelsPerMeter,
            width: EntitiesConfig.Torch.sprite.widthInMeters * Config.PixelsPerMeter,
            height: EntitiesConfig.Torch.sprite.heightInMeters * Config.PixelsPerMeter,
            color: EntitiesConfig.Torch.sprite.color
        });

        // Create static body
        const body = PhysicsUtils.createBody(
            options.levelContext.getPhysicsWorld(), {
                ...EntitiesConfig.Torch.body!,
                position: new planck.Vec2(options.spawnPoint.x + Config.Torch.width / 2, options.spawnPoint.y + Config.Torch.height / 2)
            }
        );

        // Construct a static light
        const center = {
            x: options.spawnPoint.x + Config.Torch.width / 2,
            y: options.spawnPoint.y + Config.Torch.height / 2
        };

        const light = new StaticLight(
            center,
            options.levelContext.getEdgesList(),
            { ...EntitiesConfig.Torch.light! },
            id
        );

        // Create the particle effect and set initial position
        const particleEffect = new ParticleEffect({
            ...EntitiesConfig.Torch.particleEffect!,
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