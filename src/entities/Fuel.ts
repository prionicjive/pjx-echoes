// Fuel.ts

import * as PIXI from 'pixi.js';
import { StaticEntity, StaticEntityOptions } from './StaticEntity';
import { Config } from '../config/Config';
import { LightsConfig } from '../config/LightsConfig';
import { ParticleEffectsConfig } from '../config/ParticleEffectsConfig';
import { Segment } from '../utils/types';

export interface FuelOptions extends StaticEntityOptions {
    edgesList: Segment[];
    containers: {
        containerForEntity: PIXI.Container;
        containerForParticleEffects: PIXI.Container;
    };
}

export class Fuel extends StaticEntity {
    constructor(options: FuelOptions) {
        // Create the sprite for the fuel
        const sprite = new PIXI.Sprite(PIXI.Texture.from(Config.Textures.fuel));
        sprite.x = options.position.x * Config.PixelsPerMeter;
        sprite.y = options.position.y * Config.PixelsPerMeter;
        sprite.width = Config.Fuel.width * Config.PixelsPerMeter;
        sprite.height = Config.Fuel.height * Config.PixelsPerMeter;
        sprite.anchor.set(0.5);

        super({
            id: options.id ?? `${Config.Fuel.type}-${options.position.x}-${options.position.y}`,
            sprite,
            particleEffectOptions: { ...ParticleEffectsConfig.FuelPickup },
            particleEffectContainer: options.containers.containerForParticleEffects,
            lightOptions: { ...LightsConfig.FuelLight },
            edgesList: options.edgesList,
            position: options.position
        });

        // Add the sprite to the main entity container
        options.containers.containerForEntity.addChild(this.sprite);
    }

    // Optionally, add any unique logic on pickup
    onPickup() {
        // TODO Fade out, play effect, etc.
    }
}