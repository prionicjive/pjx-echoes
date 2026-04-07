export const MovementConfig = {
    Gesture: {
        swipeReleaseWindowInMs: 120,
        minSwipeDistance: 100,
        swipeSpeedPixelsPerSecondThreshold: 750,
        swipeSpeedScaleExponent: 0.95,
        maxSpeedScaleExponent: 1.1,
        maxSpeedMetersPerSecond: 10.00,
    },
    towardsPoint: true,
    towardsPointMode: "FORCE" as const, // "IMPULSE" or "FORCE"
    maxSpeed: 7.00,
    impulseFactor: 1.00,  // Only used when in impulse mode
    forceFactorPerSecond: 300.00, // Default as factor of constant force over time
    instantlyChangeDirection: true // Change the linear velocity to whatever the pointer direction is
};
