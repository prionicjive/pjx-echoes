export class ColorUtils {
    static getRandomColor(): number {
        const colors = [
            0xFF5733, 0x33FF57, 0x3357FF, 0xF3FF33, 0xFF33F3,
            0x33FFF3, 0xFF8C33, 0x8C33FF, 0x33FF8C, 0xFF338C,
            0x8CFF33, 0x338CFF, 0xFF3333, 0x33FF33, 0x3333FF
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }
}
