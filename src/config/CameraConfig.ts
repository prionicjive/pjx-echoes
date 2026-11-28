export const CameraConfig = {
    lerpFactor: 1.5, // Smoothing factor for camera movement (0 = slow, 1 = instant)
    DeadZone: {
        width: 64,   // Camera doesn't move unless player leaves this zone (screen pixels)
        height: 64
    },
    Zoom: {
        baseScale: 1,            // Base viewport scale; effective world scale = baseScale * zoom
        minZoom: 0.6,
        maxZoom: 2.0,
        defaultZoom: 1,
        wheelSensitivity: 0.0015, // Log-zoom per wheel deltaY pixel
        wheelMaxDelta: 120,       // Clamp per-event deltaY so one fast flick can't jump the whole range
        pinchSensitivity: 1,      // Log-zoom per ln(fingerDistance ratio); 1 = proportional to finger spread
        smoothing: 12,            // Exponential damping rate (1/s) easing current zoom toward target
        keyRatePerSecond: 1.2     // Log-zoom per second at full held input (key, D-pad, full trigger pull)
    }
} as const;
