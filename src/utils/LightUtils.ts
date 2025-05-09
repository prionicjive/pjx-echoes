import { Segment, Point } from "../utils/types";
import { CollisionUtils } from "./CollisionUtils";
import { Config } from "../config/Config";
import { Light } from "../core/Light";
import * as PIXI from "pixi.js";

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
    ): { point: Point, angle: number }[] {
        // Shoot rays outward from the point in all directions
        const rays = CollisionUtils.shootRaysFromPoint(point, numRays);
        const points: { point: Point, angle: number }[] = [];
    
        // For each ray, find the closest intersection with any segment
        for (const ray of rays) {
            const hit = CollisionUtils.findClosestIntersection(ray, segments, lightRadius);
            if (hit) {
                // Store the intersection point along with its angle from the origin
                points.push({ point: hit.point, angle: Math.atan2(hit.point.y - point.y, hit.point.x - point.x) });
            }
        }

        // Sort the points by angle so the polygon is continuous and smooth
        points.sort((a, b) => a.angle - b.angle);

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
    
            const screenX = (light.pos.x * Config.PixelsPerMeter) - cameraOffset.x;
            const screenY = (light.pos.y * Config.PixelsPerMeter) - cameraOffset.y;
    
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