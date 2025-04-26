import * as PIXI from 'pixi.js';
import gsap from 'gsap';
import { GraphicsUtils } from '../utils/GraphicsUtils';
import { Game } from '../core/Game';
import { LightUtils } from '../utils/LightUtils';
import { CollisionUtils } from '../utils/CollisionUtils';
import { Point, Segment } from '../utils/types';

export interface LightOptions {
    radius: number;
    startColor: number;
    endColor: number;
    radiusVariance: number;
    alpha: number;
    alphaVariance: number;
    numRays: number;
}

export class Light {
    public sprite: PIXI.Sprite;
    public mask: PIXI.Graphics = new PIXI.Graphics();
    private options: LightOptions;

    // TODO There's gotta be a better way to have default / starting values that might be tweened
    private defaultRadius: number = 1;

    constructor(pos: Point, options: LightOptions) {
        this.options = options;
        this.defaultRadius = options.radius;

        this.sprite = new PIXI.Sprite(GraphicsUtils.getRadialGradientTexture());

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

    updateAndRender(pos: Point, allEdges: Segment[]) {
        const lightBounds = {
            minX: pos.x - this.options.radius,
            maxX: pos.x + this.options.radius,
            minY: pos.y - this.options.radius,
            maxY: pos.y + this.options.radius,
          };

        // Build out the light points in world space (Meters)
        const nearbyEdges = allEdges.filter(seg => CollisionUtils.isSegmentInBounds(seg, lightBounds));
        const lightPoints = LightUtils.buildLightPolygon(pos, nearbyEdges, this.options.numRays, this.options.radius);

        // Update light sprite to be under where the player
        this.sprite.width = this.options.radius * 2 * Game.Config.PixelsPerMeter;
        this.sprite.height = this.options.radius * 2 * Game.Config.PixelsPerMeter;
        this.sprite.x = pos.x * Game.Config.PixelsPerMeter;
        this.sprite.y = pos.y * Game.Config.PixelsPerMeter;
        
        // Draw mask
        this.mask.clear();

        this.mask.moveTo(this.sprite.x, this.sprite.y);
        for (const pt of lightPoints) {
            this.mask.lineTo(pt.point.x * Game.Config.PixelsPerMeter, pt.point.y * Game.Config.PixelsPerMeter);
        }

        this.mask.lineTo(lightPoints[0].point.x * Game.Config.PixelsPerMeter, lightPoints[0].point.y * Game.Config.PixelsPerMeter);
        this.mask.fill();
    }

    renderStatic(allEdges: Segment[]) {
        // TODO Better optimize, assuming radius doesn't change?
        const pos: Point = {
            x: this.sprite.x / Game.Config.PixelsPerMeter,
            y: this.sprite.y / Game.Config.PixelsPerMeter
        }

        const lightBounds = {
            minX: pos.x - this.options.radius,
            maxX: pos.x + this.options.radius,
            minY: pos.y - this.options.radius,
            maxY: pos.y + this.options.radius,
          };

        // Build out the light points in world space (Meters)
        const nearbyEdges = allEdges.filter(seg => CollisionUtils.isSegmentInBounds(seg, lightBounds));
        const lightPoints = LightUtils.buildLightPolygon(pos, nearbyEdges, this.options.numRays, this.options.radius);
        
        // Update light sprite to be under where the player
        this.sprite.width = this.options.radius * 2 * Game.Config.PixelsPerMeter;
        this.sprite.height = this.options.radius * 2 * Game.Config.PixelsPerMeter;
        
        // Draw mask
        this.mask.clear();

        this.mask.moveTo(this.sprite.x, this.sprite.y);
        for (const pt of lightPoints) {
            this.mask.lineTo(pt.point.x * Game.Config.PixelsPerMeter, pt.point.y * Game.Config.PixelsPerMeter);
        }

        this.mask.lineTo(lightPoints[0].point.x * Game.Config.PixelsPerMeter, lightPoints[0].point.y * Game.Config.PixelsPerMeter);
        this.mask.fill();
    }

    // TODO Put in some other Light-related file / class
    flickerAlpha() {
        gsap.to(this.sprite, {
            pixi: {
                alpha: 0.5 + Math.random() * 0.4
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
        gsap.fromTo(this.sprite, {
            pixi: { tint: startColor},
        }, {
            duration: 1.5 + (Math.random() * 2),
            pixi: { tint: endColor },
            yoyo: true,
            delay: Math.random() * 2,
            repeat: -1
        });
    }
}