// TODO Figure out how to centralize
const WORLD_DIMENSIONS = {
    width: 80,
    height: 45
};

// TODO FIgure out how to centralize, maybe static utils class
const getRandomInt = (min: number, max: number) => {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min;
  }

export class MazeGenerator {
    // TODO Figure out if some params should be passed in
    static generate() {
        // Return array of wall data: [{x, y, width, height}, ...]
        const walls = [];

        // TODO DO ALL generation in world (Meter space) and NOT pixels
        // TODO Assume 80x45 (16:9 ration) but it could be something different in the future
        // Simple outer border
        walls.push({ x: 0, y: 0, width: WORLD_DIMENSIONS.width, height: 1, color: 0x00ff00 }); // Top
        walls.push({ x: 0, y: WORLD_DIMENSIONS.height - 1, width: WORLD_DIMENSIONS.width, height: 1, color: 0x00ff00 }); // Bottom
        walls.push({ x: 0, y: 0, width: 1, height: WORLD_DIMENSIONS.height, color: 0x00ff00 }); // Left
        walls.push({ x: WORLD_DIMENSIONS.width - 1, y: 0, width: 1, height: WORLD_DIMENSIONS.height, color: 0x00ff00 }); // Right

        // Random inner walls (super simple for now)
        // TODO DO cellular automata + Flood fill for proper maze generation
        for (let i = 0; i < 30; i++) {
            // TODO Make configurable with maze dimensions and width dimensions
            const x = getRandomInt(1, WORLD_DIMENSIONS.width - 1);
            const y = getRandomInt(1, WORLD_DIMENSIONS.height - 1);
            walls.push({ x, y, width: 1, height: 1, color: 0x0000ff });
        }

        return walls;
    }

    // TODO Make this the default maze generation algorithm
    static generateCellularAutomata() {
        // Map constants
        const WIDTH = WORLD_DIMENSIONS.width;
        const HEIGHT = WORLD_DIMENSIONS.height;
        const WALL_CHANCE = 0.45; // 45% chance tile starts as wall
        const SMOOTHING_STEPS = 4;

        // Initialize the map
        function generateMap() {
            let map: number[][] = [];

            // Step 1: Random fill
            for (let y = 0; y < HEIGHT; y++) {
                map[y] = [];
                for (let x = 0; x < WIDTH; x++) {
                    if (x === 0 || y === 0 || x === WIDTH-1 || y === HEIGHT-1) {
                        map[y][x] = 1; // Border walls
                    } else {
                        map[y][x] = Math.random() < WALL_CHANCE ? 1 : 0; // 1 = Wall, 0 = Floor
                    }
                }
            }

            // Step 2: Smooth the map
            for (let i = 0; i < SMOOTHING_STEPS; i++) {
                map = smoothMap(map);
            }

            // Step 3: Ensure connectivity
            map = ensureConnectivity(map);

            return map;
        }

        // Smoothing: Cellular Automata step
        function smoothMap(map: number[][]) {
            let newMap: number[][] = [];

            for (let y = 0; y < HEIGHT; y++) {
                newMap[y] = [];
                for (let x = 0; x < WIDTH; x++) {
                    let walls = countWallsAround(map, x, y);

                    // Cellular automata logic:
                    // If more than 4 neighboring walls, make this a wall
                    // Else if less than 4 neighboring walls, make this a floor
                    // Else(If exactly 4 neighboring walls),  keep this as is
                    if (walls > 4) {
                        newMap[y][x] = 1; // Wall
                    } else if (walls < 4) {
                        newMap[y][x] = 0; // Floor
                    } else {
                        newMap[y][x] = map[y][x]; // Keep current
                    }
                }
            }
            return newMap;
        }

        // Helper: Count walls around a tile
        function countWallsAround(map: number[][], x: number, y: number) {
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
        function ensureConnectivity(map: number[][]) {
            const visited = new Set();
            let startX: number = Math.floor(WIDTH / 2);
            let startY: number = Math.floor(HEIGHT / 2);

            if (map[startY][startX] === 1) {
                // If starting point is a wall, find nearest floor
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

            // Mark unreachable floors back into walls
            for (let y = 0; y < HEIGHT; y++) {
                for (let x = 0; x < WIDTH; x++) {
                    const key = `${x},${y}`;
                    if (map[y][x] === 0 && !visited.has(key)) {
                        map[y][x] = 1; // Wall it off
                    }
                }
            }

            return map;
        }

        // Simple text renderer
        function renderMap(map: number[][]) {
            console.clear();
            console.log(map.map(row => row.map(cell => cell ? "█" : " ").join("")).join("\n"));
        }

        // Usage:
        const map = generateMap();
        renderMap(map);
    }
}
