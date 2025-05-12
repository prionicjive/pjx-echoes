/* StaticEntity.ts */
import { BaseEntity, BaseEntityOptions } from './BaseEntity';
import { StaticLight, LightOptions } from '../light/Light';
import { LightManager } from '../light/LightManager';
import { LevelContext } from '../level/LevelContext';

export interface StaticEntityOptions extends BaseEntityOptions {
    lightOptions?: LightOptions;
    levelContext: LevelContext;
    position: { x: number, y: number };
    width: number;
    height: number;
}

export class StaticEntity extends BaseEntity {
    constructor(options: StaticEntityOptions) {
        super(options);

        // Construct a static light if options provided
        if (options.lightOptions && options.levelContext) {
            const center = {
                x: options.position.x + options.width / 2,
                y: options.position.y + options.height / 2
            };

            this.light = new StaticLight(
                center,
                options.levelContext.getEdgesList(),
                options.lightOptions,
                options.id
            );

            // Add light to the LightManager
            LightManager.instance.addStaticLight(this.light);
        }
    }
}