import * as planck from 'planck';
import * as PIXI from 'pixi.js';
import { ParticleEmitter } from '../particles/ParticleEmitter';
import { LightOptions, DynamicLight } from '../core/Light';
import { Segment } from '../utils/types';

export interface DynamicEntityOptions {
    id: string;
    sprite: PIXI.Sprite;
    body: planck.Body;
    particleTexture?: PIXI.Texture; // Optional: pass for entities with a trail/effect
    particleContainer?: PIXI.Container; // Where to add the emitter's container
    lightOptions?: LightOptions;
    edgesList?: Segment[]; // For shadow casting, etc.
    entityId?: string; // Needed to link lights to entity
}

export class DynamicEntity {
    public id: string;
    public sprite: PIXI.Sprite;
    public body: planck.Body;
    public dynamicLight?: DynamicLight;
    protected emitter?: ParticleEmitter;

    constructor(options: DynamicEntityOptions) {
        this.id = options.id;
        this.sprite = options.sprite;
        this.body = options.body;

        // If a particle texture and container are provided, set up an emitter
        if (options.particleTexture && options.particleContainer) {
            this.emitter = new ParticleEmitter(options.particleTexture);
            options.particleContainer.addChild(this.emitter.container);
        }

        // See if we have what it takes to create a light
        if (options.lightOptions && options.edgesList) {
            this.dynamicLight = new DynamicLight(
                { x: this.body.getPosition().x, y: this.body.getPosition().y },
                options.edgesList,
                options.lightOptions,
                options.entityId ?? ""
            );
        }
    }

    update(deltaTime: number) {
        // Update emitter position and animate, if present
        if (this.emitter) {
            // TODO We might not always want to follow the position
            this.emitter.setEmitPosition(
                this.sprite.x + this.sprite.width / 2, // TODO May need something like (0.5 * Config.PixelsPerMeter)
                this.sprite.y + this.sprite.height / 2
            );
            this.emitter.update(deltaTime);
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
        this.emitter?.destroy();
        // Clean up other resources if needed
    }
}