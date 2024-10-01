import { Perlin } from "./noise";
import water_increment_shader_string from "./shaders/water_increment.wgsl?raw";
import outflow_flux_shader_string from "./shaders/outflow_flux.wgsl?raw";
import water_velocity_shader_string from "./shaders/water_velocity.wgsl?raw";

export class ErosionCompute {
    device: GPUDevice;
    // textures
    TEXTURES_W = 512;
    t1_read: GPUTexture;
    t1_write: GPUTexture;
    t2_read: GPUTexture;
    t2_write: GPUTexture;
    t3_read: GPUTexture;
    t3_write: GPUTexture;
    // shaders
    water_increment_shader: GPUShaderModule;
    outflow_flux_shader: GPUShaderModule;
    water_velocity_shader: GPUShaderModule;

    // bind group stuff
    water_increment_bind_group_layout: GPUBindGroupLayout;
    water_increment_bind_group: GPUBindGroup;
    outflow_flux_bind_group_layout: GPUBindGroupLayout;
    outflow_flux_bind_group: GPUBindGroup;
    water_velocity_bind_group_layout: GPUBindGroupLayout;
    water_velocity_bind_group: GPUBindGroup;

    // pipelines
    water_increment_pipeline_layout: GPUPipelineLayout;
    water_increment_pipeline: GPUComputePipeline;
    outflow_flux_pipeline_layout: GPUPipelineLayout;
    outflow_flux_pipeline: GPUComputePipeline;
    water_velocity_pipeline_layout: GPUPipelineLayout;
    water_velocity_pipeline: GPUComputePipeline;

    constructor(device: GPUDevice) {
        this.device = device;
        /* const noise = new Perlin();
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
            { texture: this.t1_in },
            heightmap_seed,
            { bytesPerRow: 4 * this.TEXTURES_W },
            { width: this.TEXTURES_W, height: this.TEXTURES_W }
        ); */
    }

    init_textures() {
        /*
         *  T1 HOLDS : B (terrain height) D (water height) S (sediments)
         *  T2 HOLDS : ->F (outgoing flow in all 4 directions)
         *  T3 HOLDS : ->V (velocity field)
         */

        this.t1_read = this.device.createTexture({
            size: { width: this.TEXTURES_W, height: this.TEXTURES_W },
            format: "rgba32float",
            usage:
                GPUTextureUsage.STORAGE_BINDING |
                GPUTextureUsage.TEXTURE_BINDING |
                GPUTextureUsage.COPY_DST,
        });
        this.t1_write = this.device.createTexture({
            size: { width: this.TEXTURES_W, height: this.TEXTURES_W },
            format: "rgba32float",
            usage:
                GPUTextureUsage.STORAGE_BINDING |
                GPUTextureUsage.TEXTURE_BINDING,
        });
        this.t2_read = this.device.createTexture({
            size: { width: this.TEXTURES_W, height: this.TEXTURES_W },
            format: "rgba32float",
            usage:
                GPUTextureUsage.STORAGE_BINDING |
                GPUTextureUsage.TEXTURE_BINDING,
        });
        this.t2_write = this.device.createTexture({
            size: { width: this.TEXTURES_W, height: this.TEXTURES_W },
            format: "rgba32float",
            usage:
                GPUTextureUsage.STORAGE_BINDING |
                GPUTextureUsage.TEXTURE_BINDING,
        });
        this.t3_read = this.device.createTexture({
            size: { width: this.TEXTURES_W, height: this.TEXTURES_W },
            format: "rg32float",
            usage:
                GPUTextureUsage.STORAGE_BINDING |
                GPUTextureUsage.TEXTURE_BINDING,
        });
        this.t3_write = this.device.createTexture({
            size: { width: this.TEXTURES_W, height: this.TEXTURES_W },
            format: "rg32float",
            usage:
                GPUTextureUsage.STORAGE_BINDING |
                GPUTextureUsage.TEXTURE_BINDING,
        });
    }

    init_water_increment() {
        this.water_increment_bind_group_layout =
            this.device.createBindGroupLayout({
                label: "Water Increment Bindgroup Layout",
                entries: [
                    // bds input
                    {
                        binding: 0,
                        visibility: GPUShaderStage.COMPUTE,
                        storageTexture: {
                            access: "read-only",
                            format: "rgba32float",
                        },
                    },
                    // bds output
                    {
                        binding: 1,
                        visibility: GPUShaderStage.COMPUTE,
                        storageTexture: {
                            access: "write-only",
                            format: "rgba32float",
                        },
                    },
                ],
            });

        this.water_increment_bind_group = this.device.createBindGroup({
            label: "Water Increment Bind Group",
            layout: this.water_increment_bind_group_layout,
            entries: [
                {
                    binding: 0,
                    resource: this.t1_read.createView(),
                },
                {
                    binding: 1,
                    resource: this.t1_write.createView(),
                },
            ],
        });

        this.water_increment_shader = this.device.createShaderModule({
            label: "Water Increment Shader",
            code: water_increment_shader_string,
        });

        this.water_increment_pipeline_layout = this.device.createPipelineLayout(
            {
                bindGroupLayouts: [this.water_increment_bind_group_layout],
            }
        );

        this.water_increment_pipeline = this.device.createComputePipeline({
            label: "Water Increment Compute Pipeline",
            compute: {
                module: this.water_increment_shader,
            },
            layout: this.water_increment_pipeline_layout,
        });
    }

    init_outflow_flux() {
        this.outflow_flux_bind_group_layout = this.device.createBindGroupLayout(
            {
                label: "Outflow Flux Bindgroup Layout",
                entries: [
                    // b, d in
                    {
                        binding: 0,
                        visibility: GPUShaderStage.COMPUTE,
                        storageTexture: {
                            access: "read-only",
                            format: "rgba32float",
                        },
                    },
                    // f in
                    {
                        binding: 1,
                        visibility: GPUShaderStage.COMPUTE,
                        storageTexture: {
                            access: "read-only",
                            format: "rgba32float",
                        },
                    },
                    // f out
                    {
                        binding: 2,
                        visibility: GPUShaderStage.COMPUTE,
                        storageTexture: {
                            access: "write-only",
                            format: "rgba32float",
                        },
                    },
                ],
            }
        );

        this.outflow_flux_bind_group = this.device.createBindGroup({
            label: "Outflow Flux Bind Group",
            layout: this.outflow_flux_bind_group_layout,
            entries: [
                {
                    binding: 0,
                    resource: this.t1_read.createView(),
                },
                {
                    binding: 1,
                    resource: this.t2_read.createView(),
                },
                {
                    binding: 2,
                    resource: this.t2_write.createView(),
                },
            ],
        });

        this.outflow_flux_shader = this.device.createShaderModule({
            label: "Outflow Flux Shader",
            code: outflow_flux_shader_string,
        });

        this.outflow_flux_pipeline_layout = this.device.createPipelineLayout({
            bindGroupLayouts: [this.outflow_flux_bind_group_layout],
        });

        this.outflow_flux_pipeline = this.device.createComputePipeline({
            label: "Outflow Flux Compute Pipeline",
            compute: {
                module: this.outflow_flux_shader,
            },
            layout: this.outflow_flux_pipeline_layout,
        });
    }

    init_water_velocity() {
        this.water_velocity_bind_group_layout =
            this.device.createBindGroupLayout({
                label: "Water Velocity Bindgroup Layout",
                entries: [
                    // f in
                    {
                        binding: 0,
                        visibility: GPUShaderStage.COMPUTE,
                        storageTexture: {
                            access: "read-only",
                            format: "rgba32float",
                        },
                    },
                    // d in
                    {
                        binding: 1,
                        visibility: GPUShaderStage.COMPUTE,
                        storageTexture: {
                            access: "read-only",
                            format: "rgba32float",
                        },
                    },
                    // d out
                    {
                        binding: 2,
                        visibility: GPUShaderStage.COMPUTE,
                        storageTexture: {
                            access: "write-only",
                            format: "rgba32float",
                        },
                    },
                    // v out
                    {
                        binding: 3,
                        visibility: GPUShaderStage.COMPUTE,
                        storageTexture: {
                            access: "write-only",
                            format: "rgba32float",
                        },
                    },
                ],
            });

        this.water_velocity_bind_group = this.device.createBindGroup({
            label: "Water Velocity Bind Group",
            layout: this.water_velocity_bind_group_layout,
            entries: [
                {
                    binding: 0,
                    resource: this.t2_read.createView(),
                },
                {
                    binding: 1,
                    resource: this.t1_read.createView(),
                },
                {
                    binding: 2,
                    resource: this.t1_write.createView(),
                },
                {
                    binding: 3,
                    resource: this.t3_write.createView(),
                },
            ],
        });

        this.water_velocity_shader = this.device.createShaderModule({
            label: "Water Velocity Shader",
            code: water_velocity_shader_string,
        });

        this.water_velocity_pipeline_layout = this.device.createPipelineLayout({
            bindGroupLayouts: [this.water_velocity_bind_group_layout],
        });

        this.water_velocity_pipeline = this.device.createComputePipeline({
            label: "Water Velocity Compute Pipeline",
            compute: {
                module: this.water_velocity_shader,
            },
            layout: this.water_velocity_pipeline_layout,
        });
    }

    /*    run_pass() {
        const encoder = this.device.createCommandEncoder({});
        const pass = encoder.beginComputePass();
        pass.setPipeline(this.pipeline);
        pass.setBindGroup(0, this.bind_group);
        pass.dispatchWorkgroups(512 / 16, 512 / 16);
        pass.end();

        const command_buffer = encoder.finish();
        this.device.queue.submit([command_buffer]);
    } */
}
