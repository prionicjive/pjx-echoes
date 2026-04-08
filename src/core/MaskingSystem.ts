import * as PIXI from 'pixi.js';
import { Config } from '../config/Config.ts';
import { Player } from '../entities/Player.ts';

export class MaskingSystem {
    private player: Player | null = null;

    // NOTE: The timestamp-based cache below never actually hits within a single frame
    // because Date.now() has millisecond resolution and two calls in the same frame
    // return the same value only by coincidence. The polygon is effectively recomputed
    // every frame. This behaviour is preserved intentionally — do not fix here.
    private cachedPlayerPolygon: { point: { x: number; y: number }; angle: number }[] | null = null;
    private lastPlayerLightUpdate: number = 0;

    private maskUpdateTime: number = 0;

    private readonly playerViewMask: PIXI.Graphics;
    private readonly playerLightPolygonMask: PIXI.Graphics;
    private readonly entityContainerGroup: PIXI.Container;

    constructor(
        playerViewMask: PIXI.Graphics,
        playerLightPolygonMask: PIXI.Graphics,
        entityContainerGroup: PIXI.Container
    ) {
        this.playerViewMask = playerViewMask;
        this.playerLightPolygonMask = playerLightPolygonMask;
        this.entityContainerGroup = entityContainerGroup;
    }

    setPlayer(player: Player | null): void {
        this.player = player;
    }

    getMaskUpdateTime(): number {
        return this.maskUpdateTime;
    }

    updatePlayerViewMask(): void {
        const start = performance.now();

        if (!this.validatePlayerViewMode()) {
            this.clearEntityMask();
            this.maskUpdateTime = performance.now() - start;
            return;
        }

        const lightPoints = this.getCachedPlayerPolygon();
        if (lightPoints.length < 3) {
            this.clearEntityMask();
            this.maskUpdateTime = performance.now() - start;
            return;
        }

        this.drawWorldSpaceMask(lightPoints);
        this.entityContainerGroup.mask = this.playerViewMask;

        this.maskUpdateTime = performance.now() - start;
    }

    clearEntityMask(): void {
        this.entityContainerGroup.mask = null;
    }

    clearAllMasks(): void {
        this.entityContainerGroup.mask = null;
        this.playerViewMask.clear();
        this.playerLightPolygonMask.clear();
        this.cachedPlayerPolygon = null;
    }

    private validatePlayerViewMode(): boolean {
        return Config.Debug?.onlyDisplayInPlayerView === true &&
               this.player?.light !== null;
    }

    private getCachedPlayerPolygon(): { point: { x: number; y: number }; angle: number }[] {
        if (!this.player?.light) return [];

        const currentUpdate = Date.now();
        if (this.cachedPlayerPolygon && this.lastPlayerLightUpdate === currentUpdate) {
            return this.cachedPlayerPolygon;
        }

        this.cachedPlayerPolygon = this.player.light.getLightPoints();
        this.lastPlayerLightUpdate = currentUpdate;
        return this.cachedPlayerPolygon;
    }

    private drawWorldSpaceMask(lightPoints: { point: { x: number; y: number }; angle: number }[]): void {
        const ppm = Config.PixelsPerMeter;

        this.playerViewMask.clear();
        this.playerViewMask.moveTo(
            lightPoints[0].point.x * ppm,
            lightPoints[0].point.y * ppm
        );
        for (let i = 1; i < lightPoints.length; i++) {
            this.playerViewMask.lineTo(
                lightPoints[i].point.x * ppm,
                lightPoints[i].point.y * ppm
            );
        }
        this.playerViewMask.closePath();
        this.playerViewMask.fill({ color: 0xffffff, alpha: 1 });
    }
}
