import { ParticleEffect } from './ParticleEffect';

export class ParticleEffectManager {
    private static _instance: ParticleEffectManager;
    private effects: Set<ParticleEffect> = new Set();

    // Singleton accessor
    static get instance(): ParticleEffectManager {
        if (!ParticleEffectManager._instance) {
            ParticleEffectManager._instance = new ParticleEffectManager();
        }
        return ParticleEffectManager._instance;
    }

    private constructor() {}

    /** Add a single effect to the master list */
    addEffect(effect: ParticleEffect) {
        this.effects.add(effect);
    }

    /** Add an array of effects to the master list */
    addEffects(effects: ParticleEffect[]) {
        for (const effect of effects) {
            this.effects.add(effect);
        }
    }

    /** Get all effects as an array */
    getAllEffects(): ParticleEffect[] {
        return Array.from(this.effects);
    }

    /** Remove an effect, destroy it, and remove from master list */
    removeEffect(effect: ParticleEffect) {
        if (this.effects.has(effect)) {
            effect.destroy();
            this.effects.delete(effect);
        }
    }

    /** Remove all effects, destroying each one */
    removeAllEffects() {
        for (const effect of this.effects) {
            effect.destroy();
        }
        this.effects.clear();
    }

    /**
     * Gently remove an effect: stop emission, wait for all particles to die, then destroy and remove.
     * Assumes ParticleEffect has stopEmission() and an 'onEmpty' event/callback for when all particles are gone.
     */
    // gentlyRemoveEffect(effect: ParticleEffect) {
    //     if (!this.effects.has(effect)) return;
    //     effect.stopEmission?.();

    //     // Listen for when all particles are dead
    //     if (typeof effect.onEmpty === 'function') {
    //         effect.onEmpty(() => {
    //             effect.destroy();
    //             this.effects.delete(effect);
    //         });
    //     } else if (effect.once) { // PIXI or EventEmitter style
    //         effect.once('empty', () => {
    //             effect.destroy();
    //             this.effects.delete(effect);
    //         });
    //     }
    // }

    update(deltaTime: number) {
        for (const effect of this.effects) {
            effect.update(deltaTime);
        }
    }
}