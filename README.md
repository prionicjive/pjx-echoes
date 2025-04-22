# pjx-echoes

A 2D physics-based maze game.

## Features
TODO

## TODO
- Maze generation with "wider corridors or rooms / caves", utilizing cellular automata and flood fill
- Address todos and deprecations, particularly around Box2D questions (Look to echoes for reference)
- Soft follow camera with world larger than single screen with proper coordinate translation system
  - See if stage.pivot suffices or if camera system is needed

### Graphical Polish
- Post processing bloom / glow shader and crt shader (From pixi-filters)
- Post processing glitch shaders, for when colliding with wall
- Particle trail effect for ball
- Light occlusion or "fog of war" style lighting
- UI / HUD / Menus

### Maze improvement
- loading maze from file, possibly Tiled Map