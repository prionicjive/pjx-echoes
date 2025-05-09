import * as planck from 'planck';
import { BaseEntity } from './BaseEntity';

// TODO Could be refactored
export type EntityType = 'PLAYER' | 'SENTRY' | 'WALL' | 'FINISH' | 'TORCH' | 'FUEL';

export type EntityUserData = {
    type: EntityType;
    entity?: BaseEntity;
    body?: planck.Body;
}