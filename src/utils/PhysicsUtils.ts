import * as planck from 'planck';
import { Segment } from './types';
;
interface CreateBoxBodyOptions {
    type?: planck.BodyType;
    position: planck.Vec2;
    box: { width: number; height: number; center?: planck.Vec2; angle?: number };
    fixture: planck.FixtureOpt;
}

interface CreateLevelEdgesBodyOptions {
    edges: Segment[];
    edgeFixture: planck.FixtureOpt;
}

export class PhysicsUtils {
    static createBoxBody(
        world: planck.World,
        options: CreateBoxBodyOptions
    ): planck.Body {
        const body = world.createBody({
            type: options.type ?? 'static',
            position: options.position
        });
        body.createFixture(
            new planck.Box(
                options.box.width / 2,
                options.box.height / 2,
                options.box.center ?? new planck.Vec2(options.box.width / 2, options.box.height / 2),
                options.box.angle ?? 0
            ),
            options.fixture
        );
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
