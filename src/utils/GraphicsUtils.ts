import * as PIXI from 'pixi.js';

export class GraphicsUtils {
    static createRadialGradientTexture() {
        const size = 256;
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = size;
        const ctx = canvas.getContext('2d');
    
        if (!ctx) {
            return null;
        }

        const gradient = ctx.createRadialGradient(
            size / 2, size / 2, 0,
            size / 2, size / 2, size / 2
        );
    
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, size);
    
        return PIXI.Texture.from(canvas);
    }    
}
