import { Color, Container, Sprite } from 'pixi.js';
import { Point } from '../utils/types';
import { MathUtils } from '../utils/MathUtils';

export interface ParticleEffectOptions {
    texture: string;
    maxParticles?: number;
    emitPerSecond?: number;
    duration?: number;
    emitAngle: number;
    spreadAmount: number;
    emitRotationSpeed?: number;
    emitRotateClockwise?: boolean;
    particleOptions: ParticleOptions;
}

interface Variance {
    min?: number;
    max?: number;
    absolute?: boolean;
}

interface ParticleOptions {
    maxAge: number;
    maxAgeVariance?: Variance;
    startAlpha: number;
    startAlphaVariance?: Variance;
    endAlpha: number;
    endAlphaVariance?: Variance;
    startScaleX: number;
    startScaleXVariance?: Variance;
    startScaleY: number;
    startScaleYVariance?: Variance;
    endScaleX: number;
    endScaleXVariance?: Variance;
    endScaleY: number;
    endScaleYVariance?: Variance;
    startTint: Color;
    startTintVariance?: {
        r?: Variance;
        g?: Variance;
        b?: Variance;
    };
    endTint: Color;
    endTintVariance?: {
        r?: Variance;
        g?: Variance;
        b?: Variance;
    };
    width: number;
    widthVariance?: Variance;
    height: number;
    heightVariance?: Variance;
    startSpeed: number;
    startSpeedVariance?: Variance;
    endSpeed: number;
    endSpeedVariance?: Variance;
    endDirection: { x: number, y: number };
    endDirectionVariance?: {
        x?: Variance;
        y?: Variance;
    };
}

// Tint channels stored as pre-extracted [r, g, b] in [0, 1] range — avoids per-frame Color allocations
type RgbTuple = [number, number, number];

interface Particle {
    sprite: Sprite;
    alive: boolean;
    age: number;
    maxAge: number;
    startDirection: { x: number, y: number };
    endDirection: { x: number, y: number };
    startSpeed: number;
    endSpeed: number;
    startScaleX: number;
    startScaleY: number;
    endScaleX: number;
    endScaleY: number;
    startAlpha: number;
    endAlpha: number;
    startTint: RgbTuple;
    endTint: RgbTuple;
    width: number;
    height: number;
}

export class ParticleEffect {
    private _isPlaying: boolean = false;

    private timeElapsed: number = 0;
    private accum: number = 0;
    public container: Container;
    public template: ParticleOptions;
    private particlePool: Particle[] = [];
    private activeParticles: Set<Particle> = new Set();
    private maxParticles: number;
    private position: Point = { x: 0, y: 0 };
    private numAliveParticles: number = 0;
    private emissionStopped: boolean = false;
    private emptyCallback?: () => void;

    // Behavioral properties of the effect
    public duration?: number;
    private emitPerSecond: number;
    private emitAngle: number;
    private spreadAmount: number;
    private emitRotationSpeed: number;
    private emitRotateClockwise: boolean;

    constructor(options: ParticleEffectOptions) {
        this.container = new Container();
        this.maxParticles = options.maxParticles ?? 100;
        this.template = { ...options.particleOptions };

        this.emitPerSecond = options.emitPerSecond ?? 30;
        this.emitAngle = options.emitAngle ?? 0;
        this.spreadAmount = options.spreadAmount ?? 0;
        this.duration = options.duration;
        this.emitRotationSpeed = options.emitRotationSpeed ?? 0;
        this.emitRotateClockwise = options.emitRotateClockwise ?? true;

        for (let i = 0; i < this.maxParticles; i++) {

            const sprite = Sprite.from(options.texture);
            sprite.visible = false;
            sprite.anchor.set(0.5); // TODO May we want a different anchor somepoint in the future?

            // Add our particle sprite to the container
            this.container.addChild(sprite);

            // Make a default particle, considering it will have its internals changed upon emission
            this.particlePool.push({
                sprite,
                alive: false,
                age: 0,
                maxAge: 0,
                startDirection: { x: 0, y: 0 },
                endDirection: { x: 0, y: 0 },
                startSpeed: 0,
                endSpeed: 0,
                startScaleX: 0,
                startScaleY: 0,
                endScaleX: 0,
                endScaleY: 0,
                startAlpha: 0,
                endAlpha: 0,
                startTint: [0, 0, 0],
                endTint: [0, 0, 0],
                width: 0,
                height: 0,
            });
        }
    }

    setPosition(x: number, y: number): void {
        this.position.x = x;
        this.position.y = y;
    }

