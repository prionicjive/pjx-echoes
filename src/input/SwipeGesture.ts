export interface SwipeResult {
    dx: number;
    dy: number;
    dt: number; // duration in seconds
    velocityX: number;
    velocityY: number;
    speed: number;
}

export class SwipeGesture {
    private startX = 0;
    private startY = 0;
    private startTime = 0;

    onTouchStart(x: number, y: number) {
        this.startX = x;
        this.startY = y;
        this.startTime = Date.now();
    }

    onTouchEnd(x: number, y: number): SwipeResult | null {
        const endTime = Date.now();
        const dx = x - this.startX;
        const dy = y - this.startY;
        const dt = (endTime - this.startTime) / 1000; // seconds

        // Ignore tiny swipes or taps
        if (dt < 0.04 || (Math.abs(dx) < 5 && Math.abs(dy) < 5)) return null;

        // Calculate velocity (pixels/sec)
        const velocityX = dx / dt;
        const velocityY = dy / dt;
        const speed = Math.sqrt(velocityX * velocityX + velocityY * velocityY);

        return { dx, dy, dt, velocityX, velocityY, speed };
    }
}