import * as PIXI from 'pixi.js';
import { Config } from '../config/Config';
import { LevelContext } from '../level/LevelContext';
import { StaticLight } from '../light/Light';
import { ParticleEffect } from '../particles/ParticleEffect';
import { Point } from '../utils/types';
import { BaseEntity, EntityContainers } from './BaseEntity';
import { EntitiesConfig } from '../config/EntitiesConfig';
import { EntityType } from './types';
import { EntityUtils } from '../utils/EntityUtils';
import { ColorUtils } from '../utils/ColorUtils';

export interface SwitchOptions {
    spawnPoint: Point,
    containers: EntityContainers,
    levelContext: LevelContext,
    color: number,
    groupId: number
}

export class Switch extends BaseEntity {
    constructor(options: SwitchOptions) {
        const baseColor = options.color;
        const darkenedColor = ColorUtils.darken(baseColor, 0.2);
        const lightenedColor = ColorUtils.lighten(baseColor, 0.2);
        const preset = EntitiesConfig.Switch;
        const center = Switch.centerOf(options.spawnPoint, preset);
        const sprite = Switch.buildSprite(preset, options.spawnPoint, baseColor);
        const body = Switch.buildBody(preset, center, options.levelContext.getPhysicsWorld());

        // Construct a static light
        const light = new StaticLight(
            center,
            options.levelContext.getEdgesList(),
            { 
                ...EntitiesConfig.Switch.light!,
                startColor: darkenedColor,
                endColor: baseColor
            }
        );

        // Create the particle effect and set initial position
        const particleEffect = new ParticleEffect({
            ...EntitiesConfig.Switch.particleEffect!,
            particleOptions: {
                ...EntitiesConfig.Switch.particleEffect!.particleOptions, 
                startTint: new PIXI.Color(baseColor),
                endTint: new PIXI.Color(lightenedColor),
            }
        });

        super({
            type: Config.Switch.type as EntityType,
            sprite,
            body,
            light,
            particleEffect,
            containers: options.containers
        });

        // Set user data for the body in a self-referential way
        body.setUserData({ 
            type: Config.Switch.type,
            entity: this,
            groupId: options.groupId
        });

        EntityUtils.syncEffectToSprite(this);

        // Play the effect
        this.particleEffect!.play();
    }

}