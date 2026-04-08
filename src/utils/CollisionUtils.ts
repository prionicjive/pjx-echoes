import { Point, Segment } from "./types";
  
export class CollisionUtils {
        /**
     * Generates an array of ray objects radiating outward from a given point.
     * Each ray is defined by a starting position and a direction vector.
     *
     * @param {Point} point - The origin point from which to shoot rays.
     * @param {number} [numRays=360] - The number of rays to generate (spread evenly in a circle).
     * @returns {Array<{ start: Point, direction: Point }>} 
     *   An array of rays, each with a start position and normalized direction vector.
     */
    /**
     * Calculates the intersection point (if any) between a ray and a line segment.
     * Useful for 2D raycasting, e.g., for lighting, visibility, or collision checks.
     *
     * @param {{ start: Point, direction: Point }} ray
     *   The ray, defined by a starting point and a (normalized) direction vector.
     * @param {Point} segStart
     *   The starting point of the line segment.
     * @param {Point} segEnd
     *   The ending point of the line segment.
     * @param {number} [maxDistance=Infinity]
     *   The maximum distance along the ray to check for intersection.
     * @returns {{ point: Point, distance: number } | null}
     *   The intersection point (with distance along the ray), or null if no intersection.
     */
    static getRaySegmentIntersection(
        ray: { 
            start: Point, 
            direction: Point 
        }, 
        seg: Segment,
        maxDistance: number = Infinity
    ) {
        // Extract ray and segment components for clarity
        const r_px = ray.start.x;
        const r_py = ray.start.y;
        const r_dx = ray.direction.x;
        const r_dy = ray.direction.y;

        const s_px = seg.a.x;
        const s_py = seg.a.y;
        const s_dx = seg.b.x - seg.a.x;
        const s_dy = seg.b.y - seg.a.y;

        // Ray direction is always a unit vector (generated via Math.cos/Math.sin) — skip sqrt.
        // Guard against a degenerate zero-direction ray just in case.
        if (r_dx === 0 && r_dy === 0) return null;

        const s_mag = Math.sqrt(s_dx * s_dx + s_dy * s_dy);
        if (s_mag === 0) return null;

        // Check if the ray and segment are parallel via cross product (no intersection)
        // r_mag = 1 (unit vector), so threshold simplifies to 1e-10 * s_mag
        const cross = r_dx * s_dy - r_dy * s_dx;
        if (Math.abs(cross) < 1e-10 * s_mag) return null;

        // Solve for intersection using parametric equations
        // t = distance along the ray, u = position along the segment (0 to 1)
        const t = ((s_px - r_px) * s_dy - (s_py - r_py) * s_dx) / (r_dx * s_dy - r_dy * s_dx);
        const u = ((s_px - r_px) * r_dy - (s_py - r_py) * r_dx) / (r_dx * s_dy - r_dy * s_dx);

        // Intersection occurs if t > 0 (in front of the ray) and 0 <= u <= 1 (on the segment)
        // r_mag = 1, so actualDistance = t * 1 = t
        if (t > 0 && u >= 0 && u <= 1 && t <= maxDistance) {
            return {
                point: { x: r_px + r_dx * t, y: r_py + r_dy * t },
                distance: t
            };
        }

        return null;
    }

    /**
     * Finds the closest intersection point (if any) between a ray and a set of line segments.
     * Useful for raycasting against multiple obstacles—returns the nearest hit along the ray.
     *
     * @param {{ start: Point, direction: Point }} ray
     *   The ray to cast, defined by a starting point and direction vector.
     * @param {Segment[]} segments
     *   An array of line segments, each defined by two endpoints.
     * @param {number} maxDistance
     *   The maximum distance along the ray to check for intersection.
     * @returns {{ point: Point, distance: number } | null}
     *   The closest intersection point (with distance along the ray), or null if no intersection.
     */
    static findClosestIntersection(
        ray: { 
            start: Point,
            direction: Point 
        }, 
        segments: Segment[],
        maxDistance: number
    ) {
        let closestIntersection: { point: Point, distance: number } | null = null;
    
        // Check each segment for intersection with the ray
        for (const segment of segments) {
            const intersection = CollisionUtils.getRaySegmentIntersection(ray, segment, maxDistance);
            // If this intersection is closer than any previous one, remember it
            if (intersection && (!closestIntersection || intersection.distance < closestIntersection.distance)) {
                closestIntersection = intersection;
            }
        }

        if (!closestIntersection) {
            // No wall hit — project ray endpoint at radius
            closestIntersection = {
                point: {
                    x: ray.start.x + ray.direction.x * maxDistance,
                    y: ray.start.y + ray.direction.y * maxDistance
                },
                distance: maxDistance
            };
        }
    
        // Return the nearest intersection (or null if there were none)
        return closestIntersection;
    } 
    
    /**
     * Tests whether a point lies inside a polygon using the ray-casting algorithm.
     * @param point The point to test (world meters).
     * @param polygon Ordered array of polygon vertices (world meters).
     */
    static isPointInPolygon(point: Point, polygon: Point[]): boolean {
        const n = polygon.length;
        if (n < 3) return false;
        let inside = false;
        const px = point.x;
        const py = point.y;
        for (let i = 0, j = n - 1; i < n; j = i++) {
            const xi = polygon[i].x, yi = polygon[i].y;
            const xj = polygon[j].x, yj = polygon[j].y;
            if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) {
                inside = !inside;
            }
        }
        return inside;
    }

    static isSegmentInBounds(segment: Segment, bounds: { minX: number; maxX: number; minY: number; maxY: number }) {
        const minX = Math.min(segment.a.x, segment.b.x);
        const maxX = Math.max(segment.a.x, segment.b.x);
        const minY = Math.min(segment.a.y, segment.b.y);
        const maxY = Math.max(segment.a.y, segment.b.y);
      
        return !(
          maxX < bounds.minX ||
          minX > bounds.maxX ||
          maxY < bounds.minY ||
          minY > bounds.maxY
        );
      }
}