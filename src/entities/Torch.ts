import * as planck from 'planck';
import { Point } from '../utils/types';
import { EntityContainers } from './BaseEntity';
import { StaticEntity } from './StaticEntity';
import { Config } from '../config/Config';
import { SpriteUtils } from '../utils/SpriteUtils';
import { EntityUtils } from '../utils/EntityUtils';
import * as PIXI from 'pixi.js';
import { LightsConfig } from '../config/LightsConfig';
import { ParticleEffectsConfig } from '../config/ParticleEffectsConfig';
import { PhysicsUtils } from '../utils/PhysicsUtils';
import { EntityUserData } from './types';
import { LevelContext } from '../level/LevelContext';

export interface TorchOptions { 
    levelContext: LevelContext, 
    spawnPoint: Point,
    containers: EntityContainers
}

export class Torch extends StaticEntity {
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

        super({
            id,
            sprite,
            body,
            lightOptions: { ...LightsConfig.TorchLight },
            position: options.spawnPoint,
            width: Config.Torch.width,
            height: Config.Torch.height,
            particleEffectOptions: { ...ParticleEffectsConfig.TorchEffect },
            containers: options.containers,
            levelContext: options.levelContext
        });

        // Set user data with a self-referencing data
        body.setUserData({
            type: Config.Torch.type,
            entity: this
        } as EntityUserData);
    
        // Set the initial position of the particle effect
        this.particleEffect?.setEffectPosition(
            this.sprite.x + this.sprite.width / 2,
            this.sprite.y + this.sprite.height / 2
        );
    }

    // @ts-ignore
    update(deltaTime: number) {
        // TODO Do any custom updating   
    }

    // Optionally, add any unique logic on pickup
    onPickup() {
        // TODO Fade out, play effect, etc.
    }
}