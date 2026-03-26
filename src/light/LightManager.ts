import gsap from 'gsap';
import { Light } from './Light';

export type LightId = string;

export class LightManager {
    /**
     * Lights queued for removal after fade-out. Process after update/render.
     */
    private pendingRemove: Set<LightId> = new Set();
    private static _instance: LightManager | null = null;
    private lights: Map<LightId, Light> = new Map();

    private constructor() {}

    public static get instance(): LightManager {
        if (!LightManager._instance) {
            LightManager._instance = new LightManager();
        }
        return LightManager._instance;
    }

    /**
     * Add a single light.
     */
    addLight(light: Light): void {
        this.lights.set(light.id, light);
    }

    /**
     * Add multiple lights at once.
     */
    addLights(lights: Light[]): void {
        for (const light of lights) {
            this.addLight(light);
        }
    }

    /**
     * Remove a light by reference or ID, with a fade-out tween.
     */
    gentlyRemoveLight(lightOrId: Light | LightId) {
        const light = typeof lightOrId === 'string' ? this.lights.get(lightOrId) : lightOrId;
        if (light) {
            this.fadeOutAndRemoveLight(light);
        }
    }

    removeLight(lightOrId: Light | LightId) {
        const light = typeof lightOrId === 'string' ? this.lights.get(lightOrId) : lightOrId;
        if (light) {
            // Destroy and remove right away
            light.destroy();
            this.lights.delete(light.id);
        }
    }

    /**
     * Fades out a light, queues for removal after update/render. Do not destroy immediately.
     */
    private fadeOutAndRemoveLight(light: Light, fadeDuration: number = 1) {
        const id = light.id;
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
            const light = this.lights.get(id);
            if (light) {
                this.lights.delete(id);
                light.destroy();
            }
        }
        this.pendingRemove.clear();
    }

    /**
     * Destroy then remove all lights.
     */
    removeAllLights() {
        for (const light of this.lights.values()) {
            light.destroy();
        }

        this.lights.clear();
        this.pendingRemove.clear();
    }

    update() {
        // Update all lights
        for (const light of this.lights.values()) {
            if (!light.isFadingOut) {
                light.update(null);
            }
        }
    }

    getAllLights(): Light[] {
        return Array.from(this.lights.values());
    }
}
