import { SpriteUtils } from '../utils/SpriteUtils';
import { PhysicsUtils } from '../utils/PhysicsUtils';
import { Config } from '../core/Config';
import * as planck from 'planck';
import * as PIXI from 'pixi.js';
import { Entity, PhysicalEntity } from './types';

// TODO Standardize on lowercase and across config values
type EntityType = 'wall' | 'finish' | 'torch' | 'fuel';

interface BaseEntityDescriptor {
    type: EntityType;
    x: number;
    y: number;
    width: number;
    height: number;
    color?: number;
    // Optionally, add more fields for extensibility
    [key: string]: any;
}

export class EntityFactory {
    static create(desc: BaseEntityDescriptor, world?: planck.World): Entity | PhysicalEntity {
        switch (desc.type) {
            case 'wall': {
                const sprite = SpriteUtils.createSprite({
                    texture: PIXI.Texture.from(Config.Textures.wall),
                    x: desc.x,
                    y: desc.y,
                    width: desc.width,
                    height: desc.height,
                    color: desc.color ?? Config.Wall.color,
                });
                return { sprite };
            }
            case 'finish': {
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
                        userData: { type: Config.Physics.Collision.typeFinish },
                        filterCategoryBits: Config.Physics.Collision.categoryFinish,
                        filterMaskBits: Config.Physics.Collision.categoryPlayer,
                    }
                });
                return { sprite, body };
            }
            case 'torch': {
                const sprite = SpriteUtils.createSprite({
                    texture: PIXI.Texture.from(Config.Textures.torch),
                    x: desc.x,
                    y: desc.y,
                    width: desc.width,
                    height: desc.height,
                    color: desc.color ?? Config.Torch.color,
                });
                return { sprite };
            }
            case 'fuel': {
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
                        userData: {
                            type: Config.Physics.Collision.typeFuel,
                            sprite,
                            index: desc.index ?? 0
                        },
                        filterCategoryBits: Config.Physics.Collision.categoryFuel,
                        filterMaskBits: Config.Physics.Collision.categoryPlayer,
                    }
                });
                return { sprite, body };
            }
            default:
                throw new Error(`Unknown entity type: ${desc.type}`);
        }
    }
}