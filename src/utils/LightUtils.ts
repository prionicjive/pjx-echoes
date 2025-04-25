import { Segment, Point } from "../utils/types";

// LightUtils.ts
/**
 * A collection of light utility functions for pjx-echoes.
 * Used calculating edge of tiles as well as raycasting.
 *
 * @module LightUtils
 */

/**
 * LightUtils provides static helper functions for light operations commonly needed in this game.
 */
export class LightUtils {
    
    /**
     * Gets wall edges for all map tiles facing open space
     * @param {number[][]} map - The map to check.
     * @returns {Segment[][][]} - The lookup table of edges for each tile in the map.
     */
    static getValidEdgesLookupForMap(map: number[][], tileSize: number = 1): Segment[][][] {
        const validEdgeLookupTable: Segment[][][] = [];

        const mapWidth = map[0].length;
        const mapHeight = map.length;

        for (let y = 0; y < mapHeight; y++) {
            validEdgeLookupTable[y] = [];
            for (let x = 0; x < mapWidth; x++) {
                // Find valid edges for each tile and add them to the master list of edges
                validEdgeLookupTable[y][x] = this.getValidEdgesForTile(map, { x, y }, tileSize);
            }
        }

        return validEdgeLookupTable;
    }

    /**
     * Gets edges facing open space in a given search area.
     * @param {number[][]} map - The map to check.
     * @returns {Segment[]} - The array of edges.
     */
    static lookupValidEdgesForArea(validEdgeLookupTable: Segment[][][], origin: Point, searchRadius: number, tileSize: number = 1): Segment[] {
        const edges: Segment[] = [];

        // Get an AABB in tile coords
        const minTileX = Math.max(0, Math.floor((origin.x - searchRadius) / tileSize));
        const maxTileX = Math.min(validEdgeLookupTable[0].length - 1, Math.ceil((origin.x + searchRadius) / tileSize));
        const minTileY = Math.max(0, Math.floor((origin.y - searchRadius) / tileSize));
        const maxTileY = Math.min(validEdgeLookupTable.length - 1, Math.ceil((origin.y + searchRadius) / tileSize));

        for (let y = minTileY; y <= maxTileY; y++) {
            for (let x = minTileX; x <= maxTileX; x++) {
                // Find valid edges for each tile and add them to the master list of edges
                const validEdges: Segment[] = validEdgeLookupTable[y][x];
                validEdges.forEach(edge => edges.push(edge));
            }
        }

        return edges;
    }

    static getValidEdgesForTile(map: number[][], position: Point, tileSize: number = 1): Segment[] {
        const edges: Segment[] = [];
        const mapWidth = map[0].length;
        const mapHeight = map.length;

        if (map[position.y][position.x] === 1) { // 1 = wall
            const tileX = position.x * tileSize;
            const tileY = position.y * tileSize;

            // Check neighbors in clock-wise fashionand add only outer edges
            if (position.y > 0 && map[position.y - 1][position.x] === 0) {
                // Top edge
                edges.push({ a: { x: tileX, y: tileY }, b: { x: tileX + tileSize, y: tileY } });
            }

            if (position.x < mapWidth - 1 && map[position.y][position.x + 1] === 0) {
                // Right edge
                edges.push({ a: { x: tileX + tileSize, y: tileY }, b: { x: tileX + tileSize, y: tileY + tileSize } });
            }

            if (position.y < mapHeight - 1 && map[position.y + 1][position.x] === 0) {
                // Bottom edge
                edges.push({ a: { x: tileX + tileSize, y: tileY + tileSize }, b: { x: tileX, y: tileY + tileSize } });
            }

            if (position.x > 0 && map[position.y][position.x - 1] === 0) {
                // Left edge
                edges.push({ a: { x: tileX, y: tileY + tileSize }, b: { x: tileX, y: tileY } });
            }
        }

        return edges;
    }

    /**
     * Generates an array of ray objects radiating outward from a given point.
     * Each ray is defined by a starting position and a direction vector.
     *
     * @param {Point} point - The origin point from which to shoot rays.
     * @param {number} [numRays=360] - The number of rays to generate (spread evenly in a circle).
     * @returns {Array<{ start: Point, direction: Point }>} 
     *   An array of rays, each with a start position and normalized direction vector.
     */
    static shootRaysFromPoint(point: Point, numRays: number = 360) {
        const rays = [];
    
        for (let i = 0; i < numRays; i++) {
            const angle = (i / numRays) * Math.PI * 2;
            const dx = Math.cos(angle);
            const dy = Math.sin(angle);
    
            rays.push({
                start: { x: point.x, y: point.y },
                direction: { x: dx, y: dy }
            });
        }
    
        return rays;
    }

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

        // Calculate magnitudes for normalization and parallel check
        const r_mag = Math.sqrt(r_dx * r_dx + r_dy * r_dy);
        const s_mag = Math.sqrt(s_dx * s_dx + s_dy * s_dy);

        // Check if the ray and segment are parallel (no intersection)
        if (r_dx / r_mag === s_dx / s_mag && r_dy / r_mag === s_dy / s_mag) {
            return null;
        }

        // Solve for intersection using parametric equations
        // t = distance along the ray, u = position along the segment (0 to 1)
        const t = ((s_px - r_px) * s_dy - (s_py - r_py) * s_dx) / (r_dx * s_dy - r_dy * s_dx);
        const u = ((s_px - r_px) * r_dy - (s_py - r_py) * r_dx) / (r_dx * s_dy - r_dy * s_dx);

        // Intersection occurs if t > 0 (in front of the ray) and 0 <= u <= 1 (on the segment)
        if (t > 0 && u >= 0 && u <= 1) {
            if (t * r_mag <= maxDistance) {
            return {
                point: { 
                    x: r_px + r_dx * t, 
                    y: r_py + r_dy * t 
                },
                distance: t
            };
            }
        }

        // No intersection found
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
            const intersection = LightUtils.getRaySegmentIntersection(ray, segment, maxDistance);
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
        const rays = LightUtils.shootRaysFromPoint(point, numRays);
        const points: { point: Point, angle: number }[] = [];
    
        // For each ray, find the closest intersection with any segment
        for (const ray of rays) {
            const hit = LightUtils.findClosestIntersection(ray, segments, lightRadius);
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