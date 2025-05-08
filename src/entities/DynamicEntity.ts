/* DynamicEntity.ts */
import * as planck from 'planck';
import { BaseEntity, BaseEntityOptions } from './BaseEntity';
import { DynamicLight, LightOptions } from '../core/Light';
import { Segment } from '../utils/types';

export interface DynamicEntityOptions extends BaseEntityOptions {
    body: planck.Body;
    lightOptions?: LightOptions;
    edgesList?: Segment[];
}

export class DynamicEntity extends BaseEntity {
    public body: planck.Body;

    constructor(options: DynamicEntityOptions) {
        super(options);
        this.body = options.body;

        // Construct a DynamicLight if need be
        if (options.lightOptions && options.edgesList) {
            this.light = new DynamicLight(
                { x: this.body.getPosition().x, y: this.body.getPosition().y }, // TODO Maybe we want the light at some offset
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