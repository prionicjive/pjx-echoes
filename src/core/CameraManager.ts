import * as PIXI from 'pixi.js';
import { Config } from '../config/Config.ts';
import { Player } from '../entities/Player.ts';
import { Level } from '../level/Level.ts';

export class CameraManager {
    private player: Player | null = null;
    private level: Level | null = null;

    // Zoom persists for the session: this manager is built once and survives level resets
    private targetZoom: number = Config.Camera.Zoom.defaultZoom;
    private currentZoom: number = Config.Camera.Zoom.defaultZoom;

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

    /** Current user zoom multiplier (eased). */
    getZoom(): number {
        return this.currentZoom;
    }

    /** Effective world scale: base viewport scale * zoom. */
    getScale(): number {
        return Config.Camera.Zoom.baseScale * this.currentZoom;
    }

    /** Adds a log-space zoom change (positive = zoom in) to the target, clamped to the configured bounds. */
    applyZoomInput(logDelta: number): void {
        if (logDelta === 0) return;
        this.setTargetZoom(this.targetZoom * Math.exp(logDelta));
    }

    resetZoom(): void {
        this.setTargetZoom(Config.Camera.Zoom.defaultZoom);
    }

    private setTargetZoom(zoom: number): void {
        const Z = Config.Camera.Zoom;
        this.targetZoom = Math.min(Z.maxZoom, Math.max(Z.minZoom, zoom));
    }

    /**
     * Top-left of the visible area in world pixels (screen-pixel 0,0 maps here).
     * The visible area spans viewport / getScale() world pixels.
     */
    getCameraOffset(): { x: number; y: number } {
        const s = this.getScale();
        return { x: -this.worldContainer.x / s, y: -this.worldContainer.y / s };
    }

    /**
     * Eases current zoom toward the target (frame-rate independent). While it changes, the world
     * point at the screen center stays fixed so the zoom pivots about the view center without a jump.
     */
    private updateZoom(deltaTime: number): void {
        if (this.currentZoom === this.targetZoom) return;
        const { width: screenWidth, height: screenHeight } = this.getViewport();
        const oldScale = this.getScale();

        const k = 1 - Math.exp(-Config.Camera.Zoom.smoothing * deltaTime);
        this.currentZoom += (this.targetZoom - this.currentZoom) * k;
        if (Math.abs(this.targetZoom - this.currentZoom) < 0.0005) this.currentZoom = this.targetZoom;

        const newScale = this.getScale();
        const centerWorldX = (screenWidth / 2 - this.worldContainer.x) / oldScale;
        const centerWorldY = (screenHeight / 2 - this.worldContainer.y) / oldScale;
        this.worldContainer.scale.set(newScale);
        this.worldContainer.x = screenWidth / 2 - centerWorldX * newScale;
        this.worldContainer.y = screenHeight / 2 - centerWorldY * newScale;
    }

    /**
     * Handles camera movement each frame, using soft-follow logic and dead zone.
     * All follow math is in screen pixels (world pixels * scale + container offset).
     */
    updateCamera(deltaTime: number): void {
        if (!this.player || !this.player.sprite || !this.level) return;

        this.updateZoom(deltaTime);

        const s = this.getScale();
        const { width: screenWidth, height: screenHeight } = this.getViewport();
        const levelWidthInPixels = this.level.getWidth() * Config.PixelsPerMeter * s;
        const levelHeightInPixels = this.level.getHeight() * Config.PixelsPerMeter * s;

        // Center on x-axis if level is narrower than screen
        if (levelWidthInPixels <= screenWidth) {
            this.worldContainer.x = (screenWidth - levelWidthInPixels) / 2;
        } else {
            const screenCenterX = screenWidth / 2;
            const offsetX = this.player.sprite.x * s + this.worldContainer.x; // Player's screen x

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
            const offsetY = this.player.sprite.y * s + this.worldContainer.y; // Player's screen y

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

        const s = this.getScale();
        this.worldContainer.scale.set(s);
        const { width: screenWidth, height: screenHeight } = this.getViewport();
        const levelWidthInPixels = this.level.getWidth() * Config.PixelsPerMeter * s;
        const levelHeightInPixels = this.level.getHeight() * Config.PixelsPerMeter * s;

        if (levelWidthInPixels <= screenWidth) {
            this.worldContainer.x = (screenWidth - levelWidthInPixels) / 2;
        } else {
            this.worldContainer.x = -this.player.sprite.x * s + screenWidth / 2;
            this.worldContainer.x = Math.min(0, Math.max(this.worldContainer.x, screenWidth - levelWidthInPixels));
        }

        if (levelHeightInPixels <= screenHeight) {
            this.worldContainer.y = (screenHeight - levelHeightInPixels) / 2;
        } else {
            this.worldContainer.y = -this.player.sprite.y * s + screenHeight / 2;
            this.worldContainer.y = Math.min(0, Math.max(this.worldContainer.y, screenHeight - levelHeightInPixels));
        }

        this.counteractWorldTransform();
    }

    /**
     * Keeps the viewport-sized lightmap pinned to the screen: cancels the world's translation and
     * scale (the lightmap texture is always viewport-sized, drawn at 1:1 screen pixels).
     */
    private counteractWorldTransform(): void {
        const s = this.getScale();
        this.lightsContainer.scale.set(1 / s);
        this.lightsContainer.position.set(-this.worldContainer.x / s, -this.worldContainer.y / s);
    }
}
