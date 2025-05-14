import * as PIXI from 'pixi.js';
import { ParticleEffectsConfig, ParticleEffectType } from '../config/ParticleEffectsConfig';
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

        // Listen for when all particles are dead
        effect.onEmpty(() => {
            effect.destroy();
            this.effects.delete(effect);
        });
    }

    /** Add an array of effects to the master list */
    addEffects(effects: ParticleEffect[]) {
        for (const effect of effects) {
            this.addEffect(effect);
        }
    }

    /** Get all effects as an array */
    getAllEffects(): ParticleEffect[] {
        return Array.from(this.effects);
    }

    /** Play an effect of a certain type at given position, optionally for a given (possibly overriding) duration of time. This will also add the effect
     * to the specified container for rendering purposes.
    */
    playEffect(containerToAddEffectTo: PIXI.Container, type: ParticleEffectType, position: {x: number, y: number}, duration?: number): ParticleEffect {
        const effect = new ParticleEffect({ 
            ...ParticleEffectsConfig[type], 
            duration: duration || ParticleEffectsConfig[type].duration 
        });
        containerToAddEffectTo.addChild(effect.container);
        effect.setPosition(position.x, position.y);
        this.addEffect(effect);
        return effect;
    }

    /** Remove an effect, destroy it, and remove from master list */
    removeEffect(effect: ParticleEffect) {
        if (this.effects.has(effect)) {
            effect.destroy();
            this.effects.delete(effect);
        }
    }

    /** Remove all effects, one by one */
    removeAllEffects() {
        for (const effect of this.effects) {
            this.removeEffect(effect);
        }
        this.effects.clear();
    }

    /**
     * Gently remove an effect - stop emission and let the manager handle the cleanup via onEmpty() as defined when the effect was originally added
     */
    gentlyRemoveEffect(effect: ParticleEffect) {
        if (!this.effects.has(effect)) return;
        
        // Tell the effect to stop emitting new particles
        effect.stopEmission();
    }

    update(deltaTime: number) {
        for (const effect of this.effects) {
            effect.update(deltaTime);
        }
    }
}