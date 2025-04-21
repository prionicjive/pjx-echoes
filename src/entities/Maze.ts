import * as planck from 'planck-js';
import * as PIXI from 'pixi.js';

// TODO Figure out how to best centralize this
const PIXELS_PER_METER = 16;

export class Maze {
    private walls: { body: planck.Body, sprite: PIXI.Graphics }[]; // TODO Consider what happens when we move to sprite instead of PIXI.Graphics
    constructor(world: planck.World, stage: PIXI.Container, mazeLayout: { x: number, y: number, width: number, height: number }[]) {
        this.walls = [];

        mazeLayout.forEach(wallData => {
           // TODO Clean all of this up
            const { x, y, width, height, color } = wallData;
            const wallDataScreen = {
                x: x * PIXELS_PER_METER,
                y: y * PIXELS_PER_METER,
                width: width * PIXELS_PER_METER,
                height: height * PIXELS_PER_METER
            }

            const wallBody = world.createBody();
            // TODO Refer to echoes and Box2D docs on how to be set up the tiles, fixtures and such
            // TODO Do we need to dispose of bodies and fixtures?
            // TODO HOw do we flag these as static?
            const center = new planck.Vec2(x + width / 2, y + height / 2);
            wallBody.createFixture(new planck.Box(width / 2, height / 2, center, 0), {
              restitution: 0.95,
              friction: 0
            });

            const sprite = new PIXI.Graphics();
            sprite.beginFill(color).drawRect(wallDataScreen.x, wallDataScreen.y, wallDataScreen.width, wallDataScreen.height).endFill(); // TODO Fix deprecation
            sprite.x = wallBody.getPosition().x * PIXELS_PER_METER;
            sprite.y = wallBody.getPosition().y * PIXELS_PER_METER;
            stage.addChild(sprite);

            this.walls.push({ body: wallBody, sprite });
        });
    }

    update() {
        // TODO Read below...
        // If walls move (dynamic maze), update here.
        // Normally walls don't move, so you can leave this empty.
    }
}
