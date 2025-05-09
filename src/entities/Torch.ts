import * as planck from 'planck';
import { Segment } from '../utils/types';
import { Point } from '../utils/types';
import { EntityContainers } from './BaseEntity';
import { StaticEntity } from './StaticEntity';
import { Config } from '../config/Config';
import { SpriteUtils } from '../utils/SpriteUtils';
import { EntityUtils } from '../utils/EntityUtils';
import * as PIXI from 'pixi.js';
import { LightsConfig } from '../config/LightsConfig';
import { ParticleEffectsConfig } from '../config/ParticleEffectsConfig';

export interface TorchOptions {
    world: planck.World, 
    edgesList: Segment[], 
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

        super({
            id,
            sprite,
            lightOptions: { ...LightsConfig.TorchLight },
            edgesList: options.edgesList,
            position: options.spawnPoint,
            width: Config.Torch.width,
            height: Config.Torch.height,
            particleEffectOptions: { ...ParticleEffectsConfig.TorchEffect },
            particleEffectContainer: options.containers.containerForParticleEffects,
        });

        // Add the sprite to the main entity container
        options.containers.containerForEntity.addChild(this.sprite);
    }

    update(deltaTime: number) {
        // TODO Do any custom updating
        
        // Call the super to update any particle effects, among other things
        super.update(deltaTime);
    }

    // Optionally, add any unique logic on pickup
    onPickup() {
        // TODO Fade out, play effect, etc.
    }
}