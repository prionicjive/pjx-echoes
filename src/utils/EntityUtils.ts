import { BaseEntity } from "../entities/BaseEntity";

export class EntityUtils {
    static generateRandomId(prefix: string = "none") {
        return `${prefix}-${Date.now()}-${Math.random()}`;
    }   
    
    static syncLightToBody(entity: BaseEntity) {
        if (entity.light && entity.body) {
            entity.light.setPosition({ ...entity.body.getPosition() });
        }
    }

    static syncEffectToSprite(entity: BaseEntity) {
        if (entity.particleEffect && entity.sprite) {
            entity.particleEffect.setPosition(
                entity.sprite.x + entity.sprite.width / 2,
                entity.sprite.y + entity.sprite.height / 2
            );
        }
    }
}
