import * as PIXI from 'pixi.js';
import { Config } from '../config/Config';
import { LidarConfig } from '../config/LidarConfig';
import { CollisionUtils } from '../utils/CollisionUtils';
import { Point, Segment } from '../utils/types';
import { EdgeGlowSegment } from './EdgeGlowSegment';

interface RayHit {
    angle: number;
    hitDistance: number;       // meters from origin (or maxRadius if no wall hit)
    hitPoint: Point;           // world meters
    hitSegment: Segment | null; // null if ray reached maxRadius without hitting a wall
}

type LidarPhase = 'expanding' | 'fading' | 'dead';

export class LidarPulse {
    private origin: Point;

    private currentRadius: number = 0;
    private phase: LidarPhase = 'expanding';
    private fadeAlpha: number = 1;

    // Pre-computed ray data (one-time at construction)
    private rayData: RayHit[];

    // Edge glow segments pending activation (sorted by triggerRadius)
    private pendingGlows: EdgeGlowSegment[];
    private pendingIndex: number = 0;

    // Newly activated glows this frame — drained by LidarManager
    private newGlows: EdgeGlowSegment[] = [];

    // Arc rendering
    private arcGraphics: PIXI.Graphics;

    constructor(origin: Point, edges: Segment[]) {
        this.origin = { ...origin };
        this.arcGraphics = new PIXI.Graphics();
        this.arcGraphics.blendMode = 'add';

        // One-time raycasting at construction
        this.rayData = this.castAllRays(edges);

        // Group consecutive same-segment hits into EdgeGlowSegments
        this.pendingGlows = this.buildEdgeGlowSegments();
        this.pendingGlows.sort((a, b) => a.triggerRadius - b.triggerRadius);
    }

    // ─── One-time raycasting ────────────────────────────────────────────

    private castAllRays(edges: Segment[]): RayHit[] {
        const maxR = LidarConfig.maxRadius;
        const numRays = LidarConfig.numRays;
        const ox = this.origin.x;
        const oy = this.origin.y;

        const bounds = {
            minX: ox - maxR, maxX: ox + maxR,
            minY: oy - maxR, maxY: oy + maxR,
        };
        const nearbyEdges = edges.filter(seg => CollisionUtils.isSegmentInBounds(seg, bounds));

        const results: RayHit[] = [];

        for (let i = 0; i < numRays; i++) {
            const angle = (i / numRays) * Math.PI * 2;
            const dx = Math.cos(angle);
            const dy = Math.sin(angle);
            const ray = { start: { x: ox, y: oy }, direction: { x: dx, y: dy } };

            let closestDist = maxR;
            let closestPoint: Point = { x: ox + dx * maxR, y: oy + dy * maxR };
            let closestSeg: Segment | null = null;

            for (const seg of nearbyEdges) {
                const hit = CollisionUtils.getRaySegmentIntersection(ray, seg, maxR);
                if (hit && hit.distance < closestDist) {
                    closestDist = hit.distance;
                    closestPoint = hit.point;
                    closestSeg = seg;
                }
            }

            results.push({
                angle,
                hitDistance: closestDist,
                hitPoint: closestPoint,
                hitSegment: closestSeg,
            });
        }

        return results;
    }

    // ─── EdgeGlowSegment grouping ───────────────────────────────────────

