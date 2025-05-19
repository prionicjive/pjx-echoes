import * as planck from 'planck';

export class PhysicsManager {
    private world: planck.World;
    private bodiesToDestroy: planck.Body[] = [];

    constructor(world: planck.World) {
        this.world = world;
    }

    createBody(...args: Parameters<planck.World['createBody']>): planck.Body {
        return this.world.createBody(...args);
    }

    // TODO Add other world methods you need to expose

    destroyBody(body: planck.Body) {
        this.bodiesToDestroy.push(body);
    }

    update() {
        this.processPendingDestructions();
    }

    destroy() {
        // First, process all pending destructions
        this.processPendingDestructions();
        
        // Destory ALL remaining bodies in the world
        let body = this.world!.getBodyList();
        let counter = 0;
        while (body) {
            const nextBody = body.getNext();
            this.world!.destroyBody(body);
            counter++;
            body = nextBody;
        }
        this.bodiesToDestroy = [];
    }

    private processPendingDestructions() {
        // Process all pending destructions
        while (this.bodiesToDestroy.length > 0) {
            const body = this.bodiesToDestroy.pop()!;
            if (body && body.getWorld() === this.world) {
                this.world.destroyBody(body);
            }
        }
    }
}