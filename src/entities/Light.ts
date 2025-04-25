import * as PIXI from 'pixi.js';
import gsap from 'gsap';
import { GraphicsUtils } from '../utils/GraphicsUtils';
import { Game } from '../core/Game';

export class Light {
    public radius: number;
    public sprite: PIXI.Sprite;
    public mask: PIXI.Graphics = new PIXI.Graphics();

    constructor(radius: number = 10) {
        this.radius = radius;
        this.sprite = new PIXI.Sprite(GraphicsUtils.getRadialGradientTexture());

        this.sprite.anchor.set(Game.Config.Wall.size / 2);
        this.sprite.width = this.radius * 2 * Game.Config.PixelsPerMeter;
        this.sprite.height = this.radius * 2 * Game.Config.PixelsPerMeter; 
        this.sprite.blendMode = 'add';
        this.sprite.tint = Game.Config.Light.defaultColor;

        this.mask = new PIXI.Graphics();
        this.sprite.mask = this.mask;

        this.flickerAlpha();
        this.flickerRadius();
        this.oscillateColor(Game.Config.Light.startColor, Game.Config.Light.endColor);      
    }

    // TODO Put in some other Light-related file / class
    flickerAlpha() {
        gsap.to(this.sprite, {
            alpha: 0.6 + Math.random() * 0.15,
            duration: 0.5 + Math.random() * 0.5,
            ease: 'power1.inOut',
            onComplete: () => this.flickerAlpha()
        });
    }
    
    // TODO Put in some other Light-related file / class
    flickerRadius() {
        gsap.to(this, {
            radius: 10 + Math.random() * 5, // TODO Make this better configurable
            duration: 1.5 + Math.random() * 0.5,
            ease: 'power1.inOut',
            onComplete: () => this.flickerRadius()
        });
    }

    // TODO Put in some other light-related file / class
    oscillateColor(startColor: number, endColor: number) {
        gsap.fromTo(this.sprite, {
            pixi: { tint: startColor},
        }, {
            duration: 2,
            pixi: { tint: endColor },
            yoyo: true,
            repeat: -1
        });
    }
}