    private buildEdgeGlowSegments(): EdgeGlowSegment[] {
        const maxR = LidarConfig.maxRadius;
        const segments: EdgeGlowSegment[] = [];
        const numRays = this.rayData.length;
        if (numRays === 0) return segments;

        const segKey = (seg: Segment | null): string => {
            if (!seg) return '';
            return `${seg.a.x},${seg.a.y}-${seg.b.x},${seg.b.y}`;
        };

        // Collect groups of consecutive rays hitting the same segment
        interface RayGroup { seg: Segment; indices: number[] }
        const groups: RayGroup[] = [];
        let currentGroup: RayGroup | null = null;

        for (let i = 0; i < numRays; i++) {
            const ray = this.rayData[i];
            if (!ray.hitSegment) {
                currentGroup = null;
                continue;
            }
            const key = segKey(ray.hitSegment);
            if (!currentGroup || segKey(currentGroup.seg) !== key) {
                currentGroup = { seg: ray.hitSegment, indices: [] };
                groups.push(currentGroup);
            }
            currentGroup.indices.push(i);
        }

        // Handle wrap-around: if first and last groups hit the same segment, merge
        if (groups.length >= 2) {
            const first = groups[0];
            const last = groups[groups.length - 1];
            if (segKey(first.seg) === segKey(last.seg)) {
                first.indices = [...last.indices, ...first.indices];
                groups.pop();
            }
        }

        // Computes the outward unit normal of a wall segment (pointing toward open space / origin)
        const outwardNormal = (seg: Segment): { x: number; y: number } => {
            const sdx = seg.b.x - seg.a.x;
            const sdy = seg.b.y - seg.a.y;
            const sLen = Math.sqrt(sdx * sdx + sdy * sdy);
            if (sLen === 0) return { x: 0, y: -1 };
            const n1x = -sdy / sLen;
            const n1y =  sdx / sLen;
            const midX = (seg.a.x + seg.b.x) / 2;
            const midY = (seg.a.y + seg.b.y) / 2;
            const dot = n1x * (this.origin.x - midX) + n1y * (this.origin.y - midY);
            return dot >= 0 ? { x: n1x, y: n1y } : { x: -n1x, y: -n1y };
        };

        // For each group, emit 2-point sub-segments per consecutive pair
        for (const group of groups) {
            const { seg, indices } = group;

            if (indices.length === 1) {
                // Single-ray hit: extend slightly along the segment direction
                const ray = this.rayData[indices[0]];
                const color = LidarPulse.sampleGradient(ray.hitDistance / maxR);
                const sdx = seg.b.x - seg.a.x;
                const sdy = seg.b.y - seg.a.y;
                const sLen = Math.sqrt(sdx * sdx + sdy * sdy);
                if (sLen > 0) {
                    const eps = 0.05; // 5cm
                    const nx = (sdx / sLen) * eps;
                    const ny = (sdy / sLen) * eps;
                    segments.push(new EdgeGlowSegment(
                        [
                            { position: { x: ray.hitPoint.x - nx, y: ray.hitPoint.y - ny }, color },
                            { position: { x: ray.hitPoint.x + nx, y: ray.hitPoint.y + ny }, color },
                        ],
                        ray.hitDistance,
                        outwardNormal(seg)
                    ));
                }
                continue;
            }

            // Create one 2-point sub-segment per consecutive pair
            for (let j = 0; j < indices.length - 1; j++) {
                const rayA = this.rayData[indices[j]];
                const rayB = this.rayData[indices[j + 1]];
                const colorA = LidarPulse.sampleGradient(rayA.hitDistance / maxR);
                const colorB = LidarPulse.sampleGradient(rayB.hitDistance / maxR);
                const trigger = Math.max(rayA.hitDistance, rayB.hitDistance);

                segments.push(new EdgeGlowSegment(
                    [
                        { position: { ...rayA.hitPoint }, color: colorA },
                        { position: { ...rayB.hitPoint }, color: colorB },
                    ],
                    trigger,
                    outwardNormal(seg)
                ));
            }
        }

        return segments;
    }

    // ─── Color gradient utilities ───────────────────────────────────────

    static sampleGradient(t: number): number {
        const stops = LidarConfig.colorGradient;
        if (t <= stops[0].t) return stops[0].color;
        if (t >= stops[stops.length - 1].t) return stops[stops.length - 1].color;

        for (let i = 0; i < stops.length - 1; i++) {
            if (t >= stops[i].t && t <= stops[i + 1].t) {
                const localT = (t - stops[i].t) / (stops[i + 1].t - stops[i].t);
                return LidarPulse.lerpColor(stops[i].color, stops[i + 1].color, localT);
            }
        }
        return stops[stops.length - 1].color;
    }

    static lerpColor(a: number, b: number, t: number): number {
        const ar = (a >> 16) & 0xFF, ag = (a >> 8) & 0xFF, ab = a & 0xFF;
        const br = (b >> 16) & 0xFF, bg = (b >> 8) & 0xFF, bb = b & 0xFF;
        const r = Math.round(ar + (br - ar) * t);
        const g = Math.round(ag + (bg - ag) * t);
        const bv = Math.round(ab + (bb - ab) * t);
        return (r << 16) | (g << 8) | bv;
    }

    // ─── Update ─────────────────────────────────────────────────────────

