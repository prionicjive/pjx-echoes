import { Segment } from "./types";
  
export class CollisionUtils {
    static createMergedHorizontalEdgesFromTilemap(tileMap: number[][], tileSize = 1) {
        const edgeSegments: Segment[] = [];
      
        const height = tileMap.length;
        const width = tileMap[0].length;
      
        for (let y = 0; y < height; y++) {
          let startX = null; // Tracks where an edge should begin
      
          for (let x = 0; x <= width; x++) {
            const wall = x < width && tileMap[y][x]; // Is the current tile a wall?
            const isAboveOpen = y > 0 ? !tileMap[y - 1][x] : true; // Is the tile above open? (We say it's open above the very first row)
      
            // Only start if we are on a wall, the above is open AND we haven't already started an edge
            const shouldStart = wall && isAboveOpen && startX === null; 
            // End only if we have already started an edge and we're either not a wall, it's not open above or we are at the end of the row
            const shouldEnd = (startX !== null && (!wall || !isAboveOpen)) || x === width; 
      
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
            const isLeftOpen = x > 0 ? !tileMap[y]?.[x - 1] : true; // Is the tile to the left open? (We say it's open to the left of the very first column)
      
            // Only start if we are on a wall, the left is open AND we haven't already started an edge
            const shouldStart = wall && isLeftOpen && startY === null; 
            // End only if we have already started an edge and we're either not a wall, it's not open to the left or we are at the end of the column
            const shouldEnd = (startY !== null && (!wall || !isLeftOpen)) || y === height;
      
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