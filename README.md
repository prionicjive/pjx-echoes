# pjx-echoes

An exploration game rooted in navigating the unknown and unseen.

## Features
- Map / maze generation with rooms / caves, utilizing cellular automata and flood fill
- Player impulse movement via Planck physics
- Generation of a new map / maze upon reaching a finish tile
- Soft follow camera when world islarger than single screen, with soft dead zone.

## TODO
- Address todos and deprecations, particularly around Box2D questions (Look to echoes for reference)with proper coordinate translation system

### Graphical Polish
- Post processing bloom / glow shader and crt shader (From pixi-filters)
- Post processing glitch shaders, for when colliding with wall
- Particle trail effect for player
- Light occlusion or "fog of war" style lighting
- UI / HUD / Menus

### Map Maze improvement
- Loading maze from file, possibly Tiled Map
- Consider other map / maze generation algorithms