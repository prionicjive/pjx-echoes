// Centralized game configuration
export const Config = {
    LevelDimensions: {
        width: 96,       // Width of the generated level (in grid units)
        height: 96
    },
    MapGeneration: {
        CellularAutomata: {
            wallChance: 0.45, // Chance that any given space is a wall
            smoothingSteps: 4 // How many times to smooth the map
        },
        DrunkardsWalkWithSmoothing: {
            percentOpen: 0.55, // Try 0.10–0.18 for lots of small caves
            maxWalkers: 18, // Try 10-20 walkers
            walkerLifetime: 70, // Try 30-80
            smoothingSteps: 2 // Try 1-3
        }
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
            categoryFuel: 0x0010,
            categoryTorch: 0x0020,
            categorySentry: 0x0040
        },
        Player: {
            linearDamping: 0.35,    // How quickly the player slows down
        },
        Wall: {
            restitution: 0.15,
        }
    },
    Player: {
        type: "PLAYER",
        color: 0x32ddff,  // Tint color for the player sprite
        radius: 0.48,     // Physics radius of the player (in meters)
        lightRadiusIncrement: 1,
        lightRadiusDecrement: 1,
        maxLightRadius: 20,
        minLightRadius: 2,
        lightChangeDuration: 0.75,
        particleTrailMaxAgeIncrement: 0.25,
        particleTrailMaxAgeCap: 7.5,
    },
    Sentry: {
        type: "SENTRY",
        color: 0xBB32FF,  // Tint color for the sentry sprite
        radius: 0.25,     // Physics radius of the sentry (in meters)
        maxSpeed: 5.00,
    },
    Wall: {
        type: "WALL",
        width: 1,
        height: 1,
        color: 0x111111,  // Tint color for walls
    },
    Torch: {
        type: "TORCH",
        width: 1,
        height: 1,
        color: 0xdfb503,  // Tint color for torches
    },
    Fuel: {
        type: "FUEL",
        width: 1,
        height: 1,
        color: 0xff0888,  // Tint color for fuel
    },
    Finish: {
        type: "FINISH",
        width: 1,
        height: 1,
        color: 0x2ddf03,  // Tint color for finish tiles
    },
    Edges: {
        type: "EDGES",
        color: 0x039BDF,
        thickness: 3
    },
    Textures: {
        player: '/assets/textures/player.png', // Paths to texture assets
        sentry: '/assets/textures/sentry.png',
        wall: '/assets/textures/wall.png',
        torch: '/assets/textures/torch.png',
        finish: '/assets/textures/finish.png',
        fuel: '/assets/textures/fuel.png',
        block: '/assets/textures/block.png',
        Particles: {
            ring: '/assets/textures/particles/ring.png',
            ringSoft: '/assets/textures/particles/ring_soft.png',
            circle: '/assets/textures/particles/circle.png',
            circleSoft: '/assets/textures/particles/circle_soft.png'
        }
    },
    FinishChance: 0.0001,
    TorchChance: 0.00087,
    FuelChance: 0.00065,
    SentryChance: 0.0025,
    Movement: {
        Gesture: {
            swipeSpeedScaleExponent: 0.95,
            maxSpeedScaleExponent: 1.1,
            maxSpeed: 10.00,
        },
        towardsPoint: true,
        towardsPointMode: "FORCE", // "IMPULSE" or "FORCE"
        maxSpeed: 7.00,
        impulseFactor: 1.00,  // Only used when in impulse mode
        forceFactorPerSecond: 300.00, // Default as factor of constant force over time
        instantlyChangeDirection: true // Change the linear velocity to whatever the pointer direction is
    },
    Debug: {
        drawEdges: true,
        drawWalls: true,
        drawLights: true,
    }
};