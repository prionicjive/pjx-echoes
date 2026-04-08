# pjx-echoes

An exploration game rooted in navigating the unknown and unseen.

[Playable via Netlify](https://pjx-echoes.netlify.app/)

> For Claude Code seeding information, see [CLAUDE.md](CLAUDE.md).

## Features
- Procedural cave generation via Drunkard's Walk (with Cellular Automata smoothing), fully seeded for reproducibility
- Entities: torches (grow light), anti pickups (shrink light), sentries (bouncing enemies), gates, switches, and exits
- Find and press a switch to unlock its paired exit — gates are removed and the path opens
- Force/impulse-based player movement (pointer on desktop, swipe/flick on touch)
- Dynamic lighting with raycasted occlusion, multiple simultaneous light sources, and flicker/color animation
- Custom particle effects for trails, radiance, and impacts
- Post-processing effects (CRT scanlines and Bloom)
- Soft-follow camera with dead zone; dynamic viewport scaling without stretching
- Debug mode for toggling lights, collision geometry, markers, and overlay text
- LIDAR effect emitted from player to light up edges of tiles

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v16 or higher recommended)
- [npm](https://www.npmjs.com/) (comes with Node.js)

### Installation

Clone the repository and install dependencies:

```sh
git clone https://github.com/prionicjive/pjx-echoes.git
cd pjx-echoes
npm install
```

### Running the Game (Development Mode)

```sh
npm run dev
```

Then open the URL shown in your terminal (usually http://localhost:5173) in your browser.

To allow access from other devices on the same network (Such as wanting to play on a phone):

```sh
npm run dev -- --host
```

### Building for Production

```sh
npm run build
```

## TODOs

- Toggle option so any game entity (even lights) is only visible when in non-occluded light
- Loading maze from file (Ex. Tiled Map)
- Minimalistic UI / HUD (number of levels cleared, current level time, level seed, number of items picked up, debug info)
- BG Music
- SFX when colliding or collecting pickups
- Controller support

## Contributing

Pull requests, suggestions, and feedback are welcome! Feel free to open an issue or PR to help improve the game.

## License

[MIT License](LICENSE)
