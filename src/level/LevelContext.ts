import { Segment } from '../utils/types';
import * as planck from 'planck';

export interface LevelContext {
    getEdgesList(): Segment[];
    getPhysicsWorld(): planck.World;
}