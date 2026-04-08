import * as PIXI from 'pixi.js';
import { Config } from '../config/Config.ts';
import { Player } from '../entities/Player.ts';
import { Level } from '../level/Level.ts';
import { InputManager } from '../input/InputManager.ts';
import { LidarManager } from '../lidar/LidarManager.ts';
import { Segment } from '../utils/types.ts';

interface DebugStats {
    numLevelsCompleted: number;
    raycastTime: number;
    maskUpdateTime: number;
    lightRenderTime: number;
    activeLightCount: number;
    avgSegmentsPerLight: number;
    maxSegmentsPerLight: number;
    totalRaySegmentTests: number;
}

export class DebugOverlay {
    private player: Player | null = null;
    private level: Level | null = null;

    private readonly debugText: PIXI.Text;
    private readonly inputManager: InputManager;
    private readonly lightsContainer: PIXI.Container;
    private readonly levelGeometryContainer: PIXI.Container;
    private readonly lidarManager: LidarManager;
    private readonly getWorldOffset: () => { x: number; y: number };
    private readonly getStats: () => DebugStats;
    private readonly onPlayerViewToggled: (enabled: boolean) => void;
    private readonly getEdges: () => Segment[];

    constructor(
        debugText: PIXI.Text,
        inputManager: InputManager,
        lightsContainer: PIXI.Container,
        levelGeometryContainer: PIXI.Container,
        lidarManager: LidarManager,
        getWorldOffset: () => { x: number; y: number },
        getStats: () => DebugStats,
        onPlayerViewToggled: (enabled: boolean) => void,
        getEdges: () => Segment[]
    ) {
        this.debugText = debugText;
        this.inputManager = inputManager;
        this.lightsContainer = lightsContainer;
        this.levelGeometryContainer = levelGeometryContainer;
        this.lidarManager = lidarManager;
        this.getWorldOffset = getWorldOffset;
        this.getStats = getStats;
        this.onPlayerViewToggled = onPlayerViewToggled;
        this.getEdges = getEdges;
    }

    setPlayer(player: Player | null): void {
        this.player = player;
    }

    setLevel(level: Level | null): void {
        this.level = level;
    }

    handleDebugInput(): void {
        const keys = this.inputManager.getKeysState().keys;

        // Toggle debug text
        if (keys.get("`")?.justPressed) {
            Config.Debug.showDebugText = !Config.Debug.showDebugText;
            this.debugText.visible = Config.Debug.showDebugText;
        }

        // Toggle lights
        if (keys.get("1")?.justPressed) {
            Config.Debug.showLights = !Config.Debug.showLights;
            this.lightsContainer.visible = Config.Debug.showLights;
        }

        // Toggle level geometry
        if (keys.get("2")?.justPressed) {
            Config.Debug.showLevelGeometry = !Config.Debug.showLevelGeometry;
            this.levelGeometryContainer.visible = Config.Debug.showLevelGeometry;
        }

        // Toggle collision markers
        if (keys.get("3")?.justPressed) {
            Config.Debug.showCollisionMarkers = !Config.Debug.showCollisionMarkers;
        }

        // Toggle player view mode (entities only visible inside the player's light polygon)
        if (keys.get("4")?.justPressed) {
            Config.Debug.onlyDisplayInPlayerView = !Config.Debug.onlyDisplayInPlayerView;
            this.onPlayerViewToggled(Config.Debug.onlyDisplayInPlayerView);
        }

        // Fire LIDAR pulse
        if (keys.get(" ")?.justPressed) {
            if (this.player && this.level) {
                const playerPos = this.player.body!.getPosition();
                this.lidarManager.fire(
                    { x: playerPos.x, y: playerPos.y },
                    this.getEdges()
                );
            }
        }
    }

    updateDebugText(): void {
        if (!this.debugText || !this.player || !this.level) return;

        const offset = this.getWorldOffset();
        const stats = this.getStats();

        this.debugText.text =
            `FPS: ${Math.round(PIXI.Ticker.shared.FPS)}\n` +
            `Player (World): [${Math.floor(this.player.sprite.x)}, ${Math.floor(this.player.sprite.y)}]\n` +
            `Player (Current Tile): [${Math.floor(this.player.sprite.x / Config.PixelsPerMeter)}, ${Math.floor(this.player.sprite.y / Config.PixelsPerMeter)}]\n` +
            `Camera Offset: [${Math.floor(offset.x)}, ${Math.floor(offset.y)}]\n` +
            `Levels Completed: ${stats.numLevelsCompleted}\n` +
            `Seed: ${this.level.getSeed()}\n` +
            `Raycast Time: ${stats.raycastTime.toFixed(2)}ms\n` +
            `Mask Update Time: ${stats.maskUpdateTime.toFixed(2)}ms\n` +
            `Light Render Time: ${stats.lightRenderTime.toFixed(2)}ms\n` +
            `Lights: ${stats.activeLightCount} | Avg segs/light: ${stats.avgSegmentsPerLight.toFixed(1)} | Max: ${stats.maxSegmentsPerLight}\n` +
            `Ray×Seg tests/frame: ${stats.totalRaySegmentTests.toLocaleString()}`;
    }
}
