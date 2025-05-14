import { EntityType } from "../entities/types";
import { CreateBodyOptions } from "../utils/PhysicsUtils";
import { Config } from "./Config";

export interface EntityPreset {
    body?: CreateBodyOptions;
}

export const EntitiesConfig: Record<EntityType, EntityPreset> = {
    Sentry: {
        body: {
            type: 'dynamic',
            circle: { radius: Config.Sentry.radius },
            fixture: {
                friction: 0,
                density: 1,
                restitution: 1, // Perfect elasticity
                filterCategoryBits: Config.Physics.Collision.categorySentry,
                filterMaskBits: Config.Physics.Collision.categoryEdge
                    | Config.Physics.Collision.categoryPlayer
                    | Config.Physics.Collision.categoryWall
                    | Config.Physics.Collision.categorySentry
            }
        }
    },
    Player: {
        body: {
            type: 'dynamic',
            circle: { radius: Config.Player.radius },
            fixture: {
                friction: 0,
                density: 1,
                restitution: 0, // No bounce
                filterCategoryBits: Config.Physics.Collision.categoryPlayer,
                filterMaskBits: Config.Physics.Collision.categoryEdge
                    | Config.Physics.Collision.categorySentry
                    | Config.Physics.Collision.categoryWall
                    | Config.Physics.Collision.categoryExit
                    | Config.Physics.Collision.categoryAnti
                    | Config.Physics.Collision.categoryTorch
            },
            linearDamping: Config.Physics.Player.linearDamping
        }
    },
    Anti: {
        body: {
            type: 'static',
            box: { width: Config.Anti.width, height: Config.Anti.height },
            fixture: {
                isSensor: true,
                filterCategoryBits: Config.Physics.Collision.categoryAnti,
                filterMaskBits: Config.Physics.Collision.categoryPlayer,
            }
        }
    },
    Torch: {
        body: {
            type: 'static',
            box: { width: Config.Torch.width, height: Config.Torch.height },
            fixture: {
                isSensor: true,
                filterCategoryBits: Config.Physics.Collision.categoryTorch,
                filterMaskBits: Config.Physics.Collision.categoryPlayer,
            }
        }
    },
    Exit: {
        body: {
            type: 'static',
            box: { width: Config.Exit.width, height: Config.Exit.height },
            fixture: {
                isSensor: true,
                filterCategoryBits: Config.Physics.Collision.categoryExit,
                filterMaskBits: Config.Physics.Collision.categoryPlayer,
            }
        }
    },
    Wall: {

    }
};
