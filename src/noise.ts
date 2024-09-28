// https://adrianb.io/2014/08/09/perlinnoise.html

export class Perlin {
    private repeat: number;
    private permutation: number[];
    private p: number[];

    constructor(repeat: number = -1) {
        this.repeat = repeat;
        this.permutation = [
            151, 160, 137, 91, 90, 15, 131, 13, 201, 95, 96, 53, 194, 233, 7,
            225, 140, 36, 103, 30, 69, 142, 8, 99, 37, 240, 21, 10, 23, 190, 6,
            148, 247, 120, 234, 75, 0, 26, 197, 62, 94, 252, 219, 203, 117, 35,
            11, 32, 57, 177, 33, 88, 237, 149, 56, 87, 174, 20, 125, 136, 171,
            168, 68, 175, 74, 165, 71, 134, 139, 48, 27, 166, 77, 146, 158, 231,
            83, 111, 229, 122, 60, 211, 133, 230, 220, 105, 92, 41, 55, 46, 245,
            40, 244, 102, 143, 54, 65, 25, 63, 161, 1, 216, 80, 73, 209, 76,
            132, 187, 208, 89, 18, 169, 200, 196, 135, 130, 116, 188, 159, 86,
            164, 100, 109, 198, 173, 186, 3, 64, 52, 217, 226, 250, 124, 123, 5,
            202, 38, 147, 118, 126, 255, 82, 85, 212, 207, 206, 59, 227, 47, 16,
            58, 17, 182, 189, 28, 42, 223, 183, 170, 213, 119, 248, 152, 2, 44,
            154, 163, 70, 221, 153, 101, 155, 167, 43, 172, 9, 129, 22, 39, 253,
            19, 98, 108, 110, 79, 113, 224, 232, 178, 185, 112, 104, 218, 246,
            97, 228, 251, 34, 242, 193, 238, 210, 144, 12, 191, 179, 162, 241,
            81, 51, 145, 235, 249, 14, 239, 107, 49, 192, 214, 31, 181, 199,
            106, 157, 184, 84, 204, 176, 115, 121, 50, 45, 127, 4, 150, 254,
            138, 236, 205, 93, 222, 114, 67, 29, 24, 72, 243, 141, 128, 195, 78,
            66, 215, 61, 156, 180,
        ];
        this.p = new Array(512);
        for (let x = 0; x < 512; x++) {
            this.p[x] = this.permutation[x % 256];
        }
    }

    public octavePerlin(
        x: number,
        y: number,
        octaves: number,
        persistence: number
    ): number {
        let total = 0;
        let frequency = 1;
        let amplitude = 1;
        let maxValue = 0;
        for (let i = 0; i < octaves; i++) {
            total += this.perlin(x * frequency, y * frequency) * amplitude;
            maxValue += amplitude;
            amplitude *= persistence;
            frequency *= 2;
        }
        return total / maxValue;
    }

    public perlin(x: number, y: number): number {
        if (this.repeat > 0) {
            x = x % this.repeat;
            y = y % this.repeat;
        }

        let xi = Math.floor(x) & 255;
        let yi = Math.floor(y) & 255;
        let xf = x - Math.floor(x);
        let yf = y - Math.floor(y);
        let u = Perlin.fade(xf);
        let v = Perlin.fade(yf);

        let aa = this.p[this.p[xi] + yi];
        let ab = this.p[this.p[xi] + this.inc(yi)];
        let ba = this.p[this.p[this.inc(xi)] + yi];
        let bb = this.p[this.p[this.inc(xi)] + this.inc(yi)];

        let x1 = Perlin.lerp(
            Perlin.grad(aa, xf, yf),
            Perlin.grad(ba, xf - 1, yf),
            u
        );
        let x2 = Perlin.lerp(
            Perlin.grad(ab, xf, yf - 1),
            Perlin.grad(bb, xf - 1, yf - 1),
            u
        );

        return (Perlin.lerp(x1, x2, v) + 1) / 2;
    }

    private inc(num: number): number {
        num++;
        if (this.repeat > 0) num %= this.repeat;
        return num;
    }

    private static grad(hash: number, x: number, y: number): number {
        const h = hash & 7;
        const u = h < 4 ? x : y;
        const v = h < 4 ? y : x;
        return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
    }

    private static fade(t: number): number {
        return t * t * t * (t * (t * 6 - 15) + 10);
    }

    private static lerp(a: number, b: number, x: number): number {
        return a + x * (b - a);
    }
}
