import * as PIXI from 'pixi.js';
import { Config } from '../config/Config.ts';
import { Player } from '../entities/Player.ts';
import { LightManager } from '../light/LightManager.ts';
import { Light } from '../light/Light.ts';
import { LightUtils } from '../utils/LightUtils.ts';

export class LightRenderPipeline {
    private player: Player | null = null;
    private lightRenderTime: number = 0;

    private readonly renderer: PIXI.Renderer;
    private readonly tempLightmapContainer: PIXI.Container;
    private readonly transparentBgRect: PIXI.Graphics;
    private readonly playerLightPolygonMask: PIXI.Graphics;

    // Mutable — replaced on every resize via setLightmapTexture()
    private lightmapTexture: PIXI.RenderTexture;

    constructor(
        renderer: PIXI.Renderer,
        tempLightmapContainer: PIXI.Container,
        lightmapTexture: PIXI.RenderTexture,
        transparentBgRect: PIXI.Graphics,
        playerLightPolygonMask: PIXI.Graphics
    ) {
        this.renderer = renderer;
        this.tempLightmapContainer = tempLightmapContainer;
        this.lightmapTexture = lightmapTexture;
        this.transparentBgRect = transparentBgRect;
        this.playerLightPolygonMask = playerLightPolygonMask;
    }

    setPlayer(player: Player | null): void {
        this.player = player;
    }

    /** Called by World after resizeTexturesAndGraphicalElements recreates the texture. */
    setLightmapTexture(texture: PIXI.RenderTexture): void {
        this.lightmapTexture = texture;
    }

    getLightRenderTime(): number {
        return this.lightRenderTime;
    }

    updateAndRenderLights(
        cameraOffset: { x: number; y: number },
        viewportWidth: number,
        viewportHeight: number
    ): void {
        const start = performance.now();

        LightManager.instance.update();

        const screenBounds = {
            left: cameraOffset.x,
            top: cameraOffset.y,
            right: cameraOffset.x + viewportWidth,
            bottom: cameraOffset.y + viewportHeight
        };

        this.tempLightmapContainer.removeChildren();

        if (Config.Debug.onlyDisplayInPlayerView && this.player?.light) {
            this.renderPlayerViewModeLights(cameraOffset, screenBounds);
        } else {
            this.renderNormalLights(cameraOffset, screenBounds);
        }

        this.lightRenderTime = performance.now() - start;

        LightManager.instance.processPendingRemovals();
    }

    private renderPlayerViewModeLights(
        cameraOffset: { x: number; y: number },
        screenBounds: { left: number; top: number; right: number; bottom: number }
    ): void {
        if (!this.player?.light) return;

        // === PASS 1: Render player light (unmasked) ===
        const playerLight = this.player.light;
        LightUtils.renderLightsBatch(
            [playerLight],
            cameraOffset, screenBounds, this.tempLightmapContainer
        );

        this.renderer.render({
            container: this.transparentBgRect,
            target: this.lightmapTexture,
            clear: true
        });
        this.renderer.render({
            container: this.tempLightmapContainer,
            target: this.lightmapTexture,
            clear: false
        });

        // === PASS 2: Render overlapping non-player lights, masked to player's visible polygon ===
        const playerPos = playerLight.getPosition();
        const playerRadius = playerLight.radius;
        const polygon = playerLight.getLightPoints().map(p => p.point);
        const overlappingLights = LightManager.instance.getAllLights().filter(light => {
            if (light.id === playerLight.id) return false;
            const lp = light.getPosition();
            const dx = lp.x - playerPos.x;
            const dy = lp.y - playerPos.y;
            return (dx * dx + dy * dy) < (playerRadius + light.radius) * (playerRadius + light.radius);
        });

        if (overlappingLights.length > 0 && polygon.length >= 3) {
            this.drawScreenSpaceMask(polygon, cameraOffset);
            this.renderMaskedLights(overlappingLights, cameraOffset, screenBounds);
        }
    }

    private renderNormalLights(
        cameraOffset: { x: number; y: number },
        screenBounds: { left: number; top: number; right: number; bottom: number }
    ): void {
        LightUtils.renderLightsBatch(
            LightManager.instance.getAllLights(),
            cameraOffset, screenBounds, this.tempLightmapContainer
        );

        this.renderer.render({
            container: this.transparentBgRect,
            target: this.lightmapTexture,
            clear: true
        });
        this.renderer.render({
            container: this.tempLightmapContainer,
            target: this.lightmapTexture,
            clear: false
        });
    }

    private drawScreenSpaceMask(
        polygon: { x: number; y: number }[],
        cameraOffset: { x: number; y: number }
    ): void {
        const ppm = Config.PixelsPerMeter;

        this.playerLightPolygonMask.clear();
        this.playerLightPolygonMask.moveTo(
            polygon[0].x * ppm - cameraOffset.x,
            polygon[0].y * ppm - cameraOffset.y
        );
        for (let i = 1; i < polygon.length; i++) {
            this.playerLightPolygonMask.lineTo(
                polygon[i].x * ppm - cameraOffset.x,
                polygon[i].y * ppm - cameraOffset.y
            );
        }
        this.playerLightPolygonMask.closePath();
        this.playerLightPolygonMask.fill({ color: 0xffffff, alpha: 1 });

        this.tempLightmapContainer.removeChildren();
        this.tempLightmapContainer.addChild(this.playerLightPolygonMask);
        this.tempLightmapContainer.mask = this.playerLightPolygonMask;
    }

    private renderMaskedLights(
        overlappingLights: Light[],
        cameraOffset: { x: number; y: number },
        screenBounds: { left: number; top: number; right: number; bottom: number }
    ): void {
        LightUtils.renderLightsBatch(
            overlappingLights,
            cameraOffset, screenBounds, this.tempLightmapContainer
        );
        this.renderer.render({
            container: this.tempLightmapContainer,
            target: this.lightmapTexture,
            clear: false
        });

        this.tempLightmapContainer.mask = null;
    }
}
