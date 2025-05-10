/* DynamicEntity.ts */
import * as planck from 'planck';
import { BaseEntity, BaseEntityOptions } from './BaseEntity';
import { DynamicLight, LightOptions } from '../light/Light';
import { Segment } from '../utils/types';
import { LightManager } from '../light/LightManager';
import { LightOwner } from '../light/Light';

export interface DynamicEntityOptions extends BaseEntityOptions {
    lightOptions?: LightOptions;
    edgesList?: Segment[];
}

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
            
            // Add light to the LightManager
            LightManager.instance.addDynamicLight(this.light);
        }
    }

    destroy() {
        super.destroy();
    }

    getLightPosition() {
        const pos = this.body.getPosition();
        return { x: pos.x, y: pos.y };
    }
}