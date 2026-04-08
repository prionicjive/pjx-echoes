import * as PIXI from 'pixi.js';
import { Config } from '../config/Config.ts';
import { Player } from '../entities/Player.ts';
import { Level } from '../level/Level.ts';

export class CameraManager {
    private player: Player | null = null;
    private level: Level | null = null;

    private readonly worldContainer: PIXI.Container;
    private readonly lightsContainer: PIXI.Container;
    private readonly getViewport: () => { width: number; height: number };

    constructor(
        worldContainer: PIXI.Container,
        lightsContainer: PIXI.Container,
        getViewport: () => { width: number; height: number }
    ) {
        this.worldContainer = worldContainer;
        this.lightsContainer = lightsContainer;
        this.getViewport = getViewport;
    }

    setPlayer(player: Player | null): void {
        this.player = player;
    }

    setLevel(level: Level | null): void {
        this.level = level;
    }

    getCameraOffset(): { x: number; y: number } {
        return { x: -this.worldContainer.x, y: -this.worldContainer.y };
    }

    /**
     * Handles camera movement each frame, using soft-follow logic and dead zone.
     */
    updateCamera(deltaTime: number): void {
        if (!this.player || !this.player.sprite || !this.level) return;

        const { width: screenWidth, height: screenHeight } = this.getViewport();
        const levelWidthInPixels = this.level.getWidth() * Config.PixelsPerMeter;
        const levelHeightInPixels = this.level.getHeight() * Config.PixelsPerMeter;

        // Center on x-axis if level is narrower than screen
        if (levelWidthInPixels <= screenWidth) {
            this.worldContainer.x = (screenWidth - levelWidthInPixels) / 2;
        } else {
            const screenCenterX = screenWidth / 2;
            const cameraX = -this.worldContainer.x;
            const offsetX = this.player.sprite.x - cameraX;

            let moveX = 0;
            if (offsetX < screenCenterX - Config.Camera.DeadZone.width / 2) {
                moveX = offsetX - (screenCenterX - Config.Camera.DeadZone.width / 2);
            } else if (offsetX > screenCenterX + Config.Camera.DeadZone.width / 2) {
                moveX = offsetX - (screenCenterX + Config.Camera.DeadZone.width / 2);
            }

            this.worldContainer.x -= moveX * Config.Camera.lerpFactor * deltaTime;
            this.worldContainer.x = Math.min(0, Math.max(this.worldContainer.x, screenWidth - levelWidthInPixels));
        }

        // Center on y-axis if level is shorter than screen
        if (levelHeightInPixels <= screenHeight) {
            this.worldContainer.y = (screenHeight - levelHeightInPixels) / 2;
        } else {
            const screenCenterY = screenHeight / 2;
            const cameraY = -this.worldContainer.y;
            const offsetY = this.player.sprite.y - cameraY;

            let moveY = 0;
            if (offsetY < screenCenterY - Config.Camera.DeadZone.height / 2) {
                moveY = offsetY - (screenCenterY - Config.Camera.DeadZone.height / 2);
            } else if (offsetY > screenCenterY + Config.Camera.DeadZone.height / 2) {
                moveY = offsetY - (screenCenterY + Config.Camera.DeadZone.height / 2);
            }

            this.worldContainer.y -= moveY * Config.Camera.lerpFactor * deltaTime;
            this.worldContainer.y = Math.min(0, Math.max(this.worldContainer.y, screenHeight - levelHeightInPixels));
        }

        // Reposition containers that must stay pinned to the viewport
        this.counteractWorldTransform();
    }

    instantlyCenterCamera(): void {
        if (!this.player || !this.player.sprite || !this.level) return;

        const { width: screenWidth, height: screenHeight } = this.getViewport();
        const levelWidthInPixels = this.level.getWidth() * Config.PixelsPerMeter;
        const levelHeightInPixels = this.level.getHeight() * Config.PixelsPerMeter;

        if (levelWidthInPixels <= screenWidth) {
            this.worldContainer.x = (screenWidth - levelWidthInPixels) / 2;
        } else {
            const targetX = -this.player.sprite.x + screenWidth / 2;
            this.worldContainer.x += (targetX - this.worldContainer.x);
            this.worldContainer.x = Math.min(0, Math.max(this.worldContainer.x, screenWidth - levelWidthInPixels));
        }

        if (levelHeightInPixels <= screenHeight) {
            this.worldContainer.y = (screenHeight - levelHeightInPixels) / 2;
        } else {
            const targetY = -this.player.sprite.y + screenHeight / 2;
            this.worldContainer.y += (targetY - this.worldContainer.y);
            this.worldContainer.y = Math.min(0, Math.max(this.worldContainer.y, screenHeight - levelHeightInPixels));
        }
    }

    private counteractWorldTransform(): void {
        this.lightsContainer.position.set(-this.worldContainer.x, -this.worldContainer.y);
    }
}
