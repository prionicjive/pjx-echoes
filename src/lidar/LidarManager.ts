import * as PIXI from 'pixi.js';
import { Config } from '../config/Config';
import { LidarConfig } from '../config/LidarConfig';
import { Point, Segment } from '../utils/types';
import { EdgeGlowSegment } from './EdgeGlowSegment';
import { LidarPulse } from './LidarPulse';

export class LidarManager {
    private activePulse: LidarPulse | null = null;
    private cooldownTimer: number = 0;

    // Persistent pool of edge glows — survives pulse death, supports multiple pulses
    private activeGlows: EdgeGlowSegment[] = [];

    // Shared graphics object for all edge glow rendering
    private edgeGlowGraphics: PIXI.Graphics = new PIXI.Graphics();

    constructor() {
        this.edgeGlowGraphics.blendMode = 'add';
    }

    /**
     * Attempt to fire a new LIDAR pulse from the given origin.
     * No-ops if a pulse is already active or cooldown hasn't elapsed.
     */
    fire(origin: Point, edges: Segment[]): void {
        if (this.activePulse && !this.activePulse.isDead()) return;
        if (this.cooldownTimer > 0) return;

        // Clean up previous dead pulse
        if (this.activePulse) {
            this.activePulse.destroy();
            this.activePulse = null;
        }

        this.activePulse = new LidarPulse(origin, edges);
        this.cooldownTimer = LidarConfig.cooldown;
    }

    update(dt: number): void {
        // Tick cooldown
        if (this.cooldownTimer > 0) {
            this.cooldownTimer -= dt;
            if (this.cooldownTimer < 0) this.cooldownTimer = 0;
        }

        // Update active pulse and drain newly activated glows
        if (this.activePulse) {
            this.activePulse.update(dt);

            const newGlows = this.activePulse.drainNewGlows();
            if (newGlows.length > 0) {
                this.activeGlows.push(...newGlows);
            }

            if (this.activePulse.isDead()) {
                this.activePulse.destroy();
                this.activePulse = null;
            }
        }

        // Age all active glows and remove expired ones
        for (const glow of this.activeGlows) {
            glow.update(dt);
        }
        this.activeGlows = this.activeGlows.filter(g => !g.isExpired());
    }

    render(container: PIXI.Container): void {
        container.removeChildren();

        // Render wavefront arc (pulse handles its own graphics)
        if (this.activePulse && !this.activePulse.isDead()) {
            this.activePulse.renderArc(container);
        }

        // Render all persistent edge glows
        this.edgeGlowGraphics.clear();
        const ppm = Config.PixelsPerMeter;

        for (const glow of this.activeGlows) {
            glow.render(this.edgeGlowGraphics, ppm);
        }

        container.addChild(this.edgeGlowGraphics);
    }

    destroy(): void {
        if (this.activePulse) {
            this.activePulse.destroy();
            this.activePulse = null;
        }
        this.activeGlows = [];
        this.edgeGlowGraphics.destroy();
        this.edgeGlowGraphics = new PIXI.Graphics();
        this.edgeGlowGraphics.blendMode = 'add';
        this.cooldownTimer = 0;
    }
}
