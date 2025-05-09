/* StaticEntity.ts */
import { BaseEntity, BaseEntityOptions } from './BaseEntity';
import { StaticLight, LightOptions } from '../core/Light';
import { Segment } from '../utils/types';

export interface StaticEntityOptions extends BaseEntityOptions {
    lightOptions?: LightOptions;
    edgesList?: Segment[];
    position: { x: number, y: number };
    width: number;
    height: number;
}

export class StaticEntity extends BaseEntity {
    constructor(options: StaticEntityOptions) {
        super(options);

        // Construct a static light if options provided
        if (options.lightOptions && options.edgesList) {
            const center = {
                x: options.position.x + options.width / 2,
                y: options.position.y + options.height / 2
            };

            this.light = new StaticLight(
                center,
                options.edgesList,
                options.lightOptions,
                options.id
            );
        }
    }

    update(deltaTime: number) {
        // TODO Do any custom updating
        
        super.update(deltaTime);
    }
}