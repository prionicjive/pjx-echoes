import * as PIXI from "pixi.js";
import { Config } from "../config/Config";
import { Light } from "../light/Light";
import { Point, Segment } from "../utils/types";
import { CollisionUtils } from "./CollisionUtils";

export class LightUtils {
    /**
     * Constructs a polygon representing the visible area ("light cone") from a point, given a set of obstacle segments.
     * Shoots rays in all directions, finds the closest intersection with obstacles for each ray,
     * and returns the intersection points sorted by angle to form a smooth, ordered polygon.
     *
     * @param {Point} point
     *   The origin point (e.g., the light source or player position).
     * @param {Segment[]} segments
     *   An array of wall or obstacle segments, each defined by two endpoints.
     * @param {number} [numRays=360]
     *   The number of rays to cast (higher values = smoother polygon, but more computation).
     * @param {number} lightRadius
     *   The radius of the light source (In meters).
     * @returns {Array<{ point: Point, angle: number }>}
     *   An array of intersection points (with angle), sorted to form a continuous polygon.
     */
    static buildLightPolygon(
        point: Point,
        segments: Segment[],
        numRays: number = 360,
        lightRadius: number
    ): { point: Point; angle: number }[] {
        const points: { point: Point; angle: number }[] = [];

        // Reuse a single ray object each iteration — avoids numRays heap allocations per call
        const ray = { start: point, direction: { x: 0, y: 0 } };

        for (let i = 0; i < numRays; i++) {
            const angle = (i / numRays) * Math.PI * 2;
            ray.direction.x = Math.cos(angle);
            ray.direction.y = Math.sin(angle);
            const hit = CollisionUtils.findClosestIntersection(ray, segments, lightRadius);
            points.push({ point: hit.point, angle });
        }

        // No sort needed — rays are generated in ascending angular order
        return points;
    }

    // Take in an array of lights and render them all at once
    static renderLightsBatch(
        lights: Light[],
        cameraOffset: { x: number; y: number },
        screenBounds: { left: number; top: number; right: number; bottom: number },
        container: PIXI.Container,
        preUpdate?: (light: Light) => void
    ) {
        for (const light of lights) {
            if (preUpdate) preUpdate(light);
            LightUtils.renderLight(light, cameraOffset, screenBounds, container);
        }
    }

    static renderLight(
        light: Light,
        cameraOffset: { x: number; y: number },
        screenBounds: { left: number; top: number; right: number; bottom: number },
        container: PIXI.Container
    ) {
        if (!light) return;
    
        if (LightUtils.isLightOnScreen(light, screenBounds.left, screenBounds.top, screenBounds.right, screenBounds.bottom)) {
            light.sprite.visible = true;
            light.mask.visible = true;
    
            const screenX = (light.getPosition().x * Config.PixelsPerMeter) - cameraOffset.x;
            const screenY = (light.getPosition().y * Config.PixelsPerMeter) - cameraOffset.y;
    
            light.sprite.x = screenX;
            light.sprite.y = screenY;
            light.mask.x = screenX;
            light.mask.y = screenY;
    
            light.render();
    
            container.addChild(light.sprite);
            container.addChild(light.mask);
        } else {
            light.sprite.visible = false;
            light.mask.visible = false;
        }
    }

    static isLightOnScreen(light: Light, screenLeft: number, screenTop: number, screenRight: number, screenBottom: number): boolean {
        if (!light.sprite) return false;
        
        const x = light.sprite.x;
        const y = light.sprite.y;
        const r = light.radius * Config.PixelsPerMeter; // If radius is in meters
    
        return (
            x + r > screenLeft &&
            x - r < screenRight &&
            y + r > screenTop &&
            y - r < screenBottom
        );
    }
}