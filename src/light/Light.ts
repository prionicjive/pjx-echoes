import * as PIXI from 'pixi.js';
import gsap from 'gsap';
import { SpriteUtils } from '../utils/SpriteUtils';
import { Config } from '../config/Config';
import { GraphicsUtils } from '../utils/GraphicsUtils';
import { LightUtils } from '../utils/LightUtils';
import { CollisionUtils } from '../utils/CollisionUtils';
import { Point, Segment } from '../utils/types';
import { EntityUtils } from '../utils/EntityUtils';

export interface LightOptions {
    baseRadius: number;
    startColor: number;
    endColor: number;
    radiusVariance: number;
    baseAlpha: number;
    alphaVariance: number;
    numRays: number;

    // TODO Put properties for tween durations somewhere else?
    flickerAlphaDuration: number;
    flickerAlphaDurationVariance: number;
    flickerRadiusDuration?: number;
    flickerRadiusDurationVariance?: number;
    oscillateColorDuration: number;
    oscillateColorDurationVariance: number;
    oscillateColorDelay: number;
    oscillateColorDelayVariance: number;
}

/**
 * Base Light class. isFadingOut is true if the light is in the process of being faded out and destroyed.
 */
export class Light {
    /**
     * True if this light is currently fading out and should not be updated or rendered.
     */
    public isFadingOut: boolean = false;
    public sprite: PIXI.Sprite;
    public mask: PIXI.Graphics;
    protected pos: Point;
    public id: string = "";
    protected collisionData: Segment[];
    protected lightPoints: { point: Point; angle: number }[];

    // Hold config options to reference back to
    public options: LightOptions;

    // Key components that could possibly be modified
    public radius: number;
    protected alpha: number;
    protected tint: number;

    // Needed for tweens
    protected colorTween?: gsap.core.Tween;
    protected radiusTween?: gsap.core.Tween;
    protected alphaTween?: gsap.core.Tween;
    protected tweenables: { radius: number; tint: number; alpha: number };

    // Set to true whenever lightPoints changes; render() skips the polygon redraw when false
    protected isDirty: boolean = true;

    constructor(pos: Point, collisionData: Segment[], options: LightOptions) {
        if (new.target === Light) {
            throw new Error("Light cannot be instantiated directly");
        }

        // Validate input parameters
        if (!pos || typeof pos.x !== 'number' || typeof pos.y !== 'number') {
            throw new Error("Invalid position: pos must be a Point with x and y number properties");
        }
        
        if (!Array.isArray(collisionData)) {
            throw new Error("Invalid collisionData: must be an array of Segments");
        }
        
        if (!options || typeof options !== 'object') {
            throw new Error("Invalid options: must be a valid LightOptions object");
        }
        
        if (options.baseRadius <= 0 || !isFinite(options.baseRadius)) {
            throw new Error("Invalid baseRadius: must be a positive finite number");
        }
        
        if (options.baseAlpha < 0 || options.baseAlpha > 1 || !isFinite(options.baseAlpha)) {
            throw new Error("Invalid baseAlpha: must be between 0 and 1");
        }
        
        if (options.numRays <= 0 || !Number.isInteger(options.numRays)) {
            throw new Error("Invalid numRays: must be a positive integer");
        }

        this.pos = pos;
        this.collisionData = collisionData;
        this.lightPoints = [];
        this.options = options;

        this.radius = (this.options.baseRadius - this.options.radiusVariance) + (Math.random() * this.options.radiusVariance * 2); // Determine a radius based on config
        this.alpha = (this.options.baseAlpha - this.options.alphaVariance) + (Math.random() * this.options.alphaVariance * 2); // Determine a alpha based on config
        this.tint = this.options.startColor;

        // Set up the light sprite
        this.sprite = SpriteUtils.createSprite({
            texture: GraphicsUtils.getRadialGradientTexture(),
            anchor: { x: 0.5, y: 0.5 },
            width: this.radius * 2 * Config.PixelsPerMeter,
            height: this.radius * 2 * Config.PixelsPerMeter,
            x: this.pos.x * Config.PixelsPerMeter,
            y: this.pos.y * Config.PixelsPerMeter,
            blendMode: 'normal',
            color: options.startColor,
        });
            
        // Set up the light mask
        this.mask = new PIXI.Graphics();
        this.sprite.mask = this.mask;
    
        // Plain object used as tween target — avoids GSAP PixiPlugin detecting Light as a DisplayObject
        this.tweenables = { radius: this.radius, alpha: this.alpha, tint: this.tint };
        this.setupTweens();

        // Generated unique Id
        this.id = EntityUtils.generateRandomId("Light");

        // TODO Any additional setup / initialization
   };

   public setupTweens(): void { };

    // duration is accepted here for API compatibility with DynamicLight's override, but is not used
    // by the base class (StaticLight doesn't animate radius changes)
    public increaseBaseRadius(newRadius: number, maxRadius?: number, _duration?: number) {
        this.options.baseRadius = maxRadius !== undefined ? Math.min(newRadius, maxRadius) : newRadius;
    }

    public decreaseBaseRadius(newRadius: number, minRadius?: number, _duration?: number) {
        this.options.baseRadius = minRadius !== undefined ? Math.max(newRadius, minRadius) : newRadius;
    }
    
