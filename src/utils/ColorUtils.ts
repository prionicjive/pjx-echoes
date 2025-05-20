// src/utils/ColorUtils.ts
import * as PIXI from 'pixi.js';

export class ColorUtils {
    /**
     * Converts a hex color number to an RGB object
     */
    public static hexToRgb(hex: number): { r: number; g: number; b: number } {
        return {
            r: (hex >> 16) & 0xFF,
            g: (hex >> 8) & 0xFF,
            b: hex & 0xFF
        };
    }

    /**
     * Converts RGB values to a hex number
     */
    public static rgbToHex(r: number, g: number, b: number): number {
        return (r << 16) + (g << 8) + b;
    }

    /**
     * Lightens a color by a given percentage (0-1)
     */
    public static lighten(hex: number, percent: number): number {
        const color = new PIXI.Color(hex);
        const hsl = this.rgbToHsl(color.red * 255, color.green * 255, color.blue * 255);
        hsl.l = Math.min(1, hsl.l + (1 - hsl.l) * percent);
        const rgb = this.hslToRgb(hsl.h, hsl.s, hsl.l);
        return this.rgbToHex(rgb.r, rgb.g, rgb.b);
    }

    /**
     * Darkens a color by a given percentage (0-1)
     */
    public static darken(hex: number, percent: number): number {
        const color = new PIXI.Color(hex);
        const hsl = this.rgbToHsl(color.red * 255, color.green * 255, color.blue * 255);
        hsl.l = Math.max(0, hsl.l - hsl.l * percent);
        const rgb = this.hslToRgb(hsl.h, hsl.s, hsl.l);
        return this.rgbToHex(rgb.r, rgb.g, rgb.b);
    }

    /**
     * Adjusts the saturation of a color by a given percentage (-1 to 1)
     */
    public static adjustSaturation(hex: number, percent: number): number {
        const color = new PIXI.Color(hex);
        const hsl = this.rgbToHsl(color.red * 255, color.green * 255, color.blue * 255);
        hsl.s = Math.min(1, Math.max(0, hsl.s + hsl.s * percent));
        const rgb = this.hslToRgb(hsl.h, hsl.s, hsl.l);
        return this.rgbToHex(rgb.r, rgb.g, rgb.b);
    }

    /**
     * Gets a complementary color (180° on the color wheel)
     */
    public static getComplementary(hex: number): number {
        const color = new PIXI.Color(hex);
        const hsl = this.rgbToHsl(color.red * 255, color.green * 255, color.blue * 255);
        hsl.h = (hsl.h + 0.5) % 1.0;
        const rgb = this.hslToRgb(hsl.h, hsl.s, hsl.l);
        return this.rgbToHex(rgb.r, rgb.g, rgb.b);
    }

    /**
     * Gets an analogous color scheme (colors adjacent on the color wheel)
     */
    public static getAnalogous(hex: number, spread: number = 0.1): [number, number, number] {
        const color = new PIXI.Color(hex);
        const hsl = this.rgbToHsl(color.red * 255, color.green * 255, color.blue * 255);
        
        return [
            this.hslToHex((hsl.h - spread + 1) % 1.0, hsl.s, hsl.l),
            hex, // Original color
            this.hslToHex((hsl.h + spread) % 1.0, hsl.s, hsl.l)
        ];
    }

    /**
     * Gets a triadic color scheme (three colors evenly spaced around the color wheel)
     */
    public static getTriadic(hex: number): [number, number, number] {
        const color = new PIXI.Color(hex);
        const hsl = this.rgbToHsl(color.red * 255, color.green * 255, color.blue * 255);
        
        return [
            hex, // Original color
            this.hslToHex((hsl.h + 1/3) % 1.0, hsl.s, hsl.l),
            this.hslToHex((hsl.h + 2/3) % 1.0, hsl.s, hsl.l)
        ];
    }

    /**
     * Converts RGB to HSL (Hue, Saturation, Lightness)
     */
    private static rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
        r /= 255;
        g /= 255;
        b /= 255;
        
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h = 0;
        let s = 0;
        const l = (max + min) / 2;

        if (max !== min) {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            
            h /= 6;
        }

        return { h, s, l };
    }

    /**
     * Converts HSL to RGB
     */
    private static hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
        let r, g, b;

        if (s === 0) {
            r = g = b = l; // achromatic
        } else {
            const hue2rgb = (p: number, q: number, t: number) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1/6) return p + (q - p) * 6 * t;
                if (t < 1/2) return q;
                if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
            };

            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }

        return {
            r: Math.round(r * 255),
            g: Math.round(g * 255),
            b: Math.round(b * 255)
        };
    }

    /**
     * Converts HSL to hex
     */
    private static hslToHex(h: number, s: number, l: number): number {
        const rgb = this.hslToRgb(h, s, l);
        return this.rgbToHex(rgb.r, rgb.g, rgb.b);
    }

    /**
     * Gets a random color with a minimum brightness (0-1)
     */
    public static getRandomColor(minBrightness: number = 0, maxBrightness: number = 1): number {
        const r = Math.floor(Math.random() * 256);
        const g = Math.floor(Math.random() * 256);
        const b = Math.floor(Math.random() * 256);
        const hsl = this.rgbToHsl(r, g, b);
        hsl.l = Math.max(minBrightness, Math.min(maxBrightness, hsl.l));
        return this.hslToHex(hsl.h, hsl.s, hsl.l);
    }

    /**
     * Gets a random PIXI.Color with a minimum brightness (0-1)
     */
    public static getRandomPixiColor(minBrightness: number = 0): PIXI.Color {
        return this.toPixiColor(this.getRandomColor(minBrightness));
    }

    /**
     * Converts a hex color to a PIXI.Color instance
     */
    public static toPixiColor(hex: number): PIXI.Color {
        return new PIXI.Color(hex);
    }

    /**
     * Creates a gradient between two colors
     * @param startColor Starting color (hex)
     * @param endColor Ending color (hex)
     * @param steps Number of steps in the gradient
     * @returns Array of hex colors
     */
    public static createGradient(startColor: number, endColor: number, steps: number): number[] {
        const start = this.hexToRgb(startColor);
        const end = this.hexToRgb(endColor);
        const gradient: number[] = [];

        for (let i = 0; i < steps; i++) {
            const ratio = i / (steps - 1);
            const r = Math.round(start.r + (end.r - start.r) * ratio);
            const g = Math.round(start.g + (end.g - start.g) * ratio);
            const b = Math.round(start.b + (end.b - start.b) * ratio);
            gradient.push(this.rgbToHex(r, g, b));
        }

        return gradient;
    }

    /**
     * Gets a color with adjusted brightness
     * @param hex Original color
     * @param factor Brightness factor (0 = black, 1 = original, >1 = brighter)
     * @returns New color with adjusted brightness
     */
    public static adjustBrightness(hex: number, factor: number): number {
        const color = this.hexToRgb(hex);
        color.r = Math.min(255, Math.max(0, color.r * factor));
        color.g = Math.min(255, Math.max(0, color.g * factor));
        color.b = Math.min(255, Math.max(0, color.b * factor));
        return this.rgbToHex(color.r, color.g, color.b);
    }
}
