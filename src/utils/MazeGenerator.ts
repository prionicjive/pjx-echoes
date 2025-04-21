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
            const y = getRandomInt(1, WORLD_DIMENSIONS.height -1);
            walls.push({ x, y, width: 1, height: 1, color: 0x0000ff });
        }

        return walls;
    }
}
