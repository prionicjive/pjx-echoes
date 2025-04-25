import { Point, Segment } from "../utils/types";


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
     * @returns {MapData} The generated map and list of open spaces.
     */
    static generateFromCellularAutomata(mapWidth: number, mapHeight: number, wallChance: number, smoothingSteps: number): MapData {
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
                        map[y][x] = Math.random() < wallChance ? 1 : 0; // 1 = Wall, 0 = Open
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
            return ensureConnectivity(map);
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

        /**
         * Ensures all open spaces are reachable (single connected component).
         * Uses a flood fill from the center (or nearest open tile) to find reachable spaces.
         * Any unreachable open space is converted to a wall.
         */
        function ensureConnectivity(map: number[][]): MapData {
            const visited = new Set<string>();
            let startX: number = Math.floor(mapWidth / 2);
            let startY: number = Math.floor(mapHeight / 2);

            // If the center is a wall, find the nearest open space
            if (map[startY][startX] === 1) {
                for (let y = 0; y < mapHeight; y++) {
                    for (let x = 0; x < mapWidth; x++) {
                        if (map[y][x] === 0) {
                            startX = x;
                            startY = y;
                            break;
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

        return generateMap();
    }

    /**
     * Renders a map to the console using ASCII art.
     * Walls are shown as blocks, open spaces as spaces.
     * @param {number[][]} map - The map to render.
     */
    static renderMap(map: number[][]): void {
        console.clear();
        console.log(map.map(row => row.map(cell => cell ? "█" : " ").join("")).join("\n"));
    }

    static createMergedHorizontalEdgesFromTilemap(tileMap: number[][], tileSize = 1) {
        const edgeSegments: Segment[] = [];
      
        const height = tileMap.length;
        const width = tileMap[0].length;
      
        for (let y = 0; y < height; y++) {
          let startX = null; // Tracks where an edge should begin
      
          for (let x = 0; x <= width; x++) {
            const wall = x < width && tileMap[y][x]; // Is the current tile a wall?
            const isAboveOpen = y > 0 ? !tileMap[y - 1][x] : false; // Is the tile above open?
      
            // Only start if we are (on a wall AND the above is open OR we are not on a wall and the above is not open) AND we haven't already started an edge
            const shouldStart = (wall == isAboveOpen) && startX === null; 
            // End only if we have already started an edge and (we're wall and it's not open above OR we're not wall and it is open above) or we are at the end of the row
            const shouldEnd = (startX !== null && (wall != isAboveOpen)) || x === width; 
      
            // Mark where the edge starts
            if (shouldStart) {
              startX = x;
            }
      
            if (shouldEnd && startX !== null) {
              // Construct the full edge
              const ax = startX * tileSize;
              const ay = y * tileSize;
              const bx = x * tileSize;
              const by = y * tileSize;
      
              // ✨ Save the edge for later (Ex. raycasting)
              edgeSegments.push({ a: {x: ax, y: ay}, b: {x: bx, y: by} });
      
              // Reset the start position
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
          let startY = null; // Tracks where an edge should begin
      
          for (let y = 0; y <= height; y++) {
            const wall = y < height && tileMap[y][x]; // Is the current tile a wall?
            const isLeftOpen = x > 0 ? !tileMap[y]?.[x - 1] : false; // Is the tile to the left open? (We say it's open to the left of the very first column)
      
            // Only start if we are on a wall, the left is open AND we haven't already started an edge
            const shouldStart = (wall == isLeftOpen) && startY === null; 
            // End only if we have already started an edge and (we're a wall and it's not open to the left OR we're not a wall and it's open to the left) or we are at the end of the column
            const shouldEnd = (startY !== null && (wall != isLeftOpen)) || y === height;
      
            // Mark where the edge starts
            if (shouldStart) {
              startY = y;
            }
      
            if (shouldEnd && startY !== null) {
              // Construct the full edge
              const ax = x * tileSize;
              const ay = startY * tileSize;
              const bx = x * tileSize;
              const by = y * tileSize;
      
              // ✨ Save the edge for later (Ex. raycasting)
              edgeSegments.push({ a: {x: ax, y: ay}, b: {x: bx, y: by} });
      
              // Reset the start position
              startY = null;
            }
          }
        }
      
        return edgeSegments;
    }
}