    public update(pos: Point | null): void {
        // Use the sprite's current position if no updated position is given
        if (pos && (this.pos.x !== pos.x || this.pos.y != pos.y)) {
            this.pos = {...pos};
        }

        // Copy tweened values back to properties (tweenables is a plain object — avoids PixiPlugin interference)
        this.radius = this.tweenables.radius;
        this.alpha = this.tweenables.alpha;
        this.tint = this.tweenables.tint;

        // Update light sprite to be under where the position is
        this.sprite.width = this.radius * 2 * Config.PixelsPerMeter;
        this.sprite.height = this.radius * 2 * Config.PixelsPerMeter;
        this.sprite.x = this.pos.x * Config.PixelsPerMeter;
        this.sprite.y = this.pos.y * Config.PixelsPerMeter;
        this.sprite.tint = this.tint;
        this.sprite.alpha = this.alpha;
    }

    public render() {
        if (!this.isDirty) return;
        this.isDirty = false;

        // Assume this.pos is the light's world position in meters
        const centerX = this.pos.x * Config.PixelsPerMeter;
        const centerY = this.pos.y * Config.PixelsPerMeter;

        // Draw mask
        this.mask.clear();

        if (this.lightPoints.length === 0) return;

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

    protected flickerAlpha(): void {
        if (this.alphaTween) {
            this.alphaTween.kill();
        }
        this.alphaTween = gsap.to(this.tweenables, {
            alpha: this.options.baseAlpha + Math.random() * this.options.alphaVariance,
            duration: this.options.flickerAlphaDuration + Math.random() * this.options.flickerAlphaDurationVariance,
            ease: 'power1.inOut',
            onComplete: () => this.flickerAlpha()
        });
    }

    protected oscillateColor(startColor: number, endColor: number): void {
        if (this.colorTween) {
            this.colorTween.kill();
        }
        this.colorTween = gsap.fromTo(this.tweenables, {
            tint: startColor,
        }, {
            duration: this.options.oscillateColorDuration + (Math.random() * this.options.oscillateColorDurationVariance),
            pixi: { tint: endColor },
            yoyo: true,
            delay: this.options.oscillateColorDelay + (Math.random() * this.options.oscillateColorDelayVariance),
            repeat: -1
        });
        this.colorTween.progress(Math.random());
    }

    public setCollisionData(edges: Segment[]) {
        this.collisionData = edges;
    }

    public destroy() {
        this.colorTween?.kill();
        this.radiusTween?.kill();
        this.alphaTween?.kill();
        this.mask?.destroy();
        this.sprite?.destroy();
    }

    public setPosition(pos: Point) {
        this.pos = {...pos};
    }

    public getPosition(): Point {
        return {...this.pos};
    }

    public getLightPoints(): { point: Point; angle: number }[] {
        return this.lightPoints;
    }
}

export class DynamicLight extends Light {
    // Tween for changing to a new base radius
    private changeRadiusTween?: gsap.core.Tween;

    constructor(
        pos: Point,
        collisionData: Segment[],
        options: LightOptions
    ) {
        super(pos, collisionData, options);
        // TODO Any additional setup / initialization
    }

    public setupTweens() {
        this.flickerAlpha();
        //this.flickerRadius();
        this.oscillateColor(this.options.startColor, this.options.endColor);      
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
        this.isDirty = true;
    }

    public increaseBaseRadius(newRadius: number, maxRadius?: number, duration: number = 0.5) {
        super.increaseBaseRadius(newRadius, maxRadius, duration);
        
        // Kill any previous change tweens
        if (this.changeRadiusTween) this.changeRadiusTween.kill();

        // Tween the baseRadius property
        this.changeRadiusTween = gsap.to(this.tweenables, {
            radius: this.options.baseRadius,
            duration,
            ease: "power1.out"
        });
    }

    public decreaseBaseRadius(newRadius: number, minRadius?: number, duration: number = 0.5) {
        super.decreaseBaseRadius(newRadius, minRadius, duration);

        // Kill any previous change tweens
        if (this.changeRadiusTween) this.changeRadiusTween.kill();

        // Tween the baseRadius property
        this.changeRadiusTween = gsap.to(this.tweenables, {
            radius: this.options.baseRadius,
            duration,
            ease: "power1.out"
        });
    }

    public destroy() {
        this.changeRadiusTween?.kill();
        super.destroy();
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
        
        // Ensure we always have at least some light points (fallback to circle)
        if (this.lightPoints.length === 0) {
            this.lightPoints = this.generateFallbackLightPoints(pos);
        }
        this.isDirty = true;
    }

    // Generate fallback light points as a circle when no intersections are found
    private generateFallbackLightPoints(pos: Point): { point: Point; angle: number }[] {
        const points: { point: Point; angle: number }[] = [];
        const numPoints = Math.min(this.options.numRays, 36); // Use fewer points for fallback
        
        for (let i = 0; i < numPoints; i++) {
            const angle = (i / numPoints) * Math.PI * 2;
            points.push({
                point: {
                    x: pos.x + Math.cos(angle) * this.radius,
                    y: pos.y + Math.sin(angle) * this.radius
                },
                angle: angle
            });
        }
        
        return points;
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

    public setupTweens() {
        this.flickerAlpha();
        this.oscillateColor(this.options.startColor, this.options.endColor);      
    }

}