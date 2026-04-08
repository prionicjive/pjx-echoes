export const SpritesheetConfig = {
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
} as const;
