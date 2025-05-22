// Centralized game configuration
export const Config = {
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
            categoryEdge: 0x0002,
            categoryGate: 0x0004,
            categorySwitch: 0x0008,
            categoryExit: 0x0010,
            categoryAnti: 0x0020,
            categoryTorch: 0x0040,
            categorySentry: 0x0080
        },
        Player: {
            linearDamping: 0.35,    // How quickly the player slows down
        },
        Edge: {
            restitution: 0.15,
        }, 
        Gate: {
            restitution: 0.15,
        }
    },
    Player: {
        type: "PLAYER",
        color: 0x32ddff,  // Tint color for the player sprite
        radius: 0.48,     // Physics radius of the player (in meters)
        lightRadiusIncrement: 2,
        lightRadiusDecrement: 2,
        maxLightRadius: 20,
        minLightRadius: 2,
        lightChangeDuration: 0.75,
        particleTrailMaxAgeIncrement: 0.42,
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
    Gate: {
        type: "GATE",
        width: 1,
        height: 1,
        color: 0x0000FF,  // Tint color for walls
    },
    Switch: {
        type: "SWITCH",
        width: 1,
        height: 1,
        color: 0x0000FF,  // Tint color for walls
    },
    Torch: {
        type: "TORCH",
        width: 1,
        height: 1,
        color: 0xdfb503,  // Tint color for torches
    },
    Anti: {
        type: "ANTI",
        width: 1,
        height: 1,
        color: 0xff0888,  // Tint color for anti
    },
    Exit: {
        type: "EXIT",
        width: 1,
        height: 1,
        color: 0x2ddf03,  // Tint color for exits
    },
    Edges: {
        type: "EDGES",
        color: 0x039BDF,
        thickness: 3
    },
    Spritesheet: {
        path: '/assets/spritesheets/sprites.json',
        Textures: {
            player: 'player.png',
            sentry: 'sentry.png',
            wall: 'wall.png',
            gate: 'gate.png',
            switch: 'switch.png',
            torch: 'torch.png',
            exit: 'exit.png',
            anti: 'anti.png',
            block: 'block.png',
            Particles: {
                ring: 'particles/ring.png',
                ringSoft: 'particles/ring_soft.png',
                circle: 'particles/circle.png',
                circleSoft: 'particles/circle_soft.png'
            }
        }
    },
    Movement: {
        Gesture: {
            swipeReleaseWindowInMs: 120,
            minSwipeDistance: 100,
            swipeSpeedPixelsPerSecondThreshold: 750,
            swipeSpeedScaleExponent: 0.95,
            maxSpeedScaleExponent: 1.1,
            maxSpeedMetersPerSecond: 10.00,
        },
        towardsPoint: true,
        towardsPointMode: "FORCE", // "IMPULSE" or "FORCE"
        maxSpeed: 7.00,
        impulseFactor: 1.00,  // Only used when in impulse mode
        forceFactorPerSecond: 300.00, // Default as factor of constant force over time
        instantlyChangeDirection: true // Change the linear velocity to whatever the pointer direction is
    },
    Debug: {
        showDebugText: false,
        createVisibleEdges: true,
        createVisibleWalls: true,
        showLevelGeometry: true,
        showCollisionMarkers: false,
        showLights: true,
    }
};