export class MazeGenerator {
    // TODO Figure out if some params should be passed in
    static generate() {
        // Return array of wall data: [{x, y, width, height}, ...]
        const walls = [];

        // Simple outer border
        // TODO Make this more configurable beyond 1280x720
        walls.push({ x: 640, y: 5, width: 1280, height: 10 }); // Top
        walls.push({ x: 640, y: 715, width: 1280, height: 10 }); // Bottom
        walls.push({ x: 5, y: 360, width: 10, height: 720 }); // Left
        walls.push({ x: 1275, y: 360, width: 10, height: 720 }); // Right

        // Random inner walls (super simple for now)
        for (let i = 0; i < 30; i++) {
            // TODO Make configurable with maze dimensions and width dimensions
            const x = Math.random() * 1180 + 50;
            const y = Math.random() * 620 + 50;
            const width = Math.random() > 0.5 ? 100 : 10;
            const height = Math.random() > 0.5 ? 10 : 100;
            walls.push({ x, y, width, height });
        }

        return walls;
    }
}
