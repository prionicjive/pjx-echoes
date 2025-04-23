type MapData = {
    map: number[][], openSpaces: string[]
}

export class MapGenerator {
    // Generate map from cellular automata
    static generateFromCellularAutomata(width: number, height: number): MapData {
        // Map constants
        // TODO Better way to handle this
        const WIDTH = width;
        const HEIGHT = height;
        const WALL_CHANCE = 0.45; // Chance that any given space is a tile
        const SMOOTHING_STEPS = 4;

        // Initialize the map
        function generateMap(): MapData {
            let map: number[][] = [];

            // Step 1: Random fill
            for (let y = 0; y < HEIGHT; y++) {
                map[y] = [];
                for (let x = 0; x < WIDTH; x++) {
                    if (x === 0 || y === 0 || x === WIDTH-1 || y === HEIGHT-1) {
                        map[y][x] = 1; // Border walls
                    } else {
                        map[y][x] = Math.random() < WALL_CHANCE ? 1 : 0; // 1 = Wall, 0 = Open
                    }
                }
            }

            // Step 2: Smooth the map
            for (let i = 0; i < SMOOTHING_STEPS; i++) {
                map = smoothMap(map);
            }

            // Step 3: Ensure connectivity
            const correctedMapData = ensureConnectivity(map);

            return correctedMapData;
        }

        // Smoothing: Cellular Automata step
        function smoothMap(map: number[][]): number[][] {
            let newMap: number[][] = [];

            for (let y = 0; y < HEIGHT; y++) {
                newMap[y] = [];
                for (let x = 0; x < WIDTH; x++) {
                    let walls = countWallsAround(map, x, y);

                    // Cellular automata logic:
                    // If more than 4 neighboring walls, make this a wall
                    // Else if less than 4 neighboring walls, make this a open space
                    // Else(If exactly 4 neighboring walls),  keep this as is
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

        // Helper: Count walls around a tile
        function countWallsAround(map: number[][], x: number, y: number): number {
            let count = 0;
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    if (dx === 0 && dy === 0) continue;
                    let nx = x + dx;
                    let ny = y + dy;
                    if (nx < 0 || ny < 0 || nx >= WIDTH || ny >= HEIGHT) {
                        count++; // Out of bounds = treated as wall
                    } else if (map[ny][nx] === 1) {
                        count++;
                    }
                }
            }
            return count;
        }

        // Flood fill to ensure connectivity
        function ensureConnectivity(map: number[][]): MapData {
            const visited = new Set<string>();
            let startX: number = Math.floor(WIDTH / 2);
            let startY: number = Math.floor(HEIGHT / 2);

            if (map[startY][startX] === 1) {
                // If starting point is a wall, find nearest open space
                for (let y = 0; y < HEIGHT; y++) {
                    for (let x = 0; x < WIDTH; x++) {
                        if (map[y][x] === 0) {
                            startX = x;
                            startY = y;
                            break;
                        }
                    }
                }
            }

            const queue: {x: number, y: number}[] = [{x: startX, y: startY}];
            while (queue.length > 0) {
                const entry = queue.pop();

                if (entry) {
                    const key = `${entry.x},${entry.y}`;

                    if (visited.has(key)) continue;
                    visited.add(key);

                    for (const [dx, dy] of [[1,0], [-1,0], [0,1], [0,-1]]) {
                        const nx = entry.x + dx;
                        const ny = entry.y + dy;
                        if (nx >= 0 && ny >= 0 && nx < WIDTH && ny < HEIGHT) {
                            if (map[ny][nx] === 0) {
                                queue.push({x: nx, y: ny});
                            }
                        }
                    }
                }
            }

            // Mark unreachable open spaces back into walls
            for (let y = 0; y < HEIGHT; y++) {
                for (let x = 0; x < WIDTH; x++) {
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

    // Simple text rendering of a map
    static renderMap(map: number[][]): void {
        console.clear();
        console.log(map.map(row => row.map(cell => cell ? "█" : " ").join("")).join("\n"));
    }
}