    play() {
      if (this._isPlaying) return;

      this._isPlaying = true;
      this.emissionStopped = false;
      this.timeElapsed = 0;

      // Start everything off by emitting a single particle
      // with the assumption that the emit per second really
      // wants something from the get-go
      this._emitOne();

      // Reset the accumulator to a random value between 0 and the emit interval
      // This staggers the emissions for multiple effects
      this.accum = Math.random() * (1 / this.emitPerSecond);
    }

    pause() {
        this._isPlaying = false;
    }

    stop() {
      // Stop the effect from playing
      this._isPlaying = false;

      // As a precaution, stop emission
      this.stopEmission();

      // Hide all active particles and mark them dead so the pool can reuse them
      this.activeParticles.forEach(particle => {
        particle.alive = false;
        particle.sprite.visible = false;
      });

      // Clear out the active particles
      this.activeParticles.clear();
      this.numAliveParticles = 0;
    }

    isPlaying(): boolean {
        return this._isPlaying;
    }

    update(dt: number): void {
        // If we're not playing, do nothing
        if (!this._isPlaying) return;
        
        // If there is a finite duration to be had, see if we've crossed that threshold and stop emission if need be
        if (this.duration !== undefined) {
            this.timeElapsed += dt;
            if (this.timeElapsed >= this.duration) {
                this.stopEmission();
            }
        }

        this.accum += dt;
        const emitInterval = 1 / this.emitPerSecond;

        // Keep emitting particles until told not to
        if (!this.emissionStopped) {
            while (this.accum >= emitInterval) {
                this.accum -= emitInterval;
                this._emitOne();
            }
        }

        // Update properties to the emitter itself

        // Rotate the emitter
        this.emitAngle += this.emitRotationSpeed * dt * (this.emitRotateClockwise ? 1 : -1);
        if (this.emitAngle > 360) {
            this.emitAngle -= 360;
        } else if (this.emitAngle < 0) {
            this.emitAngle += 360;
        }

        // For all active particles...
        for (const particle of this.activeParticles) {
            if (!particle.alive) {
              this.activeParticles.delete(particle);
              continue;
            }
            particle.age += dt;
            const t = particle.age / particle.maxAge;

            if (t >= 1) {
                particle.alive = false;
                this.numAliveParticles--;
                particle.sprite.visible = false;
                continue;
            }

            const s = particle.sprite;

            // Lerp speed and direction
            const speed = this.lerp(particle.startSpeed, particle.endSpeed, t);
            const directionX = this.lerp(particle.startDirection.x, particle.endDirection.x, t);
            const directionY = this.lerp(particle.startDirection.y, particle.endDirection.y, t);

            // Update position based on most recent velocity
            s.x += directionX * speed * dt;
            s.y += directionY * speed * dt;

            // Update alpha, scale and tint using per-particle variance values
            s.alpha = this.lerp(particle.startAlpha, particle.endAlpha, t);
            const scaleX = this.lerp(particle.startScaleX, particle.endScaleX, t);
            const scaleY = this.lerp(particle.startScaleY, particle.endScaleY, t);
            s.width = particle.width * scaleX;
            s.height = particle.height * scaleY;
            s.tint = this.lerpColor(particle.startTint, particle.endTint, t);
        }

        // If the emission has stopped and all particles are dead, call the callback
        if (this.emissionStopped && this.numAliveParticles === 0 && this.emptyCallback) {
            this.emptyCallback();
        }
    }

    destroy() {
      this.container.destroy({ children: true });
      this.particlePool = [];
      this.activeParticles.clear();
    }

    /**
     * Set a callback to be called when all particles are dead.
     * @param callback The callback to be called when all particles are dead.
     */
    onEmpty(callback: (() => void) | undefined): void {
        this.emptyCallback = callback;
    }

    /**
     * Stop emission of new particles.
     */
    stopEmission(): void {
        this.emissionStopped = true;
    }

    private _emitOne(): void {
        const particle = this.getNextParticle();
        if (!particle) {
          return;
        }

        // Ready the particle
        this.readyParticle(particle);
        this.numAliveParticles++;
    }

    private getNextParticle(): Particle | null {
      // Try to find a dead particle
      for (const p of this.particlePool) {
          if (!p.alive) {
              p.alive = true;
              this.activeParticles.add(p);
              return p;
          }
      }
      return null; // Pool exhausted
  }

