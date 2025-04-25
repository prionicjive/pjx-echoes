# pjx-echoes

An exploration game rooted in navigating the unknown and unseen.

[Playable via Netlify](https://pjx-echoes.netlify.app/)

## Features
- Map / maze generation with rooms / caves, utilizing cellular automata and flood fill
- Player impulse movement via Planck physics
- Generation of a new map / maze upon reaching a finish tile
- Soft follow camera when world is larger than single screen, with dead zone
- Dynamic lighting system with raycasted light occlusion and support for mutliple lights
- Edge calculation for light raycasting and level rendering

## Tech Stack

- **TypeScript** – Strongly typed JavaScript for scalable code
- **PIXI.js** – Fast 2D WebGL rendering for graphics
- **Planck.js** – 2D physics engine for realistic movement and collisions
- **Vite** – Lightning-fast development server and build tool

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v16 or higher recommended)
- [npm](https://www.npmjs.com/) (comes with Node.js)

### Installation

Clone the repository and install dependencies:

```sh
git clone https://github.com/YOUR_USERNAME/pjx-echoes.git
cd pjx-echoes
npm install
```

### Running the Game (Development Mode)

```sh
npm run dev
```

Then open the URL shown in your terminal (usually http://localhost:5173) in your browser.

### Building for Production

```sh
npm run build
```

## Project Structure

- `src/core/` – Main game loop, camera, and input management
- `src/entities/` – Player, level, and entity definitions
- `src/utils/` – Map generation, math utilities, etc.
- `assets/` – Sprites and textures
- `index.html` – Entry point for the app

## TODO

### Graphical Polish
- Post processing bloom / glow shader and crt shader (From pixi-filters)
- Post processing glitch shaders, for when colliding with wall
- Particle trail effect for player
- UI / HUD / Menus

### Map Maze improvement
- Loading maze from file, possibly Tiled Map
- Consider other map / maze generation algorithms

## Contributing

Pull requests, suggestions, and feedback are welcome! Feel free to open an issue or PR to help improve the game.

## License

[MIT License](LICENSE)