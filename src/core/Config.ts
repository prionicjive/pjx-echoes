// Centralized game configuration
export const Config = {
    LevelDimensions: {
        width: 128,       // Width of the generated level (in grid units)
        height: 128
    },
    PixelsPerMeter: 16, // How many pixels represent one physics meter
    Camera: {
        lerpFactor: 1.5, // Smoothing factor for camera movement (0 = slow, 1 = instant)
        DeadZone: {
            width: 64,   // Camera doesn't move unless player leaves this zone
            height: 64
        }
    },
    Physics: {
        Collision: {
            categoryPlayer: 0x0001, // Bitmasks for Planck.js collision filtering
            categoryWall: 0x0002,
            categoryEdge: 0x0004,
            categoryFinish: 0x0008,
            categoryFuel: 0x0010
        },
        Player: {
            linearDamping: 0.35,    // How quickly the player slows down
        },
        Wall: {
            restitution: 0.2,
        }
    },
    MapGeneration: {
        wallChance: 0.45, // Chance that any given space is a wall
        smoothingSteps: 4 // How many times to smooth the map
    },
    Particle: {
        width: 1, // Meters
        height: 1 // Meters
    },
    Player: {
        type: "PLAYER",
        color: 0x32ddff,  // Tint color for the player sprite
        radius: 0.48,     // Physics radius of the player (in meters)
    },
    Wall: {
        type: "WALL",
        color: 0x444444,  // Tint color for walls
    },
    Torch: {
        type: "TORCH",
        color: 0xdfb503,  // Tint color for torches
    },
    Fuel: {
        type: "FUEL",
        color: 0xff0888,  // Tint color for fuel
    },
    Finish: {
        type: "FINISH",
        color: 0x2ddf03,  // Tint color for finish tiles
    },
    Edges: {
        type: "EDGES",
        color: 0x444444,
        thickness: 2
    },
    Textures: {
        player: '/assets/textures/player.png', // Paths to texture assets
        wall: '/assets/textures/wall.png',
        torch: '/assets/textures/torch.png',
        finish: '/assets/textures/finish.png',
        fuel: '/assets/textures/fuel.png',
        Particles: {
            ring: '/assets/textures/particles/ring.png',
            ringSoft: '/assets/textures/particles/ring_soft.png',
            circle: '/assets/textures/particles/circle.png',
            circleSoft: '/assets/textures/particles/circle_soft.png'
        }
    },
    // TODO Consolidate light definitions?
    PlayerLight: {
        numRays: 360,
        baseRadius: 10,
        radiusVariance: 5,
        baseAlpha: 0.5,
        alphaVariance: 0.4,
        startColor: 0x55aaff,
        endColor: 0x77edff,
        flickerAlphaDuration: 0.5,
        flickerAlphaDurationVariance: 2.5,
        flickerRadiusDuration: 1.5,
        flickerRadiusDurationVariance: 0.5,
        oscillateColorDuration: 1.5,
        oscillateColorDurationVariance: 2,
        oscillateColorDelay: 0,
        oscillateColorDelayVariance: 2,
    },
    FinishLight: {
        numRays: 360,
        baseRadius: 10,
        radiusVariance: 5,
        baseAlpha: 0.5,
        alphaVariance: 0.4,
        startColor: 0x2ddf03,
        endColor: 0x27ffc3,
        flickerAlphaDuration: 0.5,
        flickerAlphaDurationVariance: 2.5,
        oscillateColorDuration: 1.5,
        oscillateColorDurationVariance: 2,
        oscillateColorDelay: 0,
        oscillateColorDelayVariance: 2,
    },
    TorchLight: {
        numRays: 360,
        baseRadius: 10,
        radiusVariance: 2.5,
        baseAlpha: 0.5,
        alphaVariance: 0.4,
        startColor: 0xdfb503,
        endColor: 0xab3347,
        flickerAlphaDuration: 0.5,
        flickerAlphaDurationVariance: 2.5,
        oscillateColorDuration: 1.5,
        oscillateColorDurationVariance: 2,
        oscillateColorDelay: 0,
        oscillateColorDelayVariance: 2,
    },
    FuelLight: {
        numRays: 360,
        baseRadius: 5,
        radiusVariance: 0,
        baseAlpha: 0.9,
        alphaVariance: 0.1,
        startColor: 0xff0022,
        endColor: 0xff2244,
        flickerAlphaDuration: 0.5,
        flickerAlphaDurationVariance: 2.5,
        oscillateColorDuration: 0.5,
        oscillateColorDurationVariance: 3,
        oscillateColorDelay: 0,
        oscillateColorDelayVariance: 1,
    },
    FinishTilesDensity: 0.0001,
    TorchesDensity: 0.0007,
    FuelTileDensity: 0.00065,
    Movement: {
        towardsPoint: true,
        impulseFactor: 1.00,  // Only used when in impulse mode
        forceFactorPerSecond: 700.00 // Default as factor of constant force over time
    },
    Debug: {
        drawEdges: true,
        drawWalls: false
    }
};