import { EntityType } from "../entities/types";
import { LightOptions } from "../light/Light";
import { CreateBodyOptions } from "../utils/PhysicsUtils";
import { Config } from "./Config";
import { LightsConfig } from "./LightsConfig";
import { ParticleEffectOptions } from "../particles/ParticleEffect";
import { ParticleEffectsConfig } from "./ParticleEffectsConfig";

interface EntitySprite {
    texture: string;
    widthInMeters: number;
    heightInMeters: number;
    color: number;
}

export interface EntityPreset {
    sprite: EntitySprite;
    body?: CreateBodyOptions;
    light?: LightOptions;
    particleEffect?: ParticleEffectOptions;
}

export const EntitiesConfig: Record<EntityType, EntityPreset> = {
    Sentry: {
        sprite: {
            texture: Config.Spritesheet.Textures.sentry,
            widthInMeters: Config.Sentry.radius * 2,
            heightInMeters: Config.Sentry.radius * 2,
            color: Config.Sentry.color
        },
        body: {
            type: 'dynamic',
            shape: { 
                type: 'circle', 
                radius: Config.Sentry.radius 
            },
            fixture: {
                friction: 0,
                density: 1,
                restitution: 1, // Perfect elasticity
                filterCategoryBits: Config.Physics.Collision.categorySentry,
                filterMaskBits: Config.Physics.Collision.categoryEdge
                    | Config.Physics.Collision.categoryPlayer
                    | Config.Physics.Collision.categorySentry
                    | Config.Physics.Collision.categoryGate
            }
        },
        //light: LightsConfig.SentryLight,
        particleEffect: ParticleEffectsConfig.SentryTrail
    },
    Player: {
        sprite: {
            texture: Config.Spritesheet.Textures.player,
            widthInMeters: Config.Player.radius * 2,
            heightInMeters: Config.Player.radius * 2,
            color: Config.Player.color
        },
        body: {
            type: 'dynamic',
            shape: { 
                type: 'circle', 
                radius: Config.Player.radius 
            },
            fixture: {
                friction: 0,
                density: 1,
                restitution: 0, // No bounce
                filterCategoryBits: Config.Physics.Collision.categoryPlayer,
                filterMaskBits: Config.Physics.Collision.categoryEdge
                    | Config.Physics.Collision.categorySentry
                    | Config.Physics.Collision.categoryExit
                    | Config.Physics.Collision.categoryAnti
                    | Config.Physics.Collision.categoryTorch
                    | Config.Physics.Collision.categoryGate
                    | Config.Physics.Collision.categorySwitch
            },
            linearDamping: Config.Physics.Player.linearDamping
        },
        light: LightsConfig.PlayerLight,
        particleEffect: ParticleEffectsConfig.PlayerTrail
    },
    Anti: {
        sprite: {
            texture: Config.Spritesheet.Textures.anti,
            widthInMeters: Config.Anti.width,
            heightInMeters: Config.Anti.height,
            color: Config.Anti.color
        },
        body: {
            type: 'static',
            shape: { 
                type: 'box', 
                width: Config.Anti.width, 
                height: Config.Anti.height 
            },
            fixture: {
                isSensor: true,
                filterCategoryBits: Config.Physics.Collision.categoryAnti,
                filterMaskBits: Config.Physics.Collision.categoryPlayer,
            }
        },
        light: LightsConfig.AntiLight,
    },
    Torch: {
        sprite: {
            texture: Config.Spritesheet.Textures.torch,
            widthInMeters: Config.Torch.width,
            heightInMeters: Config.Torch.height,
            color: Config.Torch.color
        },
        body: {
            type: 'static',
            shape: { 
                type: 'box', 
                width: Config.Torch.width, 
                height: Config.Torch.height 
            },
            fixture: {
                isSensor: true,
                filterCategoryBits: Config.Physics.Collision.categoryTorch,
                filterMaskBits: Config.Physics.Collision.categoryPlayer,
            }
        },
        light: LightsConfig.TorchLight,
        particleEffect: ParticleEffectsConfig.TorchRadiance,
    },
    Exit: {
        sprite: {
            texture: Config.Spritesheet.Textures.exit,
            widthInMeters: Config.Exit.width,
            heightInMeters: Config.Exit.height,
            color: Config.Exit.color
        },
        body: {
            type: 'static',
            shape: { 
                type: 'box', 
                width: Config.Exit.width, 
                height: Config.Exit.height 
            },
            fixture: {
                isSensor: true,
                filterCategoryBits: Config.Physics.Collision.categoryExit,
                filterMaskBits: Config.Physics.Collision.categoryPlayer,
            }
        },
        light: LightsConfig.ExitLight,
    },
    Wall: {
        sprite: {
            texture: Config.Spritesheet.Textures.block,
            widthInMeters: Config.Wall.width,
            heightInMeters: Config.Wall.height,
            color: Config.Wall.color
        }
    },
    Gate: {
        sprite: {
            texture: Config.Spritesheet.Textures.gate,
            widthInMeters: Config.Gate.width,
            heightInMeters: Config.Gate.height,
            color: Config.Gate.color
        },
        body: {
            type: 'static',
            shape: { 
                type: 'box', 
                width: Config.Gate.width, 
                height: Config.Gate.height 
            },
            fixture: {
                restitution: Config.Physics.Gate.restitution,
                friction: 0,
                filterCategoryBits: Config.Physics.Collision.categoryGate,
                filterMaskBits: Config.Physics.Collision.categoryPlayer | Config.Physics.Collision.categorySentry,
            }
        },
    },
    Switch: {
        sprite: {
            texture: Config.Spritesheet.Textures.switch,
            widthInMeters: Config.Switch.width,
            heightInMeters: Config.Switch.height,
            color: Config.Switch.color
        },
        body: {
            type: 'static',
            shape: { 
                type: 'box', 
                width: Config.Switch.width, 
                height: Config.Switch.height 
            },
            fixture: {
                isSensor: true,
                filterCategoryBits: Config.Physics.Collision.categorySwitch,
                filterMaskBits: Config.Physics.Collision.categoryPlayer,
            }
        },
        particleEffect: ParticleEffectsConfig.SwitchEffect,
        light: LightsConfig.SwitchLight,
    }
};
