import * as planck from 'planck';

export type Point = {
    x: number;
    y: number;
}

export type Segment = { 
    a: planck.Vec2; 
    b: planck.Vec2;
} 