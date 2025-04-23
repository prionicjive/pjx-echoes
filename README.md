# pjx-echoes

An exploration game rooted in navigating the unknown and unseen.

## Features
- Map / maze generation with rooms / caves, utilizing cellular automata and flood fill
- Generation of a new map / maze upon reaching a finish tile

## TODO
- Address todos and deprecations, particularly around Box2D questions (Look to echoes for reference)
- Soft follow camera with world larger than single screen with proper coordinate translation system
  - See if stage.pivot suffices or if camera system is needed

### Graphical Polish
- Post processing bloom / glow shader and crt shader (From pixi-filters)
- Post processing glitch shaders, for when colliding with wall
- Particle trail effect for player
- Light occlusion or "fog of war" style lighting
- UI / HUD / Menus

### Map Maze improvement
- Loading maze from file, possibly Tiled Map
- Consider other map / maze generation algorithms