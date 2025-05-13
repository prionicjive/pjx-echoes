/* DynamicEntity.ts */
import * as planck from 'planck';
import { BaseEntity, BaseEntityOptions } from './BaseEntity';
import { DynamicLight, LightOptions } from '../light/Light';
import { LightManager } from '../light/LightManager';
import { LevelContext } from '../level/LevelContext';

export interface DynamicEntityOptions extends BaseEntityOptions {
    lightOptions?: LightOptions;
    levelContext: LevelContext;
}

export class DynamicEntity extends BaseEntity {
    constructor(options: DynamicEntityOptions) {
        super(options);

        // Construct a DynamicLight if need be
        if (options.lightOptions && options.levelContext) {
            let initialLightPos = options.body?.getPosition();
            if (!initialLightPos) {
                initialLightPos = new planck.Vec2(options.sprite.x + 0.5, options.sprite.y + 0.5);
            }
            this.light = new DynamicLight(
                initialLightPos,
                options.levelContext.getEdgesList(),
                options.lightOptions,
                options.id,
            );
            
            // Add light to the LightManager
            LightManager.instance.addLight(this.light);
        }
    }
}