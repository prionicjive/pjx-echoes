// Centralized LIDAR pulse configuration
export const LidarConfig = {
    // Expansion
    expansionSpeed: 15,        // meters per second
    maxRadius: 25,             // meters — maximum reach

    // Raycasting
    numRays: 360,              // number of rays cast at fire time

    // Color gradient (sampled by distance ratio 0→1 from center to edge)
    colorGradient: [
        { t: 0.0, color: 0xFFAA00 },  // warm orange near player
        { t: 0.3, color: 0xAAFF00 },  // yellow-green
        { t: 0.6, color: 0x00FF88 },  // green
        { t: 1.0, color: 0x0044FF },  // cool blue at max radius
    ],

    // Wavefront arc
    arcThickness: 2,           // px stroke width for the expanding arc
    arcAlpha: 0.8,             // base alpha of the arc

    // Arc fade-out (after reaching maxRadius)
    fadeOutDuration: 2.0,      // seconds for the arc to fade after reaching max radius

    // Edge glow (persistent "scanner tag" segments)
    glowThickness: 3,          // px stroke width for edge glows
    glowBaseAlpha: 1.0,        // base alpha when first activated
    glowDuration: 0,           // seconds before fade starts (0 = infinite / level lifetime)
    glowFadeDuration: 2.0,     // seconds for the fade-out (only used if glowDuration > 0)

    // Cooldown
    cooldown: 0.5,             // seconds before another pulse can fire
};
