export interface ProGenLevelOptions {
    dimensions: {
        width: number;
        height: number;
    }; 
    minDistanceBetweenPlayerSpawnAndExit: number;
    minDistanceBetweenSwitchAndExit: number;
    minDistanceBetweenExits: number;
    radiusAroundExitForGates: number;
    numExits: number;
    torchChance: number;
    antiChance: number;
    sentryChance: number;
    mapGeneration: {
        type: MapGenerationType;
        options: CellularAutomataOptions | DrunkardsWalkWithSmoothingOptions;
    };
}

export type MapGenerationType = 'CellularAutomata' | 'DrunkardsWalkWithSmoothing';

export interface CellularAutomataOptions {
    wallChance: number;
    smoothingSteps: number;
}

export interface DrunkardsWalkWithSmoothingOptions {
    percentOpen: number;
    maxWalkers: number;
    walkerLifetime: number;
    smoothingSteps: number;
}

export const ProGenLevelsConfig: Record<string, ProGenLevelOptions> = {
    Standard: {
        dimensions: {
            width: 96,       // Width of the generated level (in grid units)
            height: 96
        },
        minDistanceBetweenPlayerSpawnAndExit: 48,
        minDistanceBetweenSwitchAndExit: 32,
        minDistanceBetweenExits: 36,
        radiusAroundExitForGates: 3,
        numExits: 3,
        torchChance: 0.00087,
        antiChance: 0.00065,
        sentryChance: 0.0052,
        mapGeneration: {   
            type: 'DrunkardsWalkWithSmoothing',
            options: {
                percentOpen: 0.55, // Try 0.10–0.18 for lots of small caves
                maxWalkers: 18, // Try 10-20 walkers
                walkerLifetime: 70, // Try 30-80
                smoothingSteps: 2 // Try 1-3
            }
        } 
    },
    Simple: {     
        dimensions: {
            width: 42,       // Width of the generated level (in grid units)
            height: 42
        },
        minDistanceBetweenPlayerSpawnAndExit: 21,
        minDistanceBetweenSwitchAndExit: 12,
        minDistanceBetweenExits: 10,
        radiusAroundExitForGates: 1,
        numExits: 2,
        torchChance: 0.00087,
        antiChance: 0.00065,
        sentryChance: 0.0095,
        mapGeneration: {   
            type: 'CellularAutomata',
            options: {
                wallChance: 0.45, // Chance that any given space is a wall
                smoothingSteps: 4 // How many times to smooth the map
            }
        } 
    }
};