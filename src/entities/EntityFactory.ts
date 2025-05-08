import { SpriteUtils } from '../utils/SpriteUtils';
import { PhysicsUtils } from '../utils/PhysicsUtils';
import { Config } from '../config/Config';
import * as planck from 'planck';
import * as PIXI from 'pixi.js';
import { Entity, EntityType } from './types';

export interface EntityOptions {
    type: EntityType;
    id: string;
    x: number;
    y: number;
    width?: number;
    height?: number;
    radius?: number; // For circle entities (e.g., player)
    color?: number;
    linearDamping?: number; // For dynamic bodies
    // Optionally, add more fields for extensibility
    [key: string]: any;
}

export class EntityFactory {
    static create(desc: EntityOptions, world?: planck.World): Entity {
        switch (desc.type) {
            case Config.Wall.type: {
                const sprite = SpriteUtils.createSprite({
                    texture: PIXI.Texture.from(Config.Textures.block),
                    x: desc.x * Config.PixelsPerMeter,
                    y: desc.y * Config.PixelsPerMeter,
                    width: desc.width! * Config.PixelsPerMeter,
                    height: desc.height! * Config.PixelsPerMeter,
                    color: desc.color ?? Config.Wall.color,
                });
                return { id: desc.id, sprite, body: null };
            }
            case Config.Finish.type: {
                const sprite = SpriteUtils.createSprite({
                    texture: PIXI.Texture.from(Config.Textures.finish),
                    x: desc.x * Config.PixelsPerMeter,
                    y: desc.y * Config.PixelsPerMeter,
                    width: desc.width! * Config.PixelsPerMeter,
                    height: desc.height! * Config.PixelsPerMeter,
                    color: desc.color ?? Config.Finish.color,
                });
                if (!world) throw new Error('World is required for finish entity');

                const body = PhysicsUtils.createBody(world, {
                    type: 'static',
                    position: new planck.Vec2(desc.x, desc.y),
                    box: { width: desc.width!, height: desc.height! },
                    fixture: {
                        isSensor: true,
                        filterCategoryBits: Config.Physics.Collision.categoryFinish,
                        filterMaskBits: Config.Physics.Collision.categoryPlayer,
                    }
                });

                // Set user data with a self-referencing body
                body.setUserData({
                    type: desc.type,
                    id: desc.id,
                    sprite,
                    body
                });

                return { id: desc.id, sprite, body };
            }
            case Config.Torch.type: {
                const sprite = SpriteUtils.createSprite({
                    texture: PIXI.Texture.from(Config.Textures.torch),
                    x: desc.x * Config.PixelsPerMeter,
                    y: desc.y * Config.PixelsPerMeter,
                    width: desc.width! * Config.PixelsPerMeter,
                    height: desc.height! * Config.PixelsPerMeter,
                    color: desc.color ?? Config.Torch.color,
                });
                // Torches may not need a body, but you can add one if needed
                return { id: desc.id, sprite, body: null };
            }
            case Config.Fuel.type: {
                const sprite = SpriteUtils.createSprite({
                    texture: PIXI.Texture.from(Config.Textures.fuel),
                    x: desc.x * Config.PixelsPerMeter,
                    y: desc.y * Config.PixelsPerMeter,
                    width: desc.width! * Config.PixelsPerMeter,
                    height: desc.height! * Config.PixelsPerMeter,
                    color: desc.color ?? Config.Fuel.color,
                });
                if (!world) throw new Error('World is required for fuel entity');
                const body = PhysicsUtils.createBody(world, {
                    type: 'static',
                    position: new planck.Vec2(desc.x, desc.y),
                    box: { width: desc.width!, height: desc.height! },
                    fixture: {
                        isSensor: true,
                        filterCategoryBits: Config.Physics.Collision.categoryFuel,
                        filterMaskBits: Config.Physics.Collision.categoryPlayer,
                    }
                });

                // Set user data with a self-referencing body
                body.setUserData({
                    type: desc.type,
                    id: desc.id,
                    sprite,
                    body
                });
                return { id: desc.id, sprite, body };
            }
            // Add more entity types as needed...
            default:
                throw new Error(`Unknown entity type: ${desc.type}`);
        }
    }
}