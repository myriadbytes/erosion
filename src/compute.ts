import { Perlin } from "./noise";

export class ErosionCompute {
    bind_group_layout: GPUBindGroupLayout;
    bind_group: GPUBindGroup;
    t1: GPUTexture;
    t2: GPUTexture;
    t3: GPUTexture;

    TEXTURES_W = 512;

    constructor(device: GPUDevice) {
        // b (terrain height), d (water height), s (sediment amount)
        this.t1 = device.createTexture({
            size: { width: this.TEXTURES_W, height: this.TEXTURES_W },
            format: "rgba32float",
            usage:
                GPUTextureUsage.STORAGE_BINDING |
                GPUTextureUsage.TEXTURE_BINDING |
                GPUTextureUsage.COPY_DST,
        });
        const noise = new Perlin();
        const heightmap_seed = new Float32Array(
            this.TEXTURES_W * this.TEXTURES_W * 4
        ).map((e, i, a) => {
            if (i % 4 == 0) {
                let x = i / 4 / this.TEXTURES_W;
                let y = (i / 4) % this.TEXTURES_W;
                return noise.perlin(
                    (x / this.TEXTURES_W) * 4,
                    (y / this.TEXTURES_W) * 4
                );
            }
            return 0;
        });
        device.queue.writeTexture(
            { texture: this.t1 },
            heightmap_seed,
            { bytesPerRow: 16 * this.TEXTURES_W },
            { width: this.TEXTURES_W, height: this.TEXTURES_W }
        );

        // outflow flux in 4 directions
        this.t2 = device.createTexture({
            size: { width: this.TEXTURES_W, height: this.TEXTURES_W },
            format: "rgba32float",
            usage:
                GPUTextureUsage.STORAGE_BINDING |
                GPUTextureUsage.TEXTURE_BINDING |
                GPUTextureUsage.COPY_DST,
        });

        // water velocity (u,v)
        this.t3 = device.createTexture({
            size: { width: this.TEXTURES_W, height: this.TEXTURES_W },
            format: "rg32float",
            usage:
                GPUTextureUsage.STORAGE_BINDING |
                GPUTextureUsage.TEXTURE_BINDING |
                GPUTextureUsage.COPY_DST,
        });

        this.bind_group_layout = device.createBindGroupLayout({
            label: "Compute Bindgroup Layout",
            entries: [
                // bds
                {
                    binding: 0,
                    visibility:
                        GPUShaderStage.COMPUTE | GPUShaderStage.FRAGMENT,
                    texture: {
                        sampleType: "float",
                    },
                },
                // flux
                {
                    binding: 1,
                    visibility: GPUShaderStage.COMPUTE,
                    texture: {
                        sampleType: "float",
                    },
                },
                // velocity
                {
                    binding: 2,
                    visibility: GPUShaderStage.COMPUTE,
                    texture: {
                        sampleType: "float",
                    },
                },
            ],
        });

        this.bind_group = device.createBindGroup({
            label: "Compute Bind Group",
            layout: this.bind_group_layout,
            entries: [
                {
                    binding: 0,
                    resource: this.t1.createView(),
                },
                {
                    binding: 1,
                    resource: this.t2.createView(),
                },
                {
                    binding: 2,
                    resource: this.t3.createView(),
                },
            ],
        });
    }
}
