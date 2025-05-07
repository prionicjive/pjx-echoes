import { SpriteUtils } from '../utils/SpriteUtils';
import { PhysicsUtils } from '../utils/PhysicsUtils';
import { Config } from '../core/Config';
import * as planck from 'planck';
import * as PIXI from 'pixi.js';
import { Entity, EntityUserData, EntityType } from './types';

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
            case 'WALL': {
                const sprite = SpriteUtils.createSprite({
                    texture: PIXI.Texture.from(Config.Textures.block),
                    x: desc.x,
                    y: desc.y,
                    width: desc.width!,
                    height: desc.height!,
                    color: desc.color ?? Config.Wall.color,
                });
                return { id: desc.id, sprite, body: null };
            }
            case 'FINISH': {
                const sprite = SpriteUtils.createSprite({
                    texture: PIXI.Texture.from(Config.Textures.finish),
                    x: desc.x,
                    y: desc.y,
                    width: desc.width!,
                    height: desc.height!,
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
            case 'TORCH': {
                const sprite = SpriteUtils.createSprite({
                    texture: PIXI.Texture.from(Config.Textures.torch),
                    x: desc.x,
                    y: desc.y,
                    width: desc.width!,
                    height: desc.height!,
                    color: desc.color ?? Config.Torch.color,
                });
                // Torches may not need a body, but you can add one if needed
                return { id: desc.id, sprite, body: null };
            }
            case 'FUEL': {
                const sprite = SpriteUtils.createSprite({
                    texture: PIXI.Texture.from(Config.Textures.fuel),
                    x: desc.x,
                    y: desc.y,
                    width: desc.width!,
                    height: desc.height!,
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
            case 'PLAYER': {
                if (!world) throw new Error('World is required for player entity');
                const center = new planck.Vec2(desc.x + 0.5, desc.y + 0.5);
                const radius = desc.radius ?? 0.5;
                const color = desc.color ?? Config.Player.color;

                // Create sprite
                const sprite = SpriteUtils.createSprite({
                    texture: PIXI.Texture.from(Config.Textures.player),
                    x: center.x,
                    y: center.y,
                    width: 2 * radius,
                    height: 2 * radius,
                    color
                });

                // Create dynamic body
                const body = PhysicsUtils.createBody(world, {
                    type: 'dynamic',
                    position: center,
                    circle: { radius },
                    fixture: {
                        friction: 0,
                        density: 1,
                        filterCategoryBits: Config.Physics.Collision.categoryPlayer,
                        filterMaskBits: Config.Physics.Collision.categoryEdge
                            | Config.Physics.Collision.categoryWall
                            | Config.Physics.Collision.categoryFinish
                            | Config.Physics.Collision.categoryFuel
                    },
                    linearDamping: desc.linearDamping
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