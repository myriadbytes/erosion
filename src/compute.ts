import { Perlin } from "./noise";
import compute_shader_string from "./shaders/compute.wgsl?raw";

export class ErosionCompute {
    TEXTURES_W = 512;
    device: GPUDevice;
    bind_group_layout: GPUBindGroupLayout;
    bind_group: GPUBindGroup;
    view_bind_group_layout: GPUBindGroupLayout;
    view_bind_group: GPUBindGroup;
    terrain_height_texture: GPUTexture;
    water_height_texture: GPUTexture;
    compute_shader: GPUShaderModule;
    pipeline_layout: GPUPipelineLayout;
    pipeline: GPUComputePipeline;

    constructor(device: GPUDevice) {
        this.device = device;

        // terrain height (b)
        this.terrain_height_texture = device.createTexture({
            size: { width: this.TEXTURES_W, height: this.TEXTURES_W },
            format: "r32float",
            usage:
                GPUTextureUsage.STORAGE_BINDING |
                GPUTextureUsage.TEXTURE_BINDING |
                GPUTextureUsage.COPY_DST,
        });
        const noise = new Perlin();
        const heightmap_seed = new Float32Array(
            this.TEXTURES_W * this.TEXTURES_W
        ).map((e, i, a) => {
            let x = i / this.TEXTURES_W;
            let y = i % this.TEXTURES_W;
            return noise.perlin(
                (x / this.TEXTURES_W) * 4,
                (y / this.TEXTURES_W) * 4
            );
        });
        device.queue.writeTexture(
            { texture: this.terrain_height_texture },
            heightmap_seed,
            { bytesPerRow: 4 * this.TEXTURES_W },
            { width: this.TEXTURES_W, height: this.TEXTURES_W }
        );

        // water height (d)
        this.water_height_texture = device.createTexture({
            size: { width: this.TEXTURES_W, height: this.TEXTURES_W },
            format: "r32float",
            usage:
                GPUTextureUsage.STORAGE_BINDING |
                GPUTextureUsage.TEXTURE_BINDING,
        });

        /* // outflow flux in 4 directions
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
        }); */

        this.bind_group_layout = device.createBindGroupLayout({
            label: "Compute Bindgroup Layout",
            entries: [
                // terrain height
                {
                    binding: 0,
                    visibility: GPUShaderStage.COMPUTE,
                    storageTexture: {
                        access: "read-write",
                        format: "r32float",
                    },
                },
                // water height
                {
                    binding: 1,
                    visibility: GPUShaderStage.COMPUTE,
                    storageTexture: {
                        access: "read-write",
                        format: "r32float",
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
                    resource: this.terrain_height_texture.createView(),
                },
                {
                    binding: 1,
                    resource: this.water_height_texture.createView(),
                },
            ],
        });

        this.view_bind_group_layout = device.createBindGroupLayout({
            label: "Compute Textures View Bindgroup Layout",
            entries: [
                // terrain height
                {
                    binding: 0,
                    visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                    texture: {},
                },
                // water height
                {
                    binding: 1,
                    visibility: GPUShaderStage.FRAGMENT,
                    texture: {},
                },
            ],
        });

        this.view_bind_group = device.createBindGroup({
            label: "Compute Textures View Bind Group",
            layout: this.view_bind_group_layout,
            entries: [
                {
                    binding: 0,
                    resource: this.terrain_height_texture.createView(),
                },
                {
                    binding: 1,
                    resource: this.water_height_texture.createView(),
                },
            ],
        });

        this.compute_shader = device.createShaderModule({
            label: "Compute Shader",
            code: compute_shader_string,
        });

        this.pipeline_layout = device.createPipelineLayout({
            bindGroupLayouts: [this.bind_group_layout],
        });

        this.pipeline = device.createComputePipeline({
            label: "Erosion Compute Pipeline",
            compute: {
                module: this.compute_shader,
            },
            layout: this.pipeline_layout,
        });
    }

    run_pass() {
        const encoder = this.device.createCommandEncoder({});
        const pass = encoder.beginComputePass();
        pass.setPipeline(this.pipeline);
        pass.setBindGroup(0, this.bind_group);
        pass.dispatchWorkgroups(512 / 16, 512 / 16);
        pass.end();

        const command_buffer = encoder.finish();
        this.device.queue.submit([command_buffer]);
    }
}
