import * as PIXI from 'pixi.js';
import gsap from 'gsap';
import { GraphicsUtils } from '../utils/GraphicsUtils';
import { Game } from '../core/Game';
import { LightUtils } from '../utils/LightUtils';
import { CollisionUtils } from '../utils/CollisionUtils';
import { Point, Segment } from '../utils/types';

export interface LightOptions {
    radius: number; // TODO BAD PRACTICE - We are setting and using this directly, SHOULD be a radius property on the Light object
    startColor: number;
    endColor: number;
    radiusVariance: number;
    alpha: number;
    alphaVariance: number;
    numRays: number;
}

export interface Light {
    sprite: PIXI.Sprite;
    mask: PIXI.Graphics;
    update: (pos: Point | null) => void;
    render: () => void;
}

export class DynamicLight implements Light {
    public sprite: PIXI.Sprite;
    public mask: PIXI.Graphics = new PIXI.Graphics();
    
    // Hidden privates
    private _collisionData: Segment[] = [];
    // TODO Do in conjunction with a static flag and compute on initial light creation
    private _cachedLightPoints: { point: Point; angle: number }[] = [];
    private options: LightOptions;

    // TODO There's gotta be a better way to have default / starting values that might be tweened
    private defaultRadius: number = 1;
    private defaultAlpha: number = 1;

    constructor(pos: Point, collisionData: Segment[],options: LightOptions) {
        this.options = options;
        this._collisionData = collisionData;

        // TODO better way to store default / starting values that could be tweened
        this.defaultRadius = options.radius;
        this.defaultAlpha = options.alpha;

        this.sprite = new PIXI.Sprite(GraphicsUtils.getRadialGradientTexture());

        // TODO Better way to calculate anchor?
        this.sprite.anchor.set(Game.Config.Wall.size / 2);
        this.sprite.width = this.options.radius * 2 * Game.Config.PixelsPerMeter;
        this.sprite.height = this.options.radius * 2 * Game.Config.PixelsPerMeter; 
        this.sprite.x = pos.x * Game.Config.PixelsPerMeter;
        this.sprite.y = pos.y * Game.Config.PixelsPerMeter;
        this.sprite.blendMode = 'add';
        this.sprite.tint = options.startColor;

        this.mask = new PIXI.Graphics();
        this.sprite.mask = this.mask;

        this.flickerAlpha();
        this.flickerRadius();
        this.oscillateColor(this.options.startColor, this.options.endColor);      
    }

    update(pos: Point | null = null) {
        let posToUse: Point | null = pos;

        // Use the sprite's current position if no updated position is given
        if (!posToUse) {
            posToUse = { 
                x: this.sprite.x / Game.Config.PixelsPerMeter,
                y: this.sprite.y / Game.Config.PixelsPerMeter
            };
        }

        const lightBounds = {
            minX: posToUse.x - this.options.radius,
            maxX: posToUse.x + this.options.radius,
            minY: posToUse.y - this.options.radius,
            maxY: posToUse.y + this.options.radius,
          };

        // Build out the light points in world space (Meters)
        // TODO For a static light (Radius doesn't change), figure out where best to one time precompute this and make update a no-opt for a "static" light
        const nearbyEdges = this._collisionData.filter(seg => CollisionUtils.isSegmentInBounds(seg, lightBounds));
        this._cachedLightPoints = LightUtils.buildLightPolygon(posToUse, nearbyEdges, this.options.numRays, this.options.radius);

        // Update light sprite to be under where the player
        this.sprite.width = this.options.radius * 2 * Game.Config.PixelsPerMeter;
        this.sprite.height = this.options.radius * 2 * Game.Config.PixelsPerMeter;
        this.sprite.x = posToUse.x * Game.Config.PixelsPerMeter;
        this.sprite.y = posToUse.y * Game.Config.PixelsPerMeter;
    }

    render() {
        // Draw mask
        this.mask.clear();

        this.mask.moveTo(this.sprite.x, this.sprite.y);
        for (const pt of this._cachedLightPoints) {
            this.mask.lineTo(pt.point.x * Game.Config.PixelsPerMeter, pt.point.y * Game.Config.PixelsPerMeter);
        }

        this.mask.lineTo(this._cachedLightPoints[0].point.x * Game.Config.PixelsPerMeter, this._cachedLightPoints[0].point.y * Game.Config.PixelsPerMeter);
        this.mask.fill();
    }

    // TODO Put in some other Light-related file / class
    flickerAlpha() {
        gsap.to(this.sprite, {
            pixi: {
                alpha: this.defaultAlpha + Math.random() * this.options.alphaVariance
            },
            duration: 0.5 + Math.random() * 2.5,
            ease: 'power1.inOut',
            onComplete: () => this.flickerAlpha()
        });
    }

    // TODO Put in some other Light-related file / class
    flickerRadius() {
        gsap.to(this.options, {
            radius: this.defaultRadius + Math.random() * this.options.radiusVariance, 
            duration: 1.5 + Math.random() * 0.5,
            ease: 'power1.inOut',
            onComplete: () => this.flickerRadius()
        });
    }

    // TODO Put in some other light-related file / class
    oscillateColor(startColor: number, endColor: number) {
        const tween =gsap.fromTo(this.sprite, {
            pixi: { tint: startColor},
        }, {
            duration: 1.5 + (Math.random() * 2),
            pixi: { tint: endColor },
            yoyo: true,
            delay: Math.random() * 2,
            repeat: -1
        });

        // Randomize the starting point
        tween.progress(Math.random());
    }
}