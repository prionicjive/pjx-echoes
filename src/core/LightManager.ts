import { Light } from './Light';
import gsap from 'gsap';

export type LightId = string;

export class LightManager {
    /**
     * Lights queued for removal after fade-out. Process after update/render.
     */
    private pendingRemove: Set<LightId> = new Set();
    private static _instance: LightManager | null = null;
    private staticLights: Map<LightId, Light> = new Map();
    private dynamicLights: Map<LightId, Light> = new Map();

    private constructor() {}

    public static get instance(): LightManager {
        if (!LightManager._instance) {
            LightManager._instance = new LightManager();
        }
        return LightManager._instance;
    }

    /**
     * Add a single static light.
     */
    addStaticLight(light: Light): LightId {
        const id = light.entityId || this.generateId();
        light.entityId = id;
        this.staticLights.set(id, light);
        // Optionally: light.calculateGeometry() here
        return id;
    }

    /**
     * Add multiple static lights at once.
     */
    addStaticLights(lights: Light[]): void {
        for (const light of lights) {
            this.addStaticLight(light);
        }
    }

    addDynamicLight(light: Light): LightId {
        const id = light.entityId || this.generateId();
        light.entityId = id;
        this.dynamicLights.set(id, light);
        return id;
    }

    /**
     * Remove a dynamic light by reference or ID, with a fade-out tween.
     */
    removeDynamicLight(lightOrId: Light | LightId) {
        const light = typeof lightOrId === 'string' ? this.dynamicLights.get(lightOrId) : lightOrId;
        if (light) {
            this.fadeOutAndRemoveLight(light);
        }
    }

    /**
     * Remove a static light by reference or ID, with a fade-out tween.
     */
    removeStaticLight(lightOrId: Light | LightId) {
        const light = typeof lightOrId === 'string' ? this.staticLights.get(lightOrId) : lightOrId;
        if (light) {
            this.fadeOutAndRemoveLight(light);
        }
    }

    /**
     * Fades out a light, queues for removal after update/render. Do not destroy immediately.
     */
    private fadeOutAndRemoveLight(light: Light, fadeDuration: number = 1) {
        const id = light.entityId;
        if (!id) return;
        // Mark as fading out so update/render skips this light
        light.isFadingOut = true;
        if (light.sprite && typeof light.sprite.alpha === 'number') {
            // Use GSAP to fade out the sprite
            gsap.to(light.sprite, {
                alpha: 0,
                duration: fadeDuration,
                onComplete: () => {
                    this.pendingRemove.add(id);
                }
            });
        } else {
            this.pendingRemove.add(id);
        }
    }

    // At the end of update/render (or at the start of the next frame)
    public processPendingRemovals() {
        for (const id of this.pendingRemove) {
            const light = this.dynamicLights.get(id) || this.staticLights.get(id);
            if (light) {
                this.dynamicLights.delete(id);
                this.staticLights.delete(id);
                light.destroy();
            }
        }
        this.pendingRemove.clear();
    }

    /**
     * Remove any light (static or dynamic) by ID.
     */
    removeLight(id: LightId) {
        this.staticLights.delete(id);
        this.dynamicLights.delete(id);
    }

    /**
     * Clear all static and dynamic lights.
     */
    clearLights() {
        this.staticLights.clear();
        this.dynamicLights.clear();
    }

    update() {
        // Update all dynamic lights
        for (const light of this.dynamicLights.values()) {
            if (!light.isFadingOut) {
                light.update(null);
            }
        }
        
        // Update all static lights
        for (const light of this.staticLights.values()) {
            if (!light.isFadingOut) {
                light.update(null);
            }
        }
    }

    getStaticLights(): Light[] {
        return Array.from(this.staticLights.values());
    }
    getDynamicLights(): Light[] {
        return Array.from(this.dynamicLights.values());
    }

    private generateId(): LightId {
        return 'light_' + Math.random().toString(36).substr(2, 9);
    }
}
