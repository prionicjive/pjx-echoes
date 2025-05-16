import * as planck from 'planck';
import { Segment } from './types';

export interface CreateBodyOptions {
    type?: planck.BodyType; // 'static', 'dynamic', etc.
    position?: planck.Vec2;
    // Only one of box or circle should be provided
    box?: { width: number; height: number; center?: planck.Vec2; angle?: number };
    circle?: { radius: number; center?: planck.Vec2 };
    linearDamping?: number;
    fixture: planck.FixtureOpt;
    initialVelocity?: planck.Vec2;
}

interface CreateLevelEdgesBodyOptions {
    edges: Segment[];
    edgeFixture: planck.FixtureOpt;
}

export class PhysicsUtils {
     /**
     * Creates a Planck body with either a box or circle fixture.
     * Only one of `box` or `circle` should be provided in options.
     */
     static createBody(
        world: planck.World,
        options: CreateBodyOptions
    ): planck.Body {
        const body = world.createBody({
            type: options.type ?? 'static',
            position: options.position ?? new planck.Vec2(0, 0),
            linearDamping: options.linearDamping ?? 0
        });

        if (options.box) {
            body.createFixture(
                new planck.Box(
                    options.box.width / 2,
                    options.box.height / 2,
                    options.box.center ?? new planck.Vec2(options.box.width / 2, options.box.height / 2),
                    options.box.angle ?? 0
                ),
                options.fixture
            );
        } else if (options.circle) {
            body.createFixture(
                new planck.Circle(options.circle.radius),
                options.fixture
            );
        } else {
            throw new Error('Either box or circle options must be provided');
        }

        if (options.initialVelocity) {
            body.setLinearVelocity(options.initialVelocity);
        }

        return body;
    }

    static createLevelEdgesBody(
        world: planck.World,
        options: CreateLevelEdgesBodyOptions
    ): planck.Body {
        const body = world.createBody();
        options.edges.forEach(edge => {
            body.createFixture(new planck.Edge(edge.a, edge.b), options.edgeFixture);
        });    
        return body;
    }

    static createChainsBodyFromEdges(
        world: planck.World,
        options: CreateLevelEdgesBodyOptions
    ): planck.Body {
        const body = world.createBody();
    
        // Group edges into continuous chains
        const chains = this.groupEdgesIntoChains(options.edges);
    
        for (const chain of chains) {
            // Detect if closed (first and last points are equal)
            const isClosed = this.pointsEqual(chain[0], chain[chain.length - 1]);
            // Remove duplicate endpoint for closed loop (Planck expects N unique points)
            const vertices = isClosed ? chain.slice(0, -1) : chain;
            body.createFixture(planck.Chain(vertices, isClosed), options.edgeFixture);
        }
    
        return body;
    }

    
    static pointsEqual(a: planck.Vec2, b: planck.Vec2): boolean {
        const EPSILON = 1e-6;
        return Math.abs(a.x - b.x) < EPSILON && Math.abs(a.y - b.y) < EPSILON;
    }

    static groupEdgesIntoChains(
        edges: Segment[]
    ): planck.Vec2[][] {
        const unused = edges.slice();
        const chains: planck.Vec2[][] = [];

        while (unused.length > 0) {
            // Start a new chain with any edge
            const edge = unused.pop()!;
            let chain = [edge.a, edge.b];

            let extended = true;
            while (extended) {
                extended = false;
                for (let i = 0; i < unused.length; i++) {
                    const next = unused[i];
                    if (this.pointsEqual(chain[chain.length - 1], next.a)) {
                        chain.push(next.b);
                        unused.splice(i, 1);
                        extended = true;
                        break;
                    } else if (this.pointsEqual(chain[chain.length - 1], next.b)) {
                        chain.push(next.a);
                        unused.splice(i, 1);
                        extended = true;
                        break;
                    } else if (this.pointsEqual(chain[0], next.a)) {
                        chain.unshift(next.b);
                        unused.splice(i, 1);
                        extended = true;
                        break;
                    } else if (this.pointsEqual(chain[0], next.b)) {
                        chain.unshift(next.a);
                        unused.splice(i, 1);
                        extended = true;
                        break;
                    }
                }
            }
            chains.push(chain);
        }
        return chains;
    }

    static calculateForceVector(startPos: planck.Vec2, endPos: planck.Vec2, forceFactor: number = 1): planck.Vec2 {
        const normalizedVec = this.normalizeVector(new planck.Vec2(
            endPos.x - startPos.x, 
            endPos.y - startPos.y
        ));

        return new planck.Vec2(normalizedVec.x * forceFactor, normalizedVec.y * forceFactor);
    }

    static normalizeVector(vec: planck.Vec2): planck.Vec2 {
        const length = Math.hypot(vec.x, vec.y);
        return new planck.Vec2(vec.x / length, vec.y / length);
    }

    static randomUnitVector(minAngleFromAxis: number = 0.17): planck.Vec2 {
        // minAngleFromAxis in radians, default is about 10 degrees (Roughly .17 radians)
        // Ensures vector is not too close to horizontal or vertical axes
        while (true) {
            const angle = Math.random() * 2 * Math.PI;
            const angleMod = angle % (Math.PI / 2);
            if (
                angleMod > minAngleFromAxis &&
                angleMod < (Math.PI / 2) - minAngleFromAxis
            ) {
                return new planck.Vec2(Math.cos(angle), Math.sin(angle));
            }
            // Otherwise, re-roll!
        }
    }
}
