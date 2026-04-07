import { Point, Segment } from "../utils/types";
import * as planck from 'planck';
import { RandomGenerator } from './RandomGenerator';

// MapUtils.ts
/**
 * Utilities for procedural map/maze generation using cellular automata and flood fill.
 * Produces a random but playable map for each game session.
 *
 * @module MapUtils
 */

/**
 * Represents the result of a map generation operation.
 * @typedef {Object} MapData
 * @property {number[][]} map - The generated map (2D array: 1 = wall, 0 = open)
 * @property {string[]} openSpaces - Array of open tile positions as "x,y" strings
 */
interface MapData {
    map: number[][], openSpaces: string[]
}

/**
 * MapUtils provides static methods for generating and rendering procedural maps.
 */
export class MapUtils {
    /**
     * Generates a map using cellular automata and ensures all open spaces are connected.
     *
     * @param {number} mapWidth - Width of the map in tiles.
     * @param {number} mapHeight - Height of the map in tiles.
     * @param {number} wallChance - Probability (0-1) that a tile starts as a wall.
     * @param {number} smoothingSteps - Number of smoothing iterations to run.
     * @param {RandomGenerator} rng - Optional random number generator
     * @returns {MapData} The generated map and list of open spaces.
     */
    static generateFromCellularAutomata(
        mapWidth: number, 
        mapHeight: number, 
        wallChance: number, 
        smoothingSteps: number,
        rng: RandomGenerator = new RandomGenerator()
    ): MapData {
        // Helper to generate, smooth, and connect the map
        function generateMap(): MapData {
            let map: number[][] = [];

            // Step 1: Random fill
            // Each tile is randomly set to wall or open, with borders always walls
            for (let y = 0; y < mapHeight; y++) {
                map[y] = [];
                for (let x = 0; x < mapWidth; x++) {
                    if (x === 0 || y === 0 || x === mapWidth - 1 || y === mapHeight - 1) {
                        map[y][x] = 1; // Border walls
                    } else {
                        map[y][x] = rng.chance(wallChance) ? 1 : 0; // 1 = Wall, 0 = Open
                    }
                }
            }

            // Step 2: Smooth the map
            // Cellular automata: tiles become walls/open based on neighbors
            for (let i = 0; i < smoothingSteps; i++) {
                map = smoothMap(map);
            }

            // Step 3: Ensure connectivity
            // Use flood fill to guarantee all open spaces are reachable
            return MapUtils.ensureConnectivity(map, mapWidth, mapHeight);
        }

        /**
         * Runs a cellular automata smoothing step over the map.
         * Walls are created/removed based on the number of neighboring walls.
         */
        function smoothMap(map: number[][]): number[][] {
            let newMap: number[][] = [];

            for (let y = 0; y < mapHeight; y++) {
                newMap[y] = [];
                for (let x = 0; x < mapWidth; x++) {
                    let walls = countWallsAround(map, { x, y });

                    /**
                        Cellular automata logic:
                        - If more than 4 neighboring walls, make this a wall
                        - Else if less than 4 neighboring walls, make this an open space
                        - Else if exactly 4 neighboring walls, keep this as is
                    **/
                    if (walls > 4) {
                        newMap[y][x] = 1; // Wall
                    } else if (walls < 4) {
                        newMap[y][x] = 0; // Open space
                    } else {
                        newMap[y][x] = map[y][x]; // Keep current
                    }
                }
            }
            return newMap;
        }

        /**
         * Counts the number of wall tiles around a given tile (8 neighbors).
         * Out-of-bounds is treated as a wall.
         */
        function countWallsAround(map: number[][], point: Point): number {
            let count = 0;
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    if (dx === 0 && dy === 0) {
                        continue;
                    }

                    let nx = point.x + dx;
                    let ny = point.y + dy;
                    
                    if (nx < 0 || ny < 0 || nx >= mapWidth || ny >= mapHeight) {
                        count++; // Out of bounds = treated as wall
                    } else if (map[ny][nx] === 1) {
                        count++;
                    }
                }
            }
            return count;
        }

        return generateMap();
    }

    /**
     * Generates a cave-like map using the Drunkard's Walk algorithm.
     * @param {number} mapWidth - Width of the map in tiles.
     * @param {number} mapHeight - Height of the map in tiles.
     * @param {number} percentOpen - Target % of open tiles (0.0–1.0), e.g. 0.35 for 35% open.
     * @param {number} [maxWalkers=1] - Number of simultaneous walkers.
     * @returns {MapData} The generated map and list of open spaces.
     */
    static generateFromDrunkardsWalk(
        mapWidth: number,
        mapHeight: number,
        percentOpen: number = 0.35,
        maxWalkers: number = 1,
        rng: RandomGenerator = new RandomGenerator()
    ): MapData {
        // Initialize all walls
        const map: number[][] = Array.from({ length: mapHeight }, () => Array(mapWidth).fill(1));
        const totalTiles = mapWidth * mapHeight;
        const targetOpen = Math.floor(totalTiles * percentOpen);

        // Start walkers in the center (or random positions for multiple walkers)
        let walkers: { x: number, y: number }[] = [];
        for (let i = 0; i < maxWalkers; i++) {
            walkers.push({
                x: Math.floor(mapWidth / 2),
                y: Math.floor(mapHeight / 2)
            });
        }

        let openCount = 0;
        while (openCount < targetOpen) {
            for (let w = 0; w < walkers.length; w++) {
                const walker = walkers[w];
                // Carve out the current cell if it's a wall
                if (map[walker.y][walker.x] === 1) {
                    map[walker.y][walker.x] = 0;
                    openCount++;
                }
                // Randomly move: N, S, E, W
                const dirs = [
                    [0, -1], [0, 1], [-1, 0], [1, 0]
                ];
                const [dx, dy] = dirs[rng.nextInt(dirs.length)];
                let nx = walker.x + dx;
                let ny = walker.y + dy;
                // Clamp to bounds (leave 1-tile border)
                nx = Math.max(1, Math.min(mapWidth - 2, nx));
                ny = Math.max(1, Math.min(mapHeight - 2, ny));
                walker.x = nx;
                walker.y = ny;
            }
        }

        // Step 3: Ensure connectivity
        // Use flood fill to guarantee all open spaces are reachable
        return MapUtils.ensureConnectivity(map, mapWidth, mapHeight);
    }

    /**
     * Generates a map with many small caves using Drunkard's Walk, then smooths it with cellular automata.
     * @param {number} mapWidth
     * @param {number} mapHeight
     * @param {number} percentOpen
     * @param {number} maxWalkers
     * @param {number} walkerLifetime - How many steps each walker takes before respawn.
     * @param {number} smoothingSteps - How many smoothing passes to run.
     * @param {RandomGenerator} rng - Optional random number generator
     * @returns {MapData}
     */
    static generateFromDrunkardsWalkWithSmoothing(
        mapWidth: number,
        mapHeight: number,
        percentOpen: number = 0.15,
        maxWalkers: number = 10,
        walkerLifetime: number = 60,
        smoothingSteps: number = 2,
        rng: RandomGenerator = new RandomGenerator()
    ): MapData {
        // 1. Drunkard's Walk with many small caves
        const map: number[][] = Array.from({ length: mapHeight }, () => Array(mapWidth).fill(1));
        const totalTiles = mapWidth * mapHeight;
        const targetOpen = Math.floor(totalTiles * percentOpen);

        let openCount = 0;
        let walkers: { x: number, y: number, steps: number }[] = [];
        for (let i = 0; i < maxWalkers; i++) {
            walkers.push({
                x: rng.nextInt(mapWidth - 2) + 1,
                y: rng.nextInt(mapHeight - 2) + 1,
                steps: 0
            });
        }

        while (openCount < targetOpen) {
            for (let w = 0; w < walkers.length; w++) {
                const walker = walkers[w];
                if (map[walker.y][walker.x] === 1) {
                    map[walker.y][walker.x] = 0;
                    openCount++;
                }
                walker.steps++;
                const dirs = [
                    [0, -1], [0, 1], [-1, 0], [1, 0]
                ];
                const [dx, dy] = dirs[rng.nextInt(dirs.length)];
                let nx = Math.max(1, Math.min(mapWidth - 2, walker.x + dx));
                let ny = Math.max(1, Math.min(mapHeight - 2, walker.y + dy));
                walker.x = nx;
                walker.y = ny;

                if (walker.steps >= walkerLifetime) {
                    // Respawn at a random wall tile
                    let found = false;
                    for (let tries = 0; tries < 100 && !found; tries++) {
                        const rx = rng.nextInt(mapWidth - 2) + 1;
                        const ry = rng.nextInt(mapHeight - 2) + 1;
                        if (map[ry][rx] === 1) {
                            walker.x = rx;
                            walker.y = ry;
                            walker.steps = 0;
                            found = true;
                        }
                    }
                    if (!found) walker.steps = 0;
                }
            }
        }

        // 2. Smoothing with cellular automata
        function countWallNeighbors(x: number, y: number) {
            let count = 0;
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    if (dx === 0 && dy === 0) continue;
                    const nx = x + dx, ny = y + dy;
                    if (ny < 0 || ny >= mapHeight || nx < 0 || nx >= mapWidth) {
                        count++; // Out-of-bounds is wall
                    } else if (map[ny][nx] === 1) {
                        count++;
                    }
                }
            }
            return count;
        }

        for (let step = 0; step < smoothingSteps; step++) {
            const newMap = map.map(arr => arr.slice());
            for (let y = 0; y < mapHeight; y++) {
                for (let x = 0; x < mapWidth; x++) {
                    const wallNeighbors = countWallNeighbors(x, y);
                    if (wallNeighbors >= 5) {
                        newMap[y][x] = 1;
                    } else {
                        newMap[y][x] = 0;
                    }
                }
            }
            for (let y = 0; y < mapHeight; y++) {
                for (let x = 0; x < mapWidth; x++) {
                    map[y][x] = newMap[y][x];
                }
            }
        }

        // 3. Connect caves with tunnels
        MapUtils.connectCavesWithTunnels(map, mapWidth, mapHeight);

        // 4. Ensure connectivity and find open spaces
        return MapUtils.ensureConnectivity(map, mapWidth, mapHeight);
    }

    /**
         * Ensures all open spaces are reachable (single connected component).
         * Uses a flood fill from the center (or nearest open tile) to find reachable spaces.
         * Any unreachable open space is converted to a wall.
         */
    static ensureConnectivity(map: number[][], mapWidth: number, mapHeight: number): MapData {
        const visited = new Set<string>();
        let startX: number = Math.floor(mapWidth / 2);
        let startY: number = Math.floor(mapHeight / 2);

        // If the center is a wall, find the first open space
        if (map[startY][startX] === 1) {
            outer: for (let y = 0; y < mapHeight; y++) {
                for (let x = 0; x < mapWidth; x++) {
                    if (map[y][x] === 0) {
                        startX = x;
                        startY = y;
                        break outer;
                    }
                }
            }
        }

        // Flood fill from the starting open space
        const queue: Point[] = [{x: startX, y: startY}];
        while (queue.length > 0) {
            const entry = queue.pop();

            if (entry) {
                const key = `${entry.x},${entry.y}`;

                if (visited.has(key)) continue;
                visited.add(key);

                // Check all four cardinal directions
                for (const [dx, dy] of [[1,0], [-1,0], [0,1], [0,-1]]) {
                    const nx = entry.x + dx;
                    const ny = entry.y + dy;
                    if (nx >= 0 && ny >= 0 && nx < mapWidth && ny < mapHeight) {
                        if (map[ny][nx] === 0) {
                            queue.push({x: nx, y: ny});
                        }
                    }
                }
            }
        }

        // Mark any unreachable open spaces as walls
        for (let y = 0; y < mapHeight; y++) {
            for (let x = 0; x < mapWidth; x++) {
                const key = `${x},${y}`;
                if (map[y][x] === 0 && !visited.has(key)) {
                    map[y][x] = 1; // Wall it off
                }
            }
        }

        return {
            map,
            openSpaces: Array.from(visited)
        };
    }

    /**
     * Connects all disconnected caves in the map with tunnels at least tunnelWidth wide.
     * Modifies the map in-place.
     */
    static connectCavesWithTunnels(
        map: number[][],
        mapWidth: number,
        mapHeight: number,
        tunnelWidth: number = 2
    ): void {
        // 1. Find all regions (each region is an array of {x, y})
        const regions: { x: number, y: number }[][] = [];
        const visited = Array.from({ length: mapHeight }, () => Array(mapWidth).fill(false));
        function floodFill(sx: number, sy: number, region: { x: number, y: number }[]) {
            const stack = [{ x: sx, y: sy }];
            while (stack.length) {
                const { x, y } = stack.pop()!;
                if (
                    x < 0 || x >= mapWidth || y < 0 || y >= mapHeight ||
                    visited[y][x] || map[y][x] !== 0
                ) continue;
                visited[y][x] = true;
                region.push({ x, y });
                stack.push({ x: x + 1, y }, { x: x - 1, y }, { x, y: y + 1 }, { x, y: y - 1 });
            }
        }
        for (let y = 0; y < mapHeight; y++) {
            for (let x = 0; x < mapWidth; x++) {
                if (!visited[y][x] && map[y][x] === 0) {
                    const region: { x: number, y: number }[] = [];
                    floodFill(x, y, region);
                    if (region.length > 0) regions.push(region);
                }
            }
        }
        if (regions.length <= 1) return; // Already connected

        // 2. Sort regions by size (largest first)
        regions.sort((a, b) => b.length - a.length);
        const mainRegion = regions[0];

        // 3. For each other region, connect to main region
        for (let i = 1; i < regions.length; i++) {
            // Find closest pair of points between this region and mainRegion
            let minDist = Infinity, bestA = null, bestB = null;
            for (const a of regions[i]) {
                for (const b of mainRegion) {
                    const dist = Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
                    if (dist < minDist) {
                        minDist = dist;
                        bestA = a;
                        bestB = b;
                    }
                }
            }
            // Dig a tunnel from bestA to bestB (Bresenham, but carve a square at each step)
            if (bestA && bestB) {
                let { x: x0, y: y0 } = bestA;
                const { x: x1, y: y1 } = bestB;
                while (x0 !== x1 || y0 !== y1) {
                    // Carve a tunnelWidth x tunnelWidth square
                    for (let dy = -Math.floor(tunnelWidth / 2); dy <= Math.floor(tunnelWidth / 2); dy++) {
                        for (let dx = -Math.floor(tunnelWidth / 2); dx <= Math.floor(tunnelWidth / 2); dx++) {
                            const nx = x0 + dx, ny = y0 + dy;
                            if (nx >= 0 && nx < mapWidth && ny >= 0 && ny < mapHeight) {
                                map[ny][nx] = 0;
                            }
                        }
                    }
                    // Step towards target
                    if (x0 !== x1) x0 += Math.sign(x1 - x0);
                    else if (y0 !== y1) y0 += Math.sign(y1 - y0);
                }
            }
            // After connecting, add this region's points to mainRegion for further connections
            mainRegion.push(...regions[i]);
        }
    }

    static createMergedHorizontalEdgesFromTilemap(tileMap: number[][], tileSize = 1) {
        const edgeSegments: Segment[] = [];

        const height = tileMap.length;
        const width = tileMap[0].length;

        for (let y = 0; y < height; y++) {
            let startX = null; // Tracks where a horizontal edge run begins

            for (let x = 0; x <= width; x++) {
                const wall = x < width && tileMap[y][x];          // current tile is a wall
                const isAboveOpen = y > 0 ? !tileMap[y - 1][x] : false; // tile above is open space

                // A horizontal edge exists between rows when one side is wall and the other is open.
                // We start a run when both are the same (wall==wall or open==open) meaning we just
                // crossed into an edge-boundary condition. We end when they differ again.
                //
                // Truth table for `wall == isAboveOpen` (start condition):
                //   wall=1, above=1 → both wall  → start (top face of a wall with wall above — interior edge)
                //   wall=0, above=0 → both open  → start (open tile with open above — no edge needed, but resets run)
                //   wall=1, above=0 → edge face   → end/emit
                //   wall=0, above=1 → edge face   → end/emit
                const shouldStart = (wall == isAboveOpen) && startX === null;
                const shouldEnd = (startX !== null && (wall != isAboveOpen)) || x === width;

                if (shouldStart) {
                    startX = x;
                }

                if (shouldEnd && startX !== null) {
                    edgeSegments.push({
                        a: new planck.Vec2(startX * tileSize, y * tileSize),
                        b: new planck.Vec2(x * tileSize, y * tileSize)
                    });
                    startX = null;
                }
            }
        }

        return edgeSegments;
    }

    static createMergedVerticalEdgesFromTilemap(tileMap: number[][], tileSize = 1) {
        const edgeSegments: Segment[] = [];

        const height = tileMap.length;
        const width = tileMap[0].length;

        for (let x = 0; x < width; x++) {
            let startY = null; // Tracks where a vertical edge run begins

            for (let y = 0; y <= height; y++) {
                const wall = y < height && tileMap[y][x];                   // current tile is a wall
                const isLeftOpen = x > 0 ? !tileMap[y]?.[x - 1] : false;  // tile to the left is open space

                // Same state-machine logic as horizontal, rotated 90°.
                // A vertical edge exists on the left face of a wall tile when the tile to its left is open.
                // `wall == isLeftOpen` means both sides match → boundary of a run; `wall != isLeftOpen` → emit.
                const shouldStart = (wall == isLeftOpen) && startY === null;
                const shouldEnd = (startY !== null && (wall != isLeftOpen)) || y === height;

                if (shouldStart) {
                    startY = y;
                }

                if (shouldEnd && startY !== null) {
                    edgeSegments.push({
                        a: new planck.Vec2(x * tileSize, startY * tileSize),
                        b: new planck.Vec2(x * tileSize, y * tileSize)
                    });
                    startY = null;
                }
            }
        }

        return edgeSegments;
    }

    static createMergedEdgesFromTilemap(tileMap: number[][], tileSize = 1) {
        const horizontalEdges = MapUtils.createMergedHorizontalEdgesFromTilemap(tileMap, tileSize);
        const verticalEdges = MapUtils.createMergedVerticalEdgesFromTilemap(tileMap, tileSize);
        return [...horizontalEdges, ...verticalEdges];
    }
}
