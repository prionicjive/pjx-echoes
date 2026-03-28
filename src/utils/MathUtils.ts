export class MathUtils {
    static getRandomInt(min: number, max: number): number {
        // Ensure min and max are integers
        min = Math.ceil(min);
        max = Math.floor(max);
        // Generate random integer in the range [min, max)
        return Math.floor(Math.random() * (max - min)) + min;
    }

    static isNumberInRange(number: number, start: number, end: number): boolean {
        return number >= Math.min(start, end) && number <= Math.max(start, end);
    }

    static getRandomFloat(min: number, max: number): number {
        return Math.random() * (max - min) + min;
    }

    static radiansToDegrees(radians: number): number {
        return radians * (180 / Math.PI);
    }

    static degreesToRadians(degrees: number): number {
        return degrees * (Math.PI / 180);
    }

    static getRandomAngleInSpread(angle: number, spreadAmount: number): number {
        return angle + MathUtils.getRandomFloat(-spreadAmount / 2, spreadAmount / 2);
    }
}