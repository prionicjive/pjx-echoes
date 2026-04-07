export interface SwipeResult {
    time: number;
    speedPixelsPerSecond: number;
    direction: { x: number; y: number };
}

export class GestureRecognizer {
    /**
     * Analyses a touch history buffer and returns a SwipeResult if a swipe is detected,
     * or null otherwise. Does not mutate the history array.
     */
    static detectSwipe(
        history: { x: number; y: number; time: number }[],
        minDistance: number,
        speedThreshold: number
    ): SwipeResult | null {
        if (history.length < 2) return null;

        const first = history[0];
        const last = history[history.length - 1];
        const dt = (last.time - first.time) / 1000; // seconds
        const dx = last.x - first.x;
        const dy = last.y - first.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const speed = distance / (dt || 0.001);

        if (distance > minDistance && speed > speedThreshold) {
            return {
                time: last.time,
                speedPixelsPerSecond: speed,
                direction: { x: dx / distance, y: dy / distance },
            };
        }

        return null;
    }
}
