/* DynamicEntity.ts */
import * as planck from 'planck';
import { BaseEntity, BaseEntityOptions } from './BaseEntity';
import { DynamicLight, LightOptions } from '../core/Light';
import { Segment } from '../utils/types';

export interface DynamicEntityOptions extends BaseEntityOptions {
    lightOptions?: LightOptions;
    edgesList?: Segment[];
}

import { LightOwner } from '../core/Light';

export class DynamicEntity extends BaseEntity implements LightOwner {
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
                options.id,
                this // Pass owner
            );
        }
    }

    update(deltaTime: number) {
        // Update all the basic stuff
        super.update(deltaTime);
    }

    getLightPosition() {
        const pos = this.body.getPosition();
        return { x: pos.x, y: pos.y };
    }
}