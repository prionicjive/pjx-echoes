import { Container, Sprite, Texture, Color } from 'pixi.js';
import { Config } from '../core/Config.ts';

interface ParticleOptions {
  sprite: Sprite;
  alive: boolean;
  life: number;
  maxLife: number;
  velocity: { x: number; y: number };
  startAlpha: number;
  endAlpha: number;
  startScale: number;
  endScale: number;
  startTint: Color;
  endTint: Color;
  width: number;
  height: number;
}

export class ParticleEmitter {
  
  private emitPerSecond: number;
  private accum: number = 0;
public container: Container;
  private particles: ParticleOptions[] = [];
  private maxParticles: number;
  private emitPosition = { x: 0, y: 0 }; // TODO Make a Point?

  constructor(texture: Texture, maxParticles = 100, emitPerSecond = 30) {
    this.container = new Container();
    this.maxParticles = maxParticles;
    this.emitPerSecond = emitPerSecond;

    for (let i = 0; i < this.maxParticles; i++) {
      
      const sprite = Sprite.from(texture);
      sprite.visible = false;
      sprite.width = Config.Particle.width * Config.PixelsPerMeter; // TODO Configure this!
      sprite.height = Config.Particle.height * Config.PixelsPerMeter; // TODO Configure this!
      sprite.anchor.set(0.5);

      // Add our particle sprite to the container
      this.container.addChild(sprite);

      // TODO Consider options passed in, or have a factory of emitters that have their own options (And textures!) and single ask for one of those
      this.particles.push({
        sprite,
        alive: false,
        life: 0,
        width: Config.Particle.width * Config.PixelsPerMeter, // TODO Best to go here?
        height: Config.Particle.height * Config.PixelsPerMeter, // TODO Best to go here?
        maxLife: 2,
        velocity: { x: 0, y: 0 },
        startAlpha: 1,
        endAlpha: 0,
        startScale: 1, // TODO Use to lerp width and height
        endScale: 0.42,
        startTint: new Color(Config.Player.color),
        endTint: new Color(0xff13bb) // TODO Just for test, should be configurable
      });
    }
  }

  setEmitPosition(x: number, y: number): void {
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

    for (const meta of this.particles) {
      if (!meta.alive) continue;

      meta.life += dt;
      const t = meta.life / meta.maxLife;

      if (t >= 1) {
        meta.alive = false;
        meta.sprite.visible = false;
        continue;
      }

      const s = meta.sprite;

      s.x += meta.velocity.x * dt;
      s.y += meta.velocity.y * dt;

      s.alpha = this.lerp(meta.startAlpha, meta.endAlpha, t);
      const scale = this.lerp(meta.startScale, meta.endScale, t);
      s.width = meta.width * scale;
      s.height = meta.height * scale;

        s.tint = this.lerpColor(meta.startTint, meta.endTint, t);
    }
  }

  private _emitOne(): void {
    const meta = this.particles.find(p => !p.alive);
    if (!meta) return;

    // Reset living related things
    meta.alive = true;
    meta.life = 0;

    // Init the sprite
    // TODO Make init function?
    const s = meta.sprite;
    s.visible = true;
    s.alpha = meta.startAlpha;
    s.scale.set(meta.startScale);
    s.position.set(this.emitPosition.x, this.emitPosition.y);
    s.width = meta.width * meta.startScale;
    s.height = meta.height * meta.startScale;
    s.tint = meta.startTint.toNumber();
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

lerpColor(a: Color, b: Color, t: number): Color {
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
