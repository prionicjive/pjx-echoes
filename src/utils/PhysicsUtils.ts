import * as planck from 'planck';
import { Segment } from './types';

interface CreateBodyOptions {
    type?: planck.BodyType; // 'static', 'dynamic', etc.
    position: planck.Vec2;
    // Only one of box or circle should be provided
    box?: { width: number; height: number; center?: planck.Vec2; angle?: number };
    circle?: { radius: number; center?: planck.Vec2 };
    linearDamping?: number;
    fixture: planck.FixtureOpt;
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
            position: options.position,
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

    static randomUnitVector(): planck.Vec2 {
        const angle = Math.random() * 2 * Math.PI;
        return new planck.Vec2(Math.cos(angle), Math.sin(angle));
    }
}
