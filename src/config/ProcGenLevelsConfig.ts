import { ProcGenLevelType } from "../level/types";

export interface ProcGenLevelOptions {
    Dimensions: {
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
    seed?: string | number; // Optional seed for deterministic generation
    MapGeneration: {
        type: MapGenerationType;
        Options: CellularAutomataOptions | DrunkardsWalkWithSmoothingOptions;
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

export const ProcGenLevelsConfig: Record<ProcGenLevelType, ProcGenLevelOptions> = {
    Standard: {
        //seed: "n5n034mzvk96m77bz8bst3",
        Dimensions: {
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
        MapGeneration: {   
            type: 'DrunkardsWalkWithSmoothing',
            Options: {
                percentOpen: 0.55, // Try 0.10–0.18 for lots of small caves
                maxWalkers: 18, // Try 10-20 walkers
                walkerLifetime: 70, // Try 30-80
                smoothingSteps: 2 // Try 1-3
            }
        } 
    },
    Simple: { 
        // seed: "z3x6jz0mxy9agln3q7s0nl",    
        Dimensions: {
            width: 42,       // Width of the generated level (in grid units)
            height: 42
        },
        minDistanceBetweenPlayerSpawnAndExit: 21,
        minDistanceBetweenSwitchAndExit: 12,
        minDistanceBetweenExits: 10,
        radiusAroundExitForGates: 15,
        numExits: 2,
        torchChance: 0.00087,
        antiChance: 0.00065,
        sentryChance: 0.0095,
        MapGeneration: {   
            type: 'CellularAutomata',
            Options: {
                wallChance: 0.45, // Chance that any given space is a wall
                smoothingSteps: 4 // How many times to smooth the map
            }
        } 
    }
};