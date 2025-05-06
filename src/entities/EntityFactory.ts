import { SpriteUtils } from '../utils/SpriteUtils';
import { PhysicsUtils } from '../utils/PhysicsUtils';
import { Config } from '../core/Config';
import * as planck from 'planck';
import * as PIXI from 'pixi.js';
import { Entity, EntityOptions, EntityUserData, EntityType } from './types';

export class EntityFactory {
    static create(desc: EntityOptions, world?: planck.World): Entity {
        switch (desc.type) {
            case 'WALL': {
                const sprite = SpriteUtils.createSprite({
                    texture: PIXI.Texture.from(Config.Textures.block),
                    x: desc.x,
                    y: desc.y,
                    width: desc.width,
                    height: desc.height,
                    color: desc.color ?? Config.Wall.color,
                });
                return { id: desc.id, sprite, body: null };
            }
            case 'FINISH': {
                const sprite = SpriteUtils.createSprite({
                    texture: PIXI.Texture.from(Config.Textures.finish),
                    x: desc.x,
                    y: desc.y,
                    width: desc.width,
                    height: desc.height,
                    color: desc.color ?? Config.Finish.color,
                });
                if (!world) throw new Error('World is required for finish entity');

                const body = PhysicsUtils.createBoxBody(world, {
                    type: 'static',
                    position: new planck.Vec2(desc.x, desc.y),
                    box: { width: desc.width, height: desc.height },
                    fixture: {
                        isSensor: true,
                        restitution: 0,
                        friction: 0,
                        filterCategoryBits: Config.Physics.Collision.categoryFinish,
                        filterMaskBits: Config.Physics.Collision.categoryPlayer,
                    }
                });

                // Set user data with a self-referencing body
                const userData: EntityUserData = {
                    type: Config.Finish.type as EntityType,
                    id: desc.id,
                    sprite: sprite,
                    body
                };
                body.setUserData(userData);

                return { id: desc.id, sprite, body };
            }
            case 'TORCH': {
                const sprite = SpriteUtils.createSprite({
                    texture: PIXI.Texture.from(Config.Textures.torch),
                    x: desc.x,
                    y: desc.y,
                    width: desc.width,
                    height: desc.height,
                    color: desc.color ?? Config.Torch.color,
                });
                return { id: desc.id, sprite, body: null };
            }
            case 'FUEL': {
                const sprite = SpriteUtils.createSprite({
                    texture: PIXI.Texture.from(Config.Textures.fuel),
                    x: desc.x,
                    y: desc.y,
                    width: desc.width,
                    height: desc.height,
                    color: desc.color ?? Config.Fuel.color,
                });
                if (!world) throw new Error('World is required for fuel entity');
                
                const body = PhysicsUtils.createBoxBody(world, {
                    type: 'static',
                    position: new planck.Vec2(desc.x, desc.y),
                    box: { width: desc.width, height: desc.height },
                    fixture: {
                        isSensor: true,
                        restitution: 0,
                        friction: 0,
                        filterCategoryBits: Config.Physics.Collision.categoryFuel,
                        filterMaskBits: Config.Physics.Collision.categoryPlayer,
                    }
                });

                // Set user data with a self-referencing body
                const userData: EntityUserData = {
                    type: Config.Fuel.type as EntityType,
                    id: desc.id,
                    sprite: sprite,
                    body
                };
                body.setUserData(userData);

                return { id: desc.id, sprite, body };
            }
            default:
                throw new Error(`Unknown entity type: ${desc.type}`);
        }
    }
}