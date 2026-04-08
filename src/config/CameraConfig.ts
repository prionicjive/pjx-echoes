export const CameraConfig = {
    lerpFactor: 1.5, // Smoothing factor for camera movement (0 = slow, 1 = instant)
    DeadZone: {
        width: 64,   // Camera doesn't move unless player leaves this zone
        height: 64
    }
} as const;
