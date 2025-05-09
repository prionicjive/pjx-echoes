import { Container, Sprite, Color } from 'pixi.js';

export interface ParticleEffectOptions {
    texturePath: string;
    maxParticles?: number;
    emitPerSecond?: number;
    particleOptions: ParticleOptions;
}

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
  startDirection: {x: number, y: number };
  endDirection: {x: number, y: number };
}

interface Particle {
  sprite: Sprite;
  alive: boolean;
  age: number;
  maxAge: number;

  // TODO May want to store more "over time" properties but for not, everything can be calculated on the fly
}

export class ParticleEffect {
  private emitPerSecond: number;
  private accum: number = 0;
  public container: Container;
  public template: ParticleOptions;
  private particles: Particle[] = [];
  private maxParticles: number;
  private emitPosition = { x: 0, y: 0 }; // TODO Make a Point?

  constructor(options: ParticleEffectOptions) {
    this.container = new Container();
    this.maxParticles = options.maxParticles ?? 100;
    this.emitPerSecond = options.emitPerSecond ?? 30;
    this.template = {...options.particleOptions};

    for (let i = 0; i < this.maxParticles; i++) {
      
      const sprite = Sprite.from(options.texturePath);
      sprite.visible = false;
      sprite.anchor.set(0.5); // TODO May we want a different anchor somepoint in the future?

      // Add our particle sprite to the container
      this.container.addChild(sprite);

      // TODO Consider options passed in, or have a factory of emitters that have their own options (And textures!) and single ask for one of those
      this.particles.push({
        sprite,
        alive: false,
        age: 0,
        maxAge: this.template.maxAge
      });
    }

    // Start everything off by emitting a single particle
    // with the assumption that the emit per second really
    // wants something from the get-go
    this.accum = 1 / this.emitPerSecond;
  }

  setEffectPosition(x: number, y: number): void {
    this.emitPosition.x = x;
    this.emitPosition.y = y;
  }

  update(dt: number): void {
    this.accum += dt;
    const emitInterval = 1 / this.emitPerSecond;

    while (this.accum >= emitInterval) {
      this.accum -= emitInterval;
      this._emitOne();
    }

    for (const particle of this.particles) {
      if (!particle.alive) continue;

      particle.age += dt;
      const t = particle.age / particle.maxAge;

      if (t >= 1) {
        particle.alive = false;
        particle.sprite.visible = false;
        continue;
      }

      const s = particle.sprite;

      // Lerp speed and direction
      const speed = this.lerp(this.template.startSpeed, this.template.endSpeed, t);
      const directionX = this.lerp(this.template.startDirection.x, this.template.endDirection.x, t);
      const directionY = this.lerp(this.template.startDirection.y, this.template.endDirection.y, t);

      // Update position based on most recent velocity
      s.x += directionX * speed * dt;
      s.y += directionY * speed * dt;

      // Update alpha, scale and tint
      s.alpha = this.lerp(this.template.startAlpha, this.template.endAlpha, t);
      const scaleX = this.lerp(this.template.startScaleX, this.template.endScaleX, t);
      const scaleY = this.lerp(this.template.startScaleY, this.template.endScaleY, t);
      s.width = this.template.width * scaleX;
      s.height = this.template.height * scaleY;
      s.tint = this.lerpColor(this.template.startTint, this.template.endTint, t);
    }
  }

  destroy() {
    this.container.removeChildren();
    this.particles = [];

    // Do any other cleanup needed
  }

  private _emitOne(): void {
    const particle = this.particles.find(p => !p.alive);
    if (!particle) return;

    // Reset living related things
    particle.alive = true;
    particle.age = 0;
    particle.maxAge = this.template.maxAge;

    // Init the sprite
    // TODO Make init function?
    const s = particle.sprite;
    s.visible = true;
    s.alpha = this.template.startAlpha;
    s.position.set(this.emitPosition.x, this.emitPosition.y);
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