    private readyParticle(particle: Particle): void {
        particle.alive = true;
        particle.age = 0;

        // Apply variance to particle properties
        particle.maxAge = this.applyVariance(this.template.maxAge, this.template.maxAgeVariance);

        const emitAngle = -MathUtils.getRandomAngleInSpread(
            MathUtils.degreesToRadians(this.emitAngle), 
            MathUtils.degreesToRadians(this.spreadAmount)
        );
        particle.startDirection = { x: Math.cos(emitAngle), y: Math.sin(emitAngle) };

        // Apply variance to end direction
        particle.endDirection = {
            x: this.applyVariance(this.template.endDirection.x, this.template.endDirectionVariance?.x),
            y: this.applyVariance(this.template.endDirection.y, this.template.endDirectionVariance?.y)
        };

        // Apply variance to speed
        particle.startSpeed = this.applyVariance(this.template.startSpeed, this.template.startSpeedVariance);
        particle.endSpeed = this.applyVariance(this.template.endSpeed, this.template.endSpeedVariance);

        // Apply variance to scale
        particle.startScaleX = this.applyVariance(this.template.startScaleX, this.template.startScaleXVariance);
        particle.startScaleY = this.applyVariance(this.template.startScaleY, this.template.startScaleYVariance);
        particle.endScaleX = this.applyVariance(this.template.endScaleX, this.template.endScaleXVariance);
        particle.endScaleY = this.applyVariance(this.template.endScaleY, this.template.endScaleYVariance);

        // Apply variance to alpha
        particle.startAlpha = this.applyVariance(this.template.startAlpha, this.template.startAlphaVariance);
        particle.endAlpha = this.applyVariance(this.template.endAlpha, this.template.endAlphaVariance);

        // Apply variance to tint — stored as [r, g, b] in [0, 1] to avoid per-frame Color allocations
        particle.startTint = this.applyColorVariance(this.template.startTint, this.template.startTintVariance);
        particle.endTint = this.applyColorVariance(this.template.endTint, this.template.endTintVariance);

        // Apply variance to dimensions
        particle.width = this.applyVariance(this.template.width, this.template.widthVariance);
        particle.height = this.applyVariance(this.template.height, this.template.heightVariance);

        // Init the sprite using the per-particle variance values computed above
        const s = particle.sprite;

        s.visible = true;
        s.alpha = particle.startAlpha;
        s.position.set(this.position.x, this.position.y);
        s.width = particle.width * particle.startScaleX;
        s.height = particle.height * particle.startScaleY;
        s.tint = this.packRgb(particle.startTint);
    }

    private applyVariance(base: number, variance?: Variance): number {
      if (!variance) return base;
      
      if (variance.absolute) {
          const min = variance.min ?? base;
          const max = variance.max ?? base;
          return MathUtils.getRandomFloat(min, max);
      } else {
          const min = variance.min ?? 1;
          const max = variance.max ?? 1;
          return base * MathUtils.getRandomFloat(min, max);
      }
    }

    /** Extracts [r, g, b] in [0, 1] range, applying per-channel variance. Called once at emit time. */
    private applyColorVariance(color: Color, variance?: { r?: Variance, g?: Variance, b?: Variance }): RgbTuple {
        const [r, g, b] = color.toRgbArray();
        return [
            this.applyVariance(r, variance?.r),
            this.applyVariance(g, variance?.g),
            this.applyVariance(b, variance?.b)
        ];
    }

    private lerp(a: number, b: number, t: number): number {
        return a + (b - a) * t;
    }

    /** Packs a [0, 1] RGB tuple into a 0xRRGGBB hex number. Clamps channels to [0, 1]. No allocation. */
    private packRgb([r, g, b]: RgbTuple): number {
        const ri = Math.round(Math.max(0, Math.min(1, r)) * 255);
        const gi = Math.round(Math.max(0, Math.min(1, g)) * 255);
        const bi = Math.round(Math.max(0, Math.min(1, b)) * 255);
        return (ri << 16) | (gi << 8) | bi;
    }

    /** Lerps two pre-extracted RGB tuples and returns a hex number. No allocation. */
    private lerpColor(a: RgbTuple, b: RgbTuple, t: number): number {
        const ri = Math.round(Math.max(0, Math.min(1, this.lerp(a[0], b[0], t))) * 255);
        const gi = Math.round(Math.max(0, Math.min(1, this.lerp(a[1], b[1], t))) * 255);
        const bi = Math.round(Math.max(0, Math.min(1, this.lerp(a[2], b[2], t))) * 255);
        return (ri << 16) | (gi << 8) | bi;
    }
}
