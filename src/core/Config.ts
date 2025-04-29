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
            typePlayer: "PLAYER",
            typeWall: "WALL",
            typeFinish: "FINISH",
            typeFuel: "FUEL",
            categoryPlayer: 0x0001, // Bitmasks for Planck.js collision filtering
            categoryWall: 0x0002,
            categoryFinish: 0x0004,
            categoryFuel: 0x0008
        },
        Player: {
            linearDamping: 0.35,    // How quickly the player slows down
            impulseFactor: 1,       // How strong the impulse is on click
            restitution: 0.95,      // Bounciness
        }
    },
    MapGeneration: {
        wallChance: 0.45, // Chance that any given space is a wall
        smoothingSteps: 4 // How many times to smooth the map
    },
    Player: {
        color: 0x32ddff,  // Tint color for the player sprite
        radius: 0.48,     // Physics radius of the player (in meters)
    },
    Wall: {
        color: 0x444444,  // Tint color for walls
        size: 1,          // Wall size (in meters)
    },
    Torch: {
        color: 0xdfb503,  // Tint color for torches
        size: 1           // Torch size (in meters)
    },
    Fuel: {
        color: 0xff0888,  // Tint color for fuel
        size: 1           // Fuel tile size (in meters)
    },
    Finish: {
        color: 0x2ddf03,  // Tint color for finish tiles
        size: 1           // Finish tile size (in meters)
    },
    Boundaries: {
        color: 0x444444,
        thickness: 2
    },
    Textures: {
        player: '/assets/textures/player.png', // Paths to texture assets
        wall: '/assets/textures/wall.png',
        torch: '/assets/textures/torch.png',
        finish: '/assets/textures/finish.png',
        fuel: '/assets/textures/fuel.png'
    },
    // TODO Consolidate light definitions?
    PlayerLight: {
        numRays: 360,
        baseRadius: 10,
        radiusVariance: 5,
        baseAlpha: 0.5,
        alphaVariance: 0.4,
        startColor: 0x55aaff,
        endColor: 0x77edff
    },
    FinishLight: {
        numRays: 360,
        baseRadius: 10,
        radiusVariance: 5,
        baseAlpha: 0.5,
        alphaVariance: 0.4,
        startColor: 0x2ddf03,
        endColor: 0x27ffc3
    },
    TorchLight: {
        numRays: 360,
        baseRadius: 10,
        radiusVariance: 2.5,
        baseAlpha: 0.5,
        alphaVariance: 0.4,
        startColor: 0xdfb503,
        endColor: 0xab3347
    },
    FuelLight: {
        numRays: 360,
        baseRadius: 5,
        radiusVariance: 0,
        baseAlpha: 0.9,
        alphaVariance: 0.1,
        startColor: 0xff0022,
        endColor: 0xff2244
    },
    FinishTilesDensity: 0.0001,
    TorchesDensity: 0.0007,
    FuelTileDensity: 0.00065,
    Debug: {
        drawEdges: true,
        drawWalls: false
    }
};