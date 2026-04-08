import planck from 'planck';
import * as PIXI from 'pixi.js';
import { Config } from '../config/Config.ts';
import { EntityUserData } from '../entities/BaseEntity.ts';
import { Player } from '../entities/Player.ts';
import { Level } from '../level/Level.ts';
import { ParticleEffectManager } from '../particles/ParticleEffectManager.ts';

export class CollisionDispatcher {
    private player: Player | null = null;
    private level: Level | null = null;

    private readonly preEntitiesContainer: PIXI.Container;
    private readonly onResetRequested: () => void;
    private readonly onLevelCompleted: () => void;

    constructor(
        preEntitiesContainer: PIXI.Container,
        onResetRequested: () => void,
        onLevelCompleted: () => void
    ) {
        this.preEntitiesContainer = preEntitiesContainer;
        this.onResetRequested = onResetRequested;
        this.onLevelCompleted = onLevelCompleted;
    }

    setPlayer(player: Player | null): void {
        this.player = player;
    }

    setLevel(level: Level | null): void {
        this.level = level;
    }

    /**
     * Handles collision events from Planck.js, such as the player reaching an exit tile
     * or interacting with walls.
     */
    handleContact(contact: planck.Contact): void {
        const aData: EntityUserData = contact.getFixtureA().getBody().getUserData() as EntityUserData;
        const bData: EntityUserData = contact.getFixtureB().getBody().getUserData() as EntityUserData;

        if (
            (aData.type === Config.Player.type && bData.type === Config.Exit.type) ||
            (aData.type === Config.Exit.type && bData.type === Config.Player.type)
        ) {
            this.onLevelCompleted();
            this.onResetRequested();
        } else if (
            (aData.type === Config.Player.type && bData.type === Config.Edges.type) ||
            (aData.type === Config.Edges.type && bData.type === Config.Player.type)
        ) {
            if (Config.Debug.showCollisionMarkers) {
                this.spawnEdgeImpactParticles(contact);
            }
        } else if (
            (aData.type === Config.Sentry.type && bData.type === Config.Edges.type) ||
            (aData.type === Config.Edges.type && bData.type === Config.Sentry.type)
        ) {
            if (Config.Debug.showCollisionMarkers) {
                this.spawnEdgeImpactParticles(contact);
            }
        } else if (
            (aData.type === Config.Player.type && bData.type === Config.Sentry.type) ||
            (aData.type === Config.Sentry.type && bData.type === Config.Player.type)
        ) {
            const sentryData: EntityUserData = aData?.type === Config.Sentry.type ? aData : bData;
            if (sentryData.entity) {
                this.player!.onPickup(sentryData.type);
                this.level!.gentlyDestroyEntity(sentryData.entity);
            }
            // Disable contact to prevent sentry from physically reacting with the player
            contact.setEnabled(false);
        } else if (
            (aData.type === Config.Player.type && bData.type === Config.Torch.type) ||
            (aData.type === Config.Torch.type && bData.type === Config.Player.type)
        ) {
            const torchEntity: EntityUserData = aData?.type === Config.Torch.type ? aData : bData;
            if (torchEntity.entity) {
                this.player!.onPickup(torchEntity.type);
                this.level!.gentlyDestroyEntity(torchEntity.entity);
            }
        } else if (
            (aData.type === Config.Sentry.type && bData.type === Config.Sentry.type)
        ) {
            // TODO Handle a sentry hitting another sentry
        } else if (
            (aData.type === Config.Player.type && bData.type === Config.Anti.type) ||
            (aData.type === Config.Anti.type && bData.type === Config.Player.type)
        ) {
            const antiEntity: EntityUserData = aData?.type === Config.Anti.type ? aData : bData;
            if (antiEntity.entity) {
                this.player!.onPickup(antiEntity.type);
                this.level!.gentlyDestroyEntity(antiEntity.entity);
            }
        } else if (
            (aData.type === Config.Player.type && bData.type === Config.Switch.type) ||
            (aData.type === Config.Switch.type && bData.type === Config.Player.type)
        ) {
            const switchEntity: EntityUserData = aData?.type === Config.Switch.type ? aData : bData;
            if (switchEntity.entity && switchEntity.groupId !== undefined && switchEntity.groupId >= 0) {
                this.level!.onSwitchPressed(switchEntity.groupId);
            }
        }
    }

    private spawnEdgeImpactParticles(contact: planck.Contact): void {
        const manifold = contact.getManifold();
        if (manifold.pointCount <= 0) return;

        const worldManifold = contact.getWorldManifold(null);
        if (!worldManifold) return;

        for (let i = 0; i < manifold.pointCount; i++) {
            const point = worldManifold.points[i];
            ParticleEffectManager.instance.playEffect(
                this.preEntitiesContainer,
                "EdgeImpact",
                {
                    x: point.x * Config.PixelsPerMeter,
                    y: point.y * Config.PixelsPerMeter
                },
                5
            );
        }
    }
}
