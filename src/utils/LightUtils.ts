import { Segment, Point } from "../utils/types";
import { CollisionUtils } from "./CollisionUtils";

// LightUtils.ts
/**
 * A collection of light utility functions for pjx-echoes.
 * Used building out light points.
 *
 * @module LightUtils
 */

/**
 * LightUtils provides static helper functions for light operations commonly needed in this game.
 */
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
}