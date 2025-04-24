/**
 * Entry point for the pjx-echoes browser game.
 * Sets up styles and starts the main Game instance.
 */

import './style.css'; // Bring in global styles for the game canvas and layout
import { Game } from './core/Game.ts'; // Main game controller (handles everything!)

const game = new Game(); // Create a new game instance
game.init();             // Initialize and start the game loop