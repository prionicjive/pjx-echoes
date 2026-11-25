import { CameraConfig } from './CameraConfig';
import { PhysicsConfig } from './PhysicsConfig';
import { SpritesheetConfig } from './SpritesheetConfig';
import { MovementConfig } from './MovementConfig';
import { DebugConfig } from './DebugConfig';
import { MaskConfig } from './MaskConfig';
import { SkinsConfig } from './SkinsConfig';
import { TransitionConfig } from './TransitionConfig';
import { AudioConfig } from './AudioConfig';
import { IntroConfig } from './IntroConfig';

export const Config = {
    PixelsPerMeter: 16, // How many pixels represent one physics meter

    Camera: CameraConfig,
    Physics: PhysicsConfig,
    Spritesheet: SpritesheetConfig,
    Movement: MovementConfig,
    Debug: DebugConfig,
    Mask: MaskConfig,
    Skins: SkinsConfig,
    Transition: TransitionConfig,
    Audio: AudioConfig,
    Intro: IntroConfig,

    // Entity type identifiers and visual/physics constants
    Player: {
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
        color: 0xBB32FF,  // Tint color for the sentry sprite
        radius: 0.25,     // Physics radius of the sentry (in meters)
        maxSpeed: 5.00,
    },
    Wall: {
        width: 1,
        height: 1,
        color: 0x111111,
    },
    Gate: {
        width: 1,
        height: 1,
        color: 0x0000FF,
    },
    Switch: {
        width: 1,
        height: 1,
        color: 0x0000FF,
    },
    Torch: {
        width: 1,
        height: 1,
        color: 0xdfb503,
    },
    Anti: {
        width: 1,
        height: 1,
        color: 0xff0888,
    },
    Exit: {
        width: 1,
        height: 1,
        color: 0x2ddf03,
    },
    Edges: {
        color: 0x039BDF,
        thickness: 3
    },
};
