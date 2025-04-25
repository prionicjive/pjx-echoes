import * as PIXI from 'pixi.js';
import gsap from 'gsap';
import { GraphicsUtils } from '../utils/GraphicsUtils';
import { Game } from '../core/Game';
import { LightUtils } from '../utils/LightUtils';
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

    constructor(pos: Point, options: LightOptions) {
        this.options = options;

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

    updateAndRender(pos: Point, validEdgesLookupTable: Segment[][][]) {
        // Build out the light points in world space (Meters)
        const validEdges = LightUtils.lookupValidEdgesForArea(validEdgesLookupTable, pos, this.options.radius);
        const lightPoints = LightUtils.buildLightPolygon(pos, validEdges, this.options.numRays, this.options.radius);

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

    renderStatic(validEdgesLookupTable: Segment[][][]) {
        // TODO Better optimize, assuming radius doesn't change?
        // Build out the light points in world space (Meters)
        const validEdges = LightUtils.lookupValidEdgesForArea(validEdgesLookupTable, {x: this.sprite.x / Game.Config.PixelsPerMeter, y: this.sprite.y / Game.Config.PixelsPerMeter}, this.options.radius);
        const lightPoints = LightUtils.buildLightPolygon({x: this.sprite.x / Game.Config.PixelsPerMeter, y: this.sprite.y / Game.Config.PixelsPerMeter}, validEdges, this.options.numRays, this.options.radius);

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
            alpha: 0.6 + Math.random() * 0.15,
            duration: 0.5 + Math.random() * 0.5,
            ease: 'power1.inOut',
            onComplete: () => this.flickerAlpha()
        });
    }
    
    // TODO Put in some other Light-related file / class
    flickerRadius() {
        gsap.to(this, {
            radius: this.options.radius + Math.random() * this.options.radiusVariance, 
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