    update(dt: number): void {
        if (this.phase === 'dead') return;

        if (this.phase === 'expanding') {
            this.currentRadius += LidarConfig.expansionSpeed * dt;
            if (this.currentRadius >= LidarConfig.maxRadius) {
                this.currentRadius = LidarConfig.maxRadius;
                this.phase = 'fading';
            }

            // Activate pending glows whose triggerRadius <= currentRadius
            while (this.pendingIndex < this.pendingGlows.length &&
                   this.pendingGlows[this.pendingIndex].triggerRadius <= this.currentRadius) {
                this.newGlows.push(this.pendingGlows[this.pendingIndex]);
                this.pendingIndex++;
            }
        }

        if (this.phase === 'fading') {
            if (LidarConfig.fadeOutDuration <= 0) {
                this.fadeAlpha = 0;
                this.phase = 'dead';
            } else {
                this.fadeAlpha -= dt / LidarConfig.fadeOutDuration;
                if (this.fadeAlpha <= 0) {
                    this.fadeAlpha = 0;
                    this.phase = 'dead';
                }
            }
        }
    }

    /**
     * Returns and clears the list of EdgeGlowSegments activated since the last drain.
     */
    drainNewGlows(): EdgeGlowSegment[] {
        const glows = this.newGlows;
        this.newGlows = [];
        return glows;
    }

    // ─── Arc rendering ──────────────────────────────────────────────────

    renderArc(container: PIXI.Container): void {
        if (this.phase === 'dead') return;

        const ppm = Config.PixelsPerMeter;
        const worldX = this.origin.x * ppm;
        const worldY = this.origin.y * ppm;
        const radiusPx = this.currentRadius * ppm;

        this.arcGraphics.clear();

        const color = LidarPulse.sampleGradient(this.currentRadius / LidarConfig.maxRadius);

        // Distance-based fade: lerp arcAlpha → 0 once radius passes arcFadeStartRatio
        const ratio = this.currentRadius / LidarConfig.maxRadius;
        const fadeStart = LidarConfig.arcFadeStartRatio;
        const distAlpha = ratio < fadeStart
            ? 1.0
            : 1.0 - (ratio - fadeStart) / (1.0 - fadeStart);
        const alpha = LidarConfig.arcAlpha * distAlpha * this.fadeAlpha;

        if (alpha <= 0 || radiusPx <= 0) {
            this.arcGraphics.x = worldX;
            this.arcGraphics.y = worldY;
            container.addChild(this.arcGraphics);
            return;
        }

        // Find runs of consecutive open (unblocked) rays
        const numRays = this.rayData.length;
        const runs: number[][] = [];
        let currentRun: number[] | null = null;

        for (let i = 0; i < numRays; i++) {
            if (this.rayData[i].hitDistance >= this.currentRadius) {
                if (!currentRun) currentRun = [];
                currentRun.push(i);
            } else {
                if (currentRun) {
                    runs.push(currentRun);
                    currentRun = null;
                }
            }
        }
        if (currentRun) runs.push(currentRun);

        // Handle wrap-around: merge last and first run if both start/end at edges
        if (runs.length >= 2) {
            const first = runs[0];
            const last = runs[runs.length - 1];
            if (first[0] === 0 && last[last.length - 1] === numRays - 1) {
                runs[0] = [...last, ...first];
                runs.pop();
            }
        }

        // Draw each run as a polyline arc
        for (const run of runs) {
            if (run.length === 0) continue;

            const firstAngle = this.rayData[run[0]].angle;
            this.arcGraphics.moveTo(
                Math.cos(firstAngle) * radiusPx,
                Math.sin(firstAngle) * radiusPx
            );

            for (let j = 1; j < run.length; j++) {
                const a = this.rayData[run[j]].angle;
                this.arcGraphics.lineTo(
                    Math.cos(a) * radiusPx,
                    Math.sin(a) * radiusPx
                );
            }

            this.arcGraphics.stroke({
                width: LidarConfig.arcThickness,
                color: color,
                alpha: alpha,
            });
        }

        this.arcGraphics.x = worldX;
        this.arcGraphics.y = worldY;
        container.addChild(this.arcGraphics);
    }

    // ─── Lifecycle ──────────────────────────────────────────────────────

    isDead(): boolean {
        return this.phase === 'dead';
    }

    destroy(): void {
        this.arcGraphics.destroy();
    }
}
