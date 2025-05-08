/* DynamicEntity.ts */
import * as planck from 'planck';
import { BaseEntity, BaseEntityOptions } from './BaseEntity';
import { DynamicLight, LightOptions } from '../core/Light';
import { Segment } from '../utils/types';

export interface DynamicEntityOptions extends BaseEntityOptions {
    lightOptions?: LightOptions;
    edgesList?: Segment[];
}

export class DynamicEntity extends BaseEntity {
    constructor(options: DynamicEntityOptions) {
        super(options);

        // Construct a DynamicLight if need be
        if (options.lightOptions && options.edgesList) {
            let initialLightPos = options.body?.getPosition();
            if (!initialLightPos) {
                initialLightPos = new planck.Vec2(options.sprite.x + 0.5, options.sprite.y + 0.5);
            }
            this.light = new DynamicLight(
                initialLightPos,
                options.edgesList,
                options.lightOptions,
                options.id
            );
        }
    }

    update(deltaTime: number) {
        // Update particle effect position based on body
        super.update(deltaTime);

        // Update dynamic light position
        if (this.light) {
            this.light.update({
                x: this.body.getPosition().x,
                y: this.body.getPosition().y
            });
        }
    }
}