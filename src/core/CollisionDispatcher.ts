import planck from 'planck';
import * as PIXI from 'pixi.js';
import { AudioManager } from '../audio/AudioManager.ts';
import { Config } from '../config/Config.ts';
import { EntityUserData } from '../entities/BaseEntity.ts';
import { EntityType, BodyType } from '../entities/types.ts';
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
            (aData.type === EntityType.Player && bData.type === EntityType.Exit) ||
            (aData.type === EntityType.Exit && bData.type === EntityType.Player)
        ) {
            this.onLevelCompleted();
            this.onResetRequested();
        } else if (
            (aData.type === EntityType.Player && bData.type === BodyType.Edges) ||
            (aData.type === BodyType.Edges && bData.type === EntityType.Player)
        ) {
            this.playBump(contact);
            if (Config.Debug.showCollisionMarkers) {
                this.spawnEdgeImpactParticles(contact);
            }
        } else if (
            (aData.type === EntityType.Sentry && bData.type === BodyType.Edges) ||
            (aData.type === BodyType.Edges && bData.type === EntityType.Sentry)
        ) {
            if (Config.Debug.showCollisionMarkers) {
                this.spawnEdgeImpactParticles(contact);
            }
        } else if (
            (aData.type === EntityType.Player && bData.type === EntityType.Sentry) ||
            (aData.type === EntityType.Sentry && bData.type === EntityType.Player)
        ) {
            const sentryData: EntityUserData = aData?.type === EntityType.Sentry ? aData : bData;
            if (sentryData.entity) {
                AudioManager.instance.playSfx('sentry');
                this.player!.onPickup(sentryData.type);
                this.level!.gentlyDestroyEntity(sentryData.entity);
            }
            // Disable contact to prevent sentry from physically reacting with the player
            contact.setEnabled(false);
        } else if (
            (aData.type === EntityType.Player && bData.type === EntityType.Torch) ||
            (aData.type === EntityType.Torch && bData.type === EntityType.Player)
        ) {
            const torchEntity: EntityUserData = aData?.type === EntityType.Torch ? aData : bData;
            if (torchEntity.entity) {
                AudioManager.instance.playSfx('torch');
                this.player!.onPickup(torchEntity.type);
                this.level!.gentlyDestroyEntity(torchEntity.entity);
            }
        } else if (
            (aData.type === EntityType.Sentry && bData.type === EntityType.Sentry)
        ) {
            // TODO Handle a sentry hitting another sentry
        } else if (
            (aData.type === EntityType.Player && bData.type === EntityType.Anti) ||
            (aData.type === EntityType.Anti && bData.type === EntityType.Player)
        ) {
            const antiEntity: EntityUserData = aData?.type === EntityType.Anti ? aData : bData;
            if (antiEntity.entity) {
                AudioManager.instance.playSfx('anti');
                this.player!.onPickup(antiEntity.type);
                this.level!.gentlyDestroyEntity(antiEntity.entity);
            }
        } else if (
            (aData.type === EntityType.Player && bData.type === EntityType.Switch) ||
            (aData.type === EntityType.Switch && bData.type === EntityType.Player)
        ) {
            const switchEntity: EntityUserData = aData?.type === EntityType.Switch ? aData : bData;
            if (switchEntity.entity && switchEntity.groupId !== undefined && switchEntity.groupId >= 0) {
                AudioManager.instance.playSfx('switch');
                this.level!.onSwitchPressed(switchEntity.groupId);
            }
        }
    }

    /**
     * Wall-bump SFX. Begin-contact fires before the solver runs, so the player's velocity is
     * still the pre-impact one; the speed *into* the wall is |v · contact normal|, which keeps
     * grazing/sliding contacts quiet. AudioManager applies the speed threshold and throttle.
     */
    private playBump(contact: planck.Contact): void {
        const body = this.player?.body;
        if (!body) return;
        const velocity = body.getLinearVelocity();
        const normal = contact.getWorldManifold(null)?.normal;
        const impactSpeed = normal
            ? Math.abs(velocity.x * normal.x + velocity.y * normal.y)
            : velocity.length();
        AudioManager.instance.playBump(impactSpeed);
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
