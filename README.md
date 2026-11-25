# pjx-echoes

An exploration game rooted in navigating the unknown and unseen.

[Playable via Vercel](https://pjx-echoes.vercel.app/)

> For Claude Code seeding information, see [CLAUDE.md](CLAUDE.md).

## Features

- **Procedural caves:** seeded maze generation (Drunkard's Walk or Cellular Automata), so any level is reproducible
- **Dynamic lighting:** raycasted occlusion, so you only see what your light reaches
- **LIDAR pulse:** ping from the player to reveal and glow nearby edges
- **Physics movement:** force/impulse-based control via mouse, touch (swipe/flick), keyboard, or gamepad
- **Progression:** find a switch to open gates and unlock the exit, then descend to the next depth
- **Entities:** torches (grow light), anti pickups (shrink light), sentries (bouncing enemies), gates, switches, and exits
- **Skins:** cosmetic presets, picked on the intro screen, with saved progress
- **Audio:** sound effects and looping music, with a mute toggle (**M**)
- **Visuals:** particle effects, bloom and CRT post-processing, soft-follow camera
- **Debug mode:** toggle with `` ` `` to inspect lights, collision geometry, and audio state

## Getting Started

**Prerequisites:** [Node.js](https://nodejs.org/) (v18 or higher recommended) and npm.

```sh
git clone https://github.com/prionicjive/pjx-echoes.git
cd pjx-echoes
npm install
npm run dev
```

Open http://localhost:5173. To play on another device on your network (e.g. a phone), use `npm run dev -- --host`.

To build for production: `npm run build`.

## TODOs

- Option to show entities only when in non-occluded light
- Load mazes from file (e.g. Tiled Map)
- Minimal HUD (levels cleared, level time, seed, items collected)

## Contributing

Pull requests, suggestions, and feedback are welcome! Feel free to open an issue or PR.

## License

[MIT License](LICENSE)
