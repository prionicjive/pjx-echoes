import * as PIXI from 'pixi.js';
import { LidarConfig } from '../config/LidarConfig';
import { Point } from '../utils/types';

export interface GlowPoint {
    position: Point;   // world meters
    color: number;     // hex color based on ray depth at this point
}

export class EdgeGlowSegment {
    readonly points: GlowPoint[];
    readonly triggerRadius: number;
    age: number = 0;

    constructor(points: GlowPoint[], triggerRadius: number) {
        this.points = points;
        this.triggerRadius = triggerRadius;
    }

    update(dt: number): void {
        this.age += dt;
    }

    /**
     * Returns true if this glow has fully expired (past duration + fade).
     * A glowDuration of 0 means infinite — never expires.
     */
    isExpired(): boolean {
        const dur = LidarConfig.glowDuration;
        if (dur <= 0) return false; // infinite
        return this.age >= dur + LidarConfig.glowFadeDuration;
    }

    /**
     * Computes the current alpha for this glow based on age and config.
     */
    getAlpha(): number {
        const base = LidarConfig.glowBaseAlpha;
        const dur = LidarConfig.glowDuration;

        // Infinite lifespan — always full alpha
        if (dur <= 0) return base;

        // Still within active lifespan
        if (this.age < dur) return base;

        // Fading out
        const fadeElapsed = this.age - dur;
        const fadeDur = LidarConfig.glowFadeDuration;
        if (fadeDur <= 0) return 0;
        return base * Math.max(0, 1 - fadeElapsed / fadeDur);
    }

    /**
     * Draws sub-segments between consecutive points with lerped colors.
     */
    render(gfx: PIXI.Graphics, ppm: number): void {
        const alpha = this.getAlpha();
        if (alpha <= 0) return;

        for (let i = 0; i < this.points.length - 1; i++) {
            const a = this.points[i];
            const b = this.points[i + 1];
            const color = EdgeGlowSegment.lerpColor(a.color, b.color, 0.5);

            gfx.moveTo(a.position.x * ppm, a.position.y * ppm);
            gfx.lineTo(b.position.x * ppm, b.position.y * ppm);
            gfx.stroke({
                width: LidarConfig.glowThickness,
                color: color,
                alpha: alpha,
            });
        }
    }

    private static lerpColor(a: number, b: number, t: number): number {
        const ar = (a >> 16) & 0xFF, ag = (a >> 8) & 0xFF, ab = a & 0xFF;
        const br = (b >> 16) & 0xFF, bg = (b >> 8) & 0xFF, bb = b & 0xFF;
        const r = Math.round(ar + (br - ar) * t);
        const g = Math.round(ag + (bg - ag) * t);
        const bv = Math.round(ab + (bb - ab) * t);
        return (r << 16) | (g << 8) | bv;
    }
}
