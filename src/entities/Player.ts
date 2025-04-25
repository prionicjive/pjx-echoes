// Player.ts
/**
 * Represents the player entity in the game.
 * Handles physics body creation, sprite setup, and movement logic.
 *
 * @module Player
 */

import { Game } from '../core/Game';
import { Entity } from './types';
import { Point } from '../utils/types';
import * as planck from 'planck';
import * as PIXI from 'pixi.js';

/**
 * The Player class implements the controllable player character.
 * Handles physics, rendering, and input-based movement.
 */
export class Player implements Entity {
    body: planck.Body;
    sprite: PIXI.Sprite;

    /**
     * Creates a new Player instance, including its physics body and sprite.
     * Adds the sprite to the provided PIXI container.
     *
     * @param {planck.World} world - The Planck.js world to add the player to.
     * @param {PIXI.Container | null} levelContainer - Where to add the player's sprite for rendering.
     * @param {Point} spawnPoint - Initial position (in world units).
     */
    constructor(world: planck.World, levelContainer: PIXI.Container | null, spawnPoint: Point) {
        // Place player in the center of the tile
        const playerRadius = Game.Config.Player.radius;
        const center = new planck.Vec2(spawnPoint.x + Game.Config.Wall.size / 2, spawnPoint.y + Game.Config.Wall.size / 2);
        this.body = world.createDynamicBody(center);
        console.log(this.body.getPosition())
        this.body.setLinearDamping(Game.Config.Physics.Player.linearDamping);

        // Add a circular fixture for collisions
        this.body.createFixture(new planck.Circle(playerRadius), {
            restitution: Game.Config.Physics.Player.restitution,
            friction: 0,
            density: 1,
            userData: "PLAYER",
            filterCategoryBits: Game.Config.Physics.Collision.categoryPlayer,
            filterMaskBits: Game.Config.Physics.Collision.categoryWall | Game.Config.Physics.Collision.categoryFinish
        });

        // Generate sprite for the player
        this.sprite = PIXI.Sprite.from(Game.Config.Textures.player);
        // Position the sprite to match the physics body
        this.sprite.x = (this.body.getPosition().x - Game.Config.Wall.size / 2) * Game.Config.PixelsPerMeter;
        this.sprite.y = (this.body.getPosition().y - Game.Config.Wall.size / 2) * Game.Config.PixelsPerMeter;
        this.sprite.width = 2 * playerRadius * Game.Config.PixelsPerMeter;
        this.sprite.height = 2 * playerRadius * Game.Config.PixelsPerMeter;
        this.sprite.tint = Game.Config.Player.color;
        
        levelContainer?.addChild(this.sprite);
    }

    /**
     * Applies an impulse to the player body toward the given pixel position.
     * Used to move the player in response to input.
     *
     * @param {Point} levelRelativePositionInPixels - Target position in pixels, relative to the level.
     */
    applyImpulseTowards(levelRelativePositionInPixels: Point) {
        // Convert pixel coordinates to world (meter) coordinates
        const playerPos = this.body.getPosition();
        
        // Calculate vector from player to target
        const deltaX = playerPos.x - (levelRelativePositionInPixels.x / Game.Config.PixelsPerMeter);
        const deltaY = playerPos.y - (levelRelativePositionInPixels.y / Game.Config.PixelsPerMeter);
        const length = Math.hypot(deltaX, deltaY);

        // Tune this value for desired impulse strength
        const impulseScale = Game.Config.Physics.Player.impulseFactor;

        // Calculate normalized impulse vector
        const impulse = new planck.Vec2((deltaX / length) * impulseScale, (deltaY / length) * impulseScale);

        // Apply impulse at the center of mass
        this.body.applyLinearImpulse(impulse, this.body.getWorldCenter(), true);
    }

    /**
     * Updates the player's sprite position to match the physics body.
     * Should be called every frame.
     */
    update() {
        // Keep the sprite visually synced with the physics body
        this.sprite.x = (this.body.getPosition().x - Game.Config.Wall.size / 2) * Game.Config.PixelsPerMeter;
        this.sprite.y = (this.body.getPosition().y - Game.Config.Wall.size / 2) * Game.Config.PixelsPerMeter;
        this.sprite.rotation = this.body.getAngle();
    }
}
