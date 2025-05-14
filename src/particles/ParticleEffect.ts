import { Color, Container, Sprite } from 'pixi.js';
import { Point } from '../utils/types';
import { MathUtils } from '../utils/MathUtils';

export interface ParticleEffectOptions {
    texturePath: string;
    maxParticles?: number;
    emitPerSecond?: number;
    duration?: number;
    emitAngle: number;
    spreadAmount: number;
    particleOptions: ParticleOptions;
}

// TODO Consider how to provide randomization for these values, in terms of min max ranges
interface ParticleOptions {
  maxAge: number;
  startAlpha: number;
  endAlpha: number;
  startScaleX: number;
  startScaleY: number;
  endScaleX: number;
  endScaleY: number;
  startTint: Color;
  endTint: Color;
  width: number;
  height: number;
  startSpeed: number;
  endSpeed: number;
  endDirection: {x: number, y: number };
}

interface Particle {
  sprite: Sprite;
  alive: boolean;
  age: number;
  maxAge: number; // TODO Store values within Particle that might be random per particle and can't just be referenced from ParticleOptions
  startDirection: {x: number, y: number };
  endDirection: {x: number, y: number };
  startSpeed: number;
  endSpeed: number;
  startScaleX: number;
  startScaleY: number;
  endScaleX: number;
  endScaleY: number;
  startAlpha: number;
  endAlpha: number;
  startTint: Color;
  endTint: Color;
  width: number;
  height: number;
}

export class ParticleEffect {
  
  private timeElapsed: number = 0;
  private accum: number = 0;
  public container: Container;
  public template: ParticleOptions;
  private particles: Particle[] = [];
  private maxParticles: number;
  private position: Point = { x: 0, y: 0 }; // TODO Make a Point?
  private numAliveParticles: number = 0;
  private emissionStopped: boolean = false;
  private emptyCallback?: () => void;

  // Behavioral properties of the effect
  private duration?: number;
  private emitPerSecond: number;
  private emitAngle: number;
  private spreadAmount: number;

  constructor(options: ParticleEffectOptions) {
    this.container = new Container();
    this.maxParticles = options.maxParticles ?? 100;
    this.template = {...options.particleOptions};

    this.emitPerSecond = options.emitPerSecond ?? 30;
    this.emitAngle = options.emitAngle ?? 0;
    this.spreadAmount = options.spreadAmount ?? 0;
    this.duration = options.duration;

    for (let i = 0; i < this.maxParticles; i++) {
      
      const sprite = Sprite.from(options.texturePath);
      sprite.visible = false;
      sprite.anchor.set(0.5); // TODO May we want a different anchor somepoint in the future?

      // Add our particle sprite to the container
      this.container.addChild(sprite);

      // Make a default particle, considering it will have its internals changed upon emission
      this.particles.push({
        sprite,
        alive: false,
        age: 0,
        maxAge: 0,
        startDirection: {x: 0, y: 0},
        endDirection: {x: 0, y: 0},
        startSpeed: 0,
        endSpeed: 0,
        startScaleX: 0,
        startScaleY: 0,
        endScaleX: 0,
        endScaleY: 0,
        startAlpha: 0,
        endAlpha: 0,
        startTint: new Color(),
        endTint: new Color(),
        width: 0,
        height: 0,
      });
    }

    // Start everything off by emitting a single particle
    // with the assumption that the emit per second really
    // wants something from the get-go
    this.accum = 1 / this.emitPerSecond;
  }

  setPosition(x: number, y: number): void {
    this.position.x = x;
    this.position.y = y;
  }

  update(dt: number): void {
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

    for (const particle of this.particles) {
      if (!particle.alive) continue;

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

      // Update alpha, scale and tint
      // TODO Change to leverage what might now exist at the particle level
      s.alpha = this.lerp(this.template.startAlpha, this.template.endAlpha, t);
      const scaleX = this.lerp(this.template.startScaleX, this.template.endScaleX, t);
      const scaleY = this.lerp(this.template.startScaleY, this.template.endScaleY, t);
      s.width = this.template.width * scaleX;
      s.height = this.template.height * scaleY;
      s.tint = this.lerpColor(this.template.startTint, this.template.endTint, t);
    }

    // If the emission has stopped and all particles are dead, call the callback
    if (this.emissionStopped && this.numAliveParticles === 0 && this.emptyCallback) {
      this.emptyCallback();
    }
  }

  destroy() {
    this.container.removeChildren();
    this.particles = [];

    // Do any other cleanup needed
  }

  /**
   * Set a callback to be called when all particles are dead.
   * @param callback The callback to be called when all particles are dead.
   */
  onEmpty(callback: () => void): void {
    this.emptyCallback = callback;
  }

  /**
   * Stop emission of new particles.
   */
  stopEmission(): void {
    this.emissionStopped = true;
    this.emitPerSecond = 0;
  }

  private _emitOne(): void {
    const particle = this.particles.find(p => !p.alive);
    if (!particle) return;

    // Ready the particle
    this.readyParticle(particle);
    this.numAliveParticles++;
  }

  private readyParticle(particle: Particle): void {
    particle.alive = true;
    particle.age = 0;

    // TODO Possibly randomize all the things?
    particle.maxAge = this.template.maxAge;

    const emitAngle = -MathUtils.getRandomAngleInSpread(MathUtils.degreesToRadians(this.emitAngle), MathUtils.degreesToRadians(this.spreadAmount));
    particle.startDirection = {x: Math.cos(emitAngle), y: Math.sin(emitAngle)};

    particle.endDirection = this.template.endDirection;
    particle.startSpeed = this.template.startSpeed;
    particle.endSpeed = this.template.endSpeed;

    particle.startScaleX = this.template.startScaleX;
    particle.startScaleY = this.template.startScaleY;

    particle.endScaleX = this.template.endScaleX;
    particle.endScaleY = this.template.endScaleY;

    particle.startAlpha = this.template.startAlpha;
    particle.endAlpha = this.template.endAlpha;

    particle.startTint = this.template.startTint;
    particle.endTint = this.template.endTint;

    particle.width = this.template.width;
    particle.height = this.template.height;

    // Init the sprite
    const s = particle.sprite;
    s.visible = true;

    // TODO Possibly randomize all the things?
    s.alpha = this.template.startAlpha;
    s.position.set(this.position.x, this.position.y);
    s.width = this.template.width * this.template.startScaleX;
    s.height = this.template.height * this.template.startScaleY;
    s.tint = this.template.startTint.toNumber();
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  private lerpColor(a: Color, b: Color, t: number): Color {
    // Get RGB values as [0, 1]
    const [ar, ag, ab] = a.toRgbArray();
    const [br, bg, bb] = b.toRgbArray();

    // Lerp each channel
    const r = this.lerp(ar, br, t);
    const g = this.lerp(ag, bg, t);
    const b_ = this.lerp(ab, bb, t);

    // Create new Color from lerped RGB
    return new Color([r, g, b_]);
  }
}
