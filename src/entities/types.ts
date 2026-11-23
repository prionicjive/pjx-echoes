export const EntityType = {
    Player: 'Player',
    Sentry: 'Sentry',
    Wall: 'Wall',
    Gate: 'Gate',
    Switch: 'Switch',
    Exit: 'Exit',
    Torch: 'Torch',
    Anti: 'Anti',
} as const;

export type EntityType = (typeof EntityType)[keyof typeof EntityType];

// Physics body kinds: all entity types plus non-entity bodies (e.g. level edges)
export const BodyType = {
    ...EntityType,
    Edges: 'Edges',
} as const;

export type BodyType = (typeof BodyType)[keyof typeof BodyType];
