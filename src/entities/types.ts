import * as planck from 'planck';
import { BaseEntity } from './BaseEntity';

export type EntityType = 'PLAYER' | 'SENTRY' | 'WALL' | 'FINISH_AREA' | 'TORCH' | 'Anti';

export interface EntityUserData {
    type: EntityType;
    entity?: BaseEntity;
    body?: planck.Body;
}