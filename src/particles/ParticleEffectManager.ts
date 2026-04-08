import * as PIXI from 'pixi.js';
import { ParticleEffectsConfig } from '../config/ParticleEffectsConfig';
import { ParticleEffect } from './ParticleEffect';
import { ParticleEffectType } from './types';

export class ParticleEffectManager {
    private static _instance: ParticleEffectManager;
    private static readonly MAX_POOL_SIZE = 20;
    private effectPools: Map<ParticleEffectType, ParticleEffect[]> = new Map();
    private activeEffects: Set<ParticleEffect> = new Set();

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
        this.activeEffects.add(effect);

        // Listen for when all particles are dead
        effect.onEmpty(() => {
            effect.destroy();
            this.activeEffects.delete(effect);
        });
    }

    /** Get all effects as an array */
    getAllEffects(): ParticleEffect[] {
        return Array.from(this.activeEffects);
    }

    /** Remove an effect, destroy it, and remove from master list */
    removeEffect(effect: ParticleEffect) {
        if (this.activeEffects.has(effect)) {
            effect.destroy();
            this.activeEffects.delete(effect);
        }
    }

    /** Remove all effects, one by one */
    removeAllEffects() {
        for (const effect of this.activeEffects) {
            this.removeEffect(effect);
        }
        this.activeEffects.clear();
    }

    /**
     * Gently remove an effect - stop emission and let the manager handle the cleanup via onEmpty() as defined when the effect was originally added
     */
    gentlyRemoveEffect(effect: ParticleEffect) {
        if (!this.activeEffects.has(effect)) return;
        
        // Tell the effect to stop emitting new particles
        effect.stopEmission();
    }

    private getFromPool(type: ParticleEffectType): ParticleEffect | null {
        if (!this.effectPools.has(type)) {
            this.effectPools.set(type, []);
        }

        const pool = this.effectPools.get(type)!;
        const idle = pool.find(e => !e.isPlaying());
        if (idle) return idle;

        if (pool.length >= ParticleEffectManager.MAX_POOL_SIZE) {
            console.warn(`[ParticleEffectManager] Pool for "${type}" is full (${ParticleEffectManager.MAX_POOL_SIZE}). Effect skipped.`);
            return null;
        }

        const effect = new ParticleEffect(ParticleEffectsConfig[type]);
        pool.push(effect);
        return effect;
    }

    private returnToPool(effect: ParticleEffect) {
        // Stop the effect
        effect.stop();

        // Clear the callback
        effect.onEmpty(undefined); 
        
        // Remove from the active effects set
        this.activeEffects.delete(effect);

        // Important: Don't destroy the effect or its container
        // Just hide it and clear any callbacks
        effect.container.visible = false;

        // Clear the container's position/rotation/scale
        effect.container.position.set(0, 0);
        effect.container.rotation = 0;
        effect.container.scale.set(1, 1);
    
        // The effect's particles are still in memory but marked as not alive
        // They'll be reused when the effect is played again
    }

    playEffect(container: PIXI.Container, type: ParticleEffectType, position: {x: number, y: number}, duration?: number): ParticleEffect | null {
        const effect = this.getFromPool(type);
        if (!effect) return null;

        effect.container.visible = true;
        effect.setPosition(position.x, position.y);

        if (duration !== undefined) {
            effect.duration = duration;
        }

        if (effect.container.parent !== container) {
            container.addChild(effect.container);
        }

        this.activeEffects.add(effect);

        effect.onEmpty(() => {
            this.returnToPool(effect);
        });

        effect.play();

        return effect;
    }

    update(deltaTime: number) {
        for (const effect of this.activeEffects) {
            effect.update(deltaTime);
        }
    }

    debugPoolState() {
        console.log('=== Particle Effect Pool State ===');
        console.log(`Active effects: ${this.activeEffects.size}`);
        
        this.effectPools.forEach((pool, type) => {
            const active = pool.filter(e => e.isPlaying()).length;
            console.log(`Type ${type}: ${pool.length} total, ${active} active, ${pool.length - active} available`);
        });
    }
}