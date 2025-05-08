// Fuel.ts

import * as PIXI from 'pixi.js';
import { StaticEntity } from './StaticEntity';
import { Config } from '../config/Config';
import { LightsConfig } from '../config/LightsConfig';
import { Segment } from '../utils/types';
import { EntityUtils } from '../utils/EntityUtils';
import { PhysicsUtils } from '../utils/PhysicsUtils';
import { SpriteUtils } from '../utils/SpriteUtils';
import { EntityContainers } from './BaseEntity';
import { Point } from '../utils/types';
import * as planck from 'planck';

export interface FuelOptions {
    world: planck.World, 
    edgesList: Segment[], 
    spawnPoint: Point,
    containers: EntityContainers
}

export class Fuel extends StaticEntity {
    constructor(options: FuelOptions) {
        // Generate unique ID
        const id = EntityUtils.generateRandomId(Config.Fuel.type);

        // Create the sprite
        const sprite = SpriteUtils.createSprite({
            texture: PIXI.Texture.from(Config.Textures.fuel),
            x: options.spawnPoint.x * Config.PixelsPerMeter,
            y: options.spawnPoint.y * Config.PixelsPerMeter,
            width: Config.Fuel.width * Config.PixelsPerMeter,
            height: Config.Fuel.height * Config.PixelsPerMeter,
            color: Config.Fuel.color
        });

        // Create static body
        const body = PhysicsUtils.createBody(options.world, {
            type: 'static',
            position: new planck.Vec2(options.spawnPoint.x, options.spawnPoint.y),
            box: { width: Config.Fuel.width, height: Config.Fuel.height },
            fixture: {
                isSensor: true,
                filterCategoryBits: Config.Physics.Collision.categoryFuel,
                filterMaskBits: Config.Physics.Collision.categoryPlayer,
            }
        });

        // Set user data with a self-referencing body
        body.setUserData({
            type: Config.Fuel.type,
            id,
            sprite,
            body
        });

        super({
            id,
            sprite,
            body,
            lightOptions: { ...LightsConfig.FuelLight },
            edgesList: options.edgesList,
            position: options.spawnPoint,
        });

        // Add the sprite to the main entity container
        options.containers.containerForEntity.addChild(this.sprite);
    }

    // Optionally, add any unique logic on pickup
    onPickup() {
        // TODO Fade out, play effect, etc.
    }
}