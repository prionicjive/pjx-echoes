import * as PIXI from 'pixi.js';
import gsap from 'gsap';
import { GraphicsUtils } from '../utils/GraphicsUtils';
import { Config } from '../core/Config';
import { LightUtils } from '../utils/LightUtils';
import { CollisionUtils } from '../utils/CollisionUtils';
import { Point, Segment } from '../utils/types';

export interface LightOptions {
    baseRadius: number; // TODO BAD PRACTICE - We are setting and using this directly, SHOULD be a radius property on the Light object
    startColor: number;
    endColor: number;
    radiusVariance: number;
    baseAlpha: number;
    alphaVariance: number;
    numRays: number;
}

export abstract class Light {
    public sprite: PIXI.Sprite;
    public mask: PIXI.Graphics;
    public pos: Point;
    protected collisionData: Segment[];
    protected lightPoints: { point: Point; angle: number }[];

    // Hold config options to reference back to
    protected options: LightOptions;

    // Key components that could possibly be modified
    public radius: number;
    protected alpha: number;
    protected tint: number;

    constructor(pos: Point, collisionData: Segment[], options: LightOptions) {
        if (new.target === Light) {
            throw new Error("Light cannot be instantiated directly");
        }

        this.pos = pos;
        this.collisionData = collisionData;
        this.lightPoints = [];
        this.options = options;

        this.radius = (this.options.baseRadius - this.options.radiusVariance) + (Math.random() * this.options.radiusVariance * 2); // Determine a radius based on config
        this.alpha = (this.options.baseAlpha - this.options.alphaVariance) + (Math.random() * this.options.alphaVariance * 2); // Determine a alpha based on config
        this.tint = this.options.startColor;

        // Set up the light sprite
        this.sprite = new PIXI.Sprite(GraphicsUtils.getRadialGradientTexture());
        this.sprite.anchor.set(Config.Wall.size / 2);
        this.sprite.width = this.radius * 2 * Config.PixelsPerMeter;
        this.sprite.height = this.radius * 2 * Config.PixelsPerMeter; 
        this.sprite.x = this.pos.x * Config.PixelsPerMeter;
        this.sprite.y = this.pos.y * Config.PixelsPerMeter;
        this.sprite.blendMode = 'normal';
        this.sprite.tint = options.startColor;

        // Set up the light mask
        this.mask = new PIXI.Graphics();
        this.sprite.mask = this.mask;
    }
    
    public update(pos: Point | null): void {
        // Use the sprite's current position if no updated position is given
        if (pos && (this.pos.x !== pos.x || this.pos.y != pos.y)) {
            this.pos = {...pos};
        }

        // Update light sprite to be under where the position is
        this.sprite.width = this.radius * 2 * Config.PixelsPerMeter;
        this.sprite.height = this.radius * 2 * Config.PixelsPerMeter;
        this.sprite.x = this.pos.x * Config.PixelsPerMeter;
        this.sprite.y = this.pos.y * Config.PixelsPerMeter;
        this.sprite.tint = this.tint;
        this.sprite.alpha = this.alpha;
    }

    public render() {
        // Assume this.pos is the light's world position in meters
        const centerX = this.pos.x * Config.PixelsPerMeter;
        const centerY = this.pos.y * Config.PixelsPerMeter;

        // Draw mask
        this.mask.clear();

        this.mask.moveTo(0, 0);
        for (const pt of this.lightPoints) {
            this.mask.lineTo((pt.point.x * Config.PixelsPerMeter) - centerX, (pt.point.y * Config.PixelsPerMeter) - centerY);
        }

        this.mask.lineTo(
            (this.lightPoints[0].point.x * Config.PixelsPerMeter) - centerX, 
            (this.lightPoints[0].point.y * Config.PixelsPerMeter) - centerY
        );
        this.mask.fill();
    };

    public setCollisionData(edges: Segment[]) {
        this.collisionData = edges;
    }
}

export class DynamicLight extends Light {
    constructor(pos: Point, collisionData: Segment[],options: LightOptions) {;
        super(pos, collisionData, options);

        // TODO Any additional setup / initialization
    }

    public update(pos: Point | null = null) {
        super.update(pos);

        const lightBounds = {
            minX: this.pos.x - this.radius,
            maxX: this.pos.x + this.radius,
            minY: this.pos.y - this.radius,
            maxY: this.pos.y + this.radius,
          };

        // Build out the light points in world space (Meters)
        // TODO For a static light (Radius doesn't change), figure out where best to one time precompute this and make update a no-opt for a "static" light
        const nearbyEdges = this.collisionData.filter(seg => CollisionUtils.isSegmentInBounds(seg, lightBounds));
        this.lightPoints = LightUtils.buildLightPolygon(this.pos, nearbyEdges, this.options.numRays, this.radius);
    }
}

export class StaticLight extends Light {
     // This is needed to keep track of the position in case it itself hasn't changed but radius or collision data has, 
    // which would be used to invalidate and regenerate the light points
    private lastPos: Point;
   
    constructor(pos: Point, collisionData: Segment[], options: LightOptions) {
        super(pos, collisionData, options);

        // Set up values we assume will RARELY change
        this.lastPos = pos;

        // Compute the light points that should rarely change
        this.computeLightPoints(pos);
    }

    // Compute the light polygon only once, or if forced
    private computeLightPoints(pos: Point) {
        const lightBounds = {
            minX: pos.x - this.radius,
            maxX: pos.x + this.radius,
            minY: pos.y - this.radius,
            maxY: pos.y + this.radius,
          };

        // Build out the light points in world space (Meters)
        const nearbyEdges = this.collisionData.filter(seg => CollisionUtils.isSegmentInBounds(seg, lightBounds));
        this.lightPoints = LightUtils.buildLightPolygon(pos, nearbyEdges, this.options.numRays, this.radius);
    }

    public update(pos: Point | null = null) {
        super.update(pos);
    }

    // Optionally, allow manual recomputation if needed
    public recomputeLightPoints(pos?: Point, collisionData?: Segment[], radius?: number) {
        // Update sprite position if new position is provided
        if (pos) {
            this.pos = {...pos };
            this.lastPos = { ...pos };
            this.sprite.x = pos.x * Config.PixelsPerMeter;
            this.sprite.y = pos.y * Config.PixelsPerMeter;
        }

        // If collision data of the world has changed, update it
        if (collisionData) {
            this.collisionData = collisionData;
        }

        // If radius has changed, adjust the sprite
        if (radius !== undefined) {
            this.radius = radius;
            this.sprite.width = this.radius * 2 * Config.PixelsPerMeter;
            this.sprite.height = this.radius * 2 * Config.PixelsPerMeter;
        }
        
        // Compute the light points once again
        this.computeLightPoints(this.lastPos);
    }
}

export class PlayerLight extends DynamicLight {
    // Needed for tweens
    private colorTween?: gsap.core.Tween;
    private radiusTween?: gsap.core.Tween;
    private alphaTween?: gsap.core.Tween;
    private tweenables: { radius: number, tint: number, alpha: number };
    
    constructor(pos: Point, collisionData: Segment[],options: LightOptions) {;
        super(pos, collisionData, options);

        // Set up tweenable properties
        this.tweenables = {
            radius: this.radius,
            alpha: this.alpha,
            tint: this.tint
        };
        this.setupTweens();
    }

    private setupTweens() {
        this.flickerAlpha();
        this.flickerRadius();
        this.oscillateColor(this.options.startColor, this.options.endColor);      
    }

    public update(pos: Point | null = null) {
        // Update with tweenable values
        this.radius = this.tweenables.radius;
        this.alpha = this.tweenables.alpha;
        this.tint = this.tweenables.tint;

        super.update(pos);
    }

    private flickerAlpha() {
        // Kill any previous tweens
        if (this.alphaTween) {
            this.alphaTween.kill();
        }

        this.alphaTween = gsap.to(this.tweenables, {
            alpha: this.options.baseAlpha + Math.random() * this.options.alphaVariance,
            duration: 0.5 + Math.random() * 2.5,
            ease: 'power1.inOut',
            onComplete: () => this.flickerAlpha()
        });
    }

    // TODO Put in some other Light-related file / class
    private flickerRadius() {
        // Kill any previous tweens
        if (this.radiusTween) {
            this.radiusTween.kill();
        }

        this.radiusTween = gsap.to(this.tweenables, {
            radius: this.options.baseRadius + Math.random() * this.options.radiusVariance, 
            duration: 1.5 + Math.random() * 0.5,
            ease: 'power1.inOut',
            onComplete: () => this.flickerRadius()
        });
    }

    // TODO Put in some other light-related file / class
    private oscillateColor(startColor: number, endColor: number) {
        // Kill any previous tweens
        if (this.colorTween) {
            this.colorTween.kill();
        }

        this.colorTween = gsap.fromTo(this.tweenables, {
            tint: startColor,
        }, {
            duration: 1.5 + (Math.random() * 2),
            pixi: { tint: endColor }, // Use PIXI plugin for smoother color change
            yoyo: true,
            delay: Math.random() * 2,
            repeat: -1
        });

        // Randomize the starting point
        this.colorTween.progress(Math.random());
    }
}

export class TorchLight extends StaticLight {
    // Needed for tweens
    private colorTween?: gsap.core.Tween;
    private alphaTween?: gsap.core.Tween;
    private tweenables: { tint: number, alpha: number };
    
    constructor(pos: Point, collisionData: Segment[],options: LightOptions) {;
        super(pos, collisionData, options);

        // Set up tweenable properties
        this.tweenables = {
            alpha: this.alpha,
            tint: this.tint
        };
        this.setupTweens();
    }

    protected setupTweens() {
        this.flickerAlpha();
        this.oscillateColor(this.options.startColor, this.options.endColor);      
    }

    public update(pos: Point | null = null) {
        // Update with tweenable values
        this.alpha = this.tweenables.alpha;
        this.tint = this.tweenables.tint;

        super.update(pos);
    }

    private flickerAlpha() {
        // Kill any previous tweens
        if (this.alphaTween) {
            this.alphaTween.kill();
        }

        this.alphaTween = gsap.to(this.tweenables, {
            alpha: this.options.baseAlpha + Math.random() * this.options.alphaVariance,
            duration: 0.5 + Math.random() * 2.5,
            ease: 'power1.inOut',
            onComplete: () => this.flickerAlpha()
        });
    }

    private oscillateColor(startColor: number, endColor: number) {
        // Kill any previous tweens
        if (this.colorTween) {
            this.colorTween.kill();
        }

        this.colorTween = gsap.fromTo(this.tweenables, {
            tint: startColor,
        }, {
            duration: 1.5 + (Math.random() * 2),
            pixi: { tint: endColor }, // Use PIXI plugin for smoother color change
            yoyo: true,
            delay: Math.random() * 2,
            repeat: -1
        });

        // Randomize the starting point
        this.colorTween.progress(Math.random());
    }
}

export class FinishLight extends StaticLight {
    // Needed for tweens
    private colorTween?: gsap.core.Tween;
    private alphaTween?: gsap.core.Tween;
    private tweenables: { tint: number, alpha: number };
    
    constructor(pos: Point, collisionData: Segment[],options: LightOptions) {;
        super(pos, collisionData, options);

        // Set up tweenable properties
        this.tweenables = {
            alpha: this.alpha,
            tint: this.tint
        };
        this.setupTweens();
    }

    protected setupTweens() {
        this.flickerAlpha();
        this.oscillateColor(this.options.startColor, this.options.endColor);      
    }

    public update(pos: Point | null = null) {
        // Update with tweenable values
        this.alpha = this.tweenables.alpha;
        this.tint = this.tweenables.tint;

        super.update(pos);
    }

    private flickerAlpha() {
        // Kill any previous tweens
        if (this.alphaTween) {
            this.alphaTween.kill();
        }

        this.alphaTween = gsap.to(this.tweenables, {
            alpha: this.options.baseAlpha + Math.random() * this.options.alphaVariance,
            duration: 0.5 + Math.random() * 2.5,
            ease: 'power1.inOut',
            onComplete: () => this.flickerAlpha()
        });
    }

    private oscillateColor(startColor: number, endColor: number) {
        // Kill any previous tweens
        if (this.colorTween) {
            this.colorTween.kill();
        }

        this.colorTween = gsap.fromTo(this.tweenables, {
            tint: startColor,
        }, {
            duration: 1.5 + (Math.random() * 2),
            pixi: { tint: endColor }, // Use PIXI plugin for smoother color change
            yoyo: true,
            delay: Math.random() * 2,
            repeat: -1
        });

        // Randomize the starting point
        this.colorTween.progress(Math.random());
    }
}


export class FuelLight extends StaticLight {
    // Needed for tweens
    private colorTween?: gsap.core.Tween;
    private alphaTween?: gsap.core.Tween;
    private tweenables: { tint: number, alpha: number };
    
    constructor(pos: Point, collisionData: Segment[],options: LightOptions) {;
        super(pos, collisionData, options);

        // Set up tweenable properties
        this.tweenables = {
            alpha: this.alpha,
            tint: this.tint
        };
        this.setupTweens();
    }

    protected setupTweens() {
        this.flickerAlpha();
        this.oscillateColor(this.options.startColor, this.options.endColor);      
    }

    public update(pos: Point | null = null) {
        // Update with tweenable values
        this.alpha = this.tweenables.alpha;
        this.tint = this.tweenables.tint;

        super.update(pos);
    }

    private flickerAlpha() {
        // Kill any previous tweens
        if (this.alphaTween) {
            this.alphaTween.kill();
        }

        this.alphaTween = gsap.to(this.tweenables, {
            alpha: this.options.baseAlpha + Math.random() * this.options.alphaVariance,
            duration: 0.5 + Math.random() * 2.5,
            ease: 'power1.inOut',
            onComplete: () => this.flickerAlpha()
        });
    }

    private oscillateColor(startColor: number, endColor: number) {
        // Kill any previous tweens
        if (this.colorTween) {
            this.colorTween.kill();
        }

        this.colorTween = gsap.fromTo(this.tweenables, {
            tint: startColor,
        }, {
            duration: 0.5 + (Math.random() * 3),
            pixi: { tint: endColor }, // Use PIXI plugin for smoother color change
            yoyo: true,
            delay: Math.random() * 1,
            repeat: -1
        });

        // Randomize the starting point
        this.colorTween.progress(Math.random());
    }
}