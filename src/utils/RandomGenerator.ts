import seedrandom from 'seedrandom';

export class RandomGenerator {
    private rng: () => number;
    private _seed: string;
    
    constructor(seed?: string | number) {
        if (seed === undefined) {
            // Generate a random seed (using Math.random() just this once)
            this._seed = Math.random().toString(36).substring(2, 15) + 
                        Math.random().toString(36).substring(2, 15);
        } else {
            this._seed = seed.toString();
        }
        this.rng = seedrandom(this._seed);
    }
    
    /**
     * Get the seed that was used to initialize this generator
     */
    get seed(): string {
        return this._seed;
    }
    
    /**
     * Get a random float between 0 (inclusive) and 1 (exclusive)
     */
    random(): number {
        return this.rng();
    }
    
    /**
     * Get a random integer between 0 (inclusive) and max (exclusive)
     * @param max The upper bound (exclusive)
     */
    nextInt(max: number): number {
        return Math.floor(this.rng() * max);
    }
    
    /**
     * Get a random integer between min (inclusive) and max (inclusive)
     */
    int(min: number, max: number): number {
        return Math.floor(this.rng() * (max - min + 1)) + min;
    }
    
    /**
     * Get a random element from an array
     */
    choice<T>(array: T[]): T {
        if (array.length === 0) throw new Error('RandomGenerator.choice: array must not be empty');
        return array[this.nextInt(array.length)];
    }
    
    /**
     * Get a random boolean with the given probability
     * @param probability Probability of returning true (0-1)
     */
    chance(probability: number): boolean {
        return this.rng() < probability;
    }
    
    /**
     * Shuffle an array in place using Fisher-Yates algorithm
     */
    shuffle<T>(array: T[]): T[] {
        for (let i = array.length - 1; i > 0; i--) {
            const j = this.nextInt(i + 1);
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
}