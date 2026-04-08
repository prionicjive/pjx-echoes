export const PhysicsConfig = {
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
} as const;
