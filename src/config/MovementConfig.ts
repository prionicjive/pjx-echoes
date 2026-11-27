export const MovementConfig = {
    Gesture: {
        swipeReleaseWindowInMs: 120,
        minSwipeDistance: 100,
        swipeSpeedPixelsPerSecondThreshold: 750,
        swipeSpeedScaleExponent: 0.95,
        maxSpeedScaleExponent: 1.1,
        maxSpeedMetersPerSecond: 10.00,
        doubleTapMaxIntervalMs: 300,
        tapMaxDistancePx: 15, // Max start→end travel for a touch to count as a tap
    },
    Gamepad: {
        stickDeadzone: 0.15,
        // Releasing a thumbstick lets it spring through center and briefly read the opposite direction.
        // Player re-aims velocity at any non-zero stick direction, so that blip would reverse the ball.
        SnapBack: {
            enabled: true,
            windowMs: 110,               // How long after a rapid release opposite readings are suppressed
            releaseDropPerSecond: 8,     // Raw magnitude drop rate (units/sec) that counts as a release
            maxMagnitude: 0.65,          // Opposite readings at/above this are an intentional throw (never suppressed)
            minReversalAngleDeg: 100,    // Angle from the last stick direction that counts as "opposite"
        },
    },
    towardsPoint: true,
    towardsPointMode: "FORCE" as const, // "IMPULSE" or "FORCE"
    maxSpeed: 7.00,
    impulseFactor: 1.00,  // Only used when in impulse mode
    pointerReleaseStopDistance: 0.15, // Meters: releasing the pointer this close to the player stops them
    forceFactorPerSecond: 300.00, // Default as factor of constant force over time
    instantlyChangeDirection: true // Change the linear velocity to whatever the pointer direction is
};
