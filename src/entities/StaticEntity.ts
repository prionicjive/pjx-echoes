/* StaticEntity.ts */
import { BaseEntity, BaseEntityOptions } from './BaseEntity';
import { StaticLight, LightOptions } from '../core/Light';
import { Segment } from '../utils/types';

export interface StaticEntityOptions extends BaseEntityOptions {
    lightOptions?: LightOptions;
    edgesList?: Segment[];
    position: { x: number, y: number };
}

export class StaticEntity extends BaseEntity {
    constructor(options: StaticEntityOptions) {
        super(options);

        // Construct a static light if options provided
        if (options.lightOptions && options.edgesList) {
            this.light = new StaticLight(
                options.position,
                options.edgesList,
                options.lightOptions,
                options.id
            );
        }
    }

    // No need to override update unless we want animated static lights or particles
}