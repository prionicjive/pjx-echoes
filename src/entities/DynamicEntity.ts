import * as planck from 'planck';
import * as PIXI from 'pixi.js';
import { ParticleEffectOptions, ParticleEffect } from '../particles/ParticleEffect';
import { LightOptions, DynamicLight } from '../core/Light';
import { Segment } from '../utils/types';

export interface DynamicEntityContainers {
    containerForEntity: PIXI.Container;
    containerForParticles?: PIXI.Container;
}

export interface DynamicEntityOptions {
    id: string;
    sprite: PIXI.Sprite;
    body: planck.Body;
    particleEffectOptions?: ParticleEffectOptions; // Optional: pass for entities with a trail/effect
    particleContainer?: PIXI.Container; // Where to add the emitter's container
    lightOptions?: LightOptions;
    edgesList?: Segment[]; // For shadow casting, etc.
}

export class DynamicEntity {
    public id: string;
    public sprite: PIXI.Sprite;
    public body: planck.Body;
    public dynamicLight?: DynamicLight;
    protected particleEffect?: ParticleEffect;

    constructor(options: DynamicEntityOptions) {
        this.id = options.id;
        this.sprite = options.sprite;
        this.body = options.body;

        // If a particle texture and container are provided, set up an emitter
        // TODO See if there is a ParticleEffectOptions object AND a container
        if (options.particleEffectOptions && options.particleContainer) {
            this.particleEffect = new ParticleEffect(options.particleEffectOptions);
            options.particleContainer.addChild(this.particleEffect.container);
        }

        // See if we have what it takes to create a light
        if (options.lightOptions && options.edgesList) {
            this.dynamicLight = new DynamicLight(
                { x: this.body.getPosition().x, y: this.body.getPosition().y },
                options.edgesList,
                options.lightOptions,
                options.id
            );
        }
    }

    update(deltaTime: number) {
        // TODO Perhaps lights and effects are best handled by a manager?
        // TODO Best to NOT have entities update their own lights and effects??
        // Update emitter position and animate, if present
        if (this.particleEffect) {
            // TODO We might not always want to follow the position
            this.particleEffect.setEmitPosition(
                this.sprite.x + this.sprite.width / 2, // TODO Not that this is in PIXELS and NOT meters
                this.sprite.y + this.sprite.height / 2
            );
            this.particleEffect.update(deltaTime);
        }

        // Update light position, if present
        if (this.dynamicLight) {
            this.dynamicLight.update({
                x: this.body.getPosition().x,
                y: this.body.getPosition().y
            });
        }

        // Add any other per-frame logic here (e.g., AI, animation)
    }

    destroy() {
        this.particleEffect?.destroy();
        // Clean up other resources if needed
    }
}