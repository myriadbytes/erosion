import { Perlin } from "./noise";
import water_increment_shader_string from "./shaders/water_increment.wgsl?raw";
import outflow_flux_shader_string from "./shaders/outflow_flux.wgsl?raw";
import water_velocity_shader_string from "./shaders/water_velocity.wgsl?raw";
import erosion_deposition_shader_string from "./shaders/erosion_deposition.wgsl?raw";
import transportation_shader_string from "./shaders/transportation.wgsl?raw";
import evaporation_shader_string from "./shaders/evaporation.wgsl?raw";

export class ErosionCompute {
    device: GPUDevice;
    running: boolean = true;
    // textures
    next_resolution: number;
    RESOLUTION = 1024;
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
    erosion_deposition_shader: GPUShaderModule;
    transportation_shader: GPUShaderModule;
    evaporation_shader: GPUShaderModule;

    // bind group stuff
    water_increment_bind_group: GPUBindGroup;
    outflow_flux_bind_group: GPUBindGroup;
    water_velocity_bind_group: GPUBindGroup;
    erosion_deposition_bind_group: GPUBindGroup;
    transportation_bind_group: GPUBindGroup;
    evaporation_bind_group: GPUBindGroup;

    water_increment_bind_group_layout: GPUBindGroupLayout;
    outflow_flux_bind_group_layout: GPUBindGroupLayout;
    water_velocity_bind_group_layout: GPUBindGroupLayout;
    erosion_deposition_bind_group_layout: GPUBindGroupLayout;
    transportation_bind_group_layout: GPUBindGroupLayout;
    evaporation_bind_group_layout: GPUBindGroupLayout;

    // pipelines
    water_increment_pipeline: GPUComputePipeline;
    outflow_flux_pipeline: GPUComputePipeline;
    water_velocity_pipeline: GPUComputePipeline;
    erosion_deposition_pipeline: GPUComputePipeline;
    transportation_pipeline: GPUComputePipeline;
    evaporation_pipeline: GPUComputePipeline;

    // for visualization
    view_bind_group_layout: GPUBindGroupLayout;
    view_bind_group: GPUBindGroup;
    view_type_buffer: GPUBuffer;

    // for parameters
    params_bind_group_layout: GPUBindGroupLayout;
    params_bind_group: GPUBindGroup;
    timestep_param_buffer: GPUBuffer;
    rainfall_param_buffer: GPUBuffer;
    g_param_buffer: GPUBuffer;
    kc_param_buffer: GPUBuffer;
    ks_param_buffer: GPUBuffer;
    kd_param_buffer: GPUBuffer;
    evaporation_param_buffer: GPUBuffer;
    terrain_height_param_buffer: GPUBuffer;
    terrain_width_param_buffer: GPUBuffer;
    terrain_height: number = 200;

    constructor(device: GPUDevice) {
        this.device = device;
        this.init_textures();
        this.init_viz_and_params();

        this.init_water_increment_pipeline();
        this.init_outflow_flux_pipeline();
        this.init_water_velocity_pipeline();
        this.init_erosion_deposition_pipeline();
        this.init_transportation_pipeline();
        this.init_evaporation_pipeline();

        this.reset_heightmap();
        this.update_texture_bind_groups();
    }

    init_textures() {
        /*
         *  T1 HOLDS : B (terrain height) D (water height) S (sediments)
         *  T2 HOLDS : ->F (outgoing flow in all 4 directions)
         *  T3 HOLDS : ->V (velocity field)
         */

        if (this.next_resolution) {
            this.RESOLUTION = this.next_resolution;
        }

        if (this.t1_read) this.t1_read.destroy();

        this.t1_read = this.device.createTexture({
            label: "t1 read",
            size: { width: this.RESOLUTION, height: this.RESOLUTION },
            format: "rgba32float",
            usage:
                GPUTextureUsage.STORAGE_BINDING |
                GPUTextureUsage.TEXTURE_BINDING |
                GPUTextureUsage.COPY_DST,
        });
        this.t1_write = this.device.createTexture({
            label: "t1 write",
            size: { width: this.RESOLUTION, height: this.RESOLUTION },
            format: "rgba32float",
            usage:
                GPUTextureUsage.STORAGE_BINDING |
                GPUTextureUsage.TEXTURE_BINDING |
                GPUTextureUsage.COPY_SRC,
        });
        this.t2_read = this.device.createTexture({
            label: "t2 read",
            size: { width: this.RESOLUTION, height: this.RESOLUTION },
            format: "rgba32float",
            usage:
                GPUTextureUsage.STORAGE_BINDING |
                GPUTextureUsage.TEXTURE_BINDING |
                GPUTextureUsage.COPY_DST,
        });
        this.t2_write = this.device.createTexture({
            label: "t2 write",
            size: { width: this.RESOLUTION, height: this.RESOLUTION },
            format: "rgba32float",
            usage:
                GPUTextureUsage.STORAGE_BINDING |
                GPUTextureUsage.TEXTURE_BINDING |
                GPUTextureUsage.COPY_SRC,
        });
        this.t3_read = this.device.createTexture({
            label: "t3 read",
            size: { width: this.RESOLUTION, height: this.RESOLUTION },
            format: "rg32float",
            usage:
                GPUTextureUsage.STORAGE_BINDING |
                GPUTextureUsage.TEXTURE_BINDING |
                GPUTextureUsage.COPY_DST,
        });
        this.t3_write = this.device.createTexture({
            label: "t3 write",
            size: { width: this.RESOLUTION, height: this.RESOLUTION },
            format: "rg32float",
            usage:
                GPUTextureUsage.STORAGE_BINDING |
                GPUTextureUsage.TEXTURE_BINDING |
                GPUTextureUsage.COPY_SRC,
        });
    }

    reset_heightmap() {
        /*
         *   POPULATE HEIGHT TEXTURE WITH PERLIN NOISE
         */
        const noise = new Perlin();
        const offset_x = Math.random() * 10.0;
        const offset_y = Math.random() * 10.0;
        const heightmap = new Float32Array(
            this.RESOLUTION * this.RESOLUTION * 4
        ).map((e, i, a) => {
            if (i % 4 == 0) {
                let x = i / 4 / this.RESOLUTION;
                let y = (i / 4) % this.RESOLUTION;
                return (
                    noise.perlin(
                        (x / this.RESOLUTION + offset_x) * 6,
                        (y / this.RESOLUTION + offset_y) * 6
                    ) * this.terrain_height
                );
            }
            return 0;
        });
        this.device.queue.writeTexture(
            { texture: this.t1_read },
            heightmap,
            { bytesPerRow: 4 * 4 * this.RESOLUTION },
            { width: this.RESOLUTION, height: this.RESOLUTION }
        );

        // clear the other textures
        this.device.queue.writeTexture(
            { texture: this.t2_read },
            new Float32Array(this.RESOLUTION * this.RESOLUTION * 4),
            {
                offset: 0,
                bytesPerRow: 4 * 4 * this.RESOLUTION,
                rowsPerImage: this.RESOLUTION,
            },
            { width: this.RESOLUTION, height: this.RESOLUTION }
        );

        this.device.queue.writeTexture(
            { texture: this.t3_read },
            new Float32Array(this.RESOLUTION * this.RESOLUTION * 2),
            {
                offset: 0,
                bytesPerRow: 4 * 2 * this.RESOLUTION,
                rowsPerImage: this.RESOLUTION,
            },
            { width: this.RESOLUTION, height: this.RESOLUTION }
        );

        // update the scale uniforms
        this.device.queue.writeBuffer(
            this.terrain_height_param_buffer,
            0,
            new Float32Array([this.terrain_height])
        );
    }

    init_viz_and_params() {
        this.view_type_buffer = this.device.createBuffer({
            label: "visualization type buffer",
            size: 4,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });

        this.view_bind_group_layout = this.device.createBindGroupLayout({
            label: "visualization bind group layout",
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                    texture: { sampleType: "unfilterable-float" },
                },
                {
                    binding: 1,
                    visibility: GPUShaderStage.FRAGMENT,
                    texture: { sampleType: "unfilterable-float" },
                },
                {
                    binding: 2,
                    visibility: GPUShaderStage.FRAGMENT,
                    texture: { sampleType: "unfilterable-float" },
                },
                {
                    binding: 3,
                    visibility: GPUShaderStage.FRAGMENT,
                    buffer: {},
                },
            ],
        });

        this.params_bind_group_layout = this.device.createBindGroupLayout({
            label: "parameters bind group layout",
            entries: [
                {
                    binding: 0, // timestep
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {},
                },
                {
                    binding: 1, // rainfall
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {},
                },
                {
                    binding: 2, // gravity
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {},
                },
                {
                    binding: 3, // kc
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {},
                },
                {
                    binding: 4, // ks
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {},
                },
                {
                    binding: 5, // kd
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {},
                },
                {
                    binding: 6, // evaporation
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {},
                },
                {
                    binding: 7, // terrain height
                    visibility: GPUShaderStage.COMPUTE | GPUShaderStage.VERTEX,
                    buffer: {},
                },
            ],
        });

        this.timestep_param_buffer = this.device.createBuffer({
            label: "timestep parameter buffer",
            size: 4,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });

        this.rainfall_param_buffer = this.device.createBuffer({
            label: "rainfall parameter buffer",
            size: 4,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });

        this.g_param_buffer = this.device.createBuffer({
            label: "gravity parameter buffer",
            size: 4,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });

        this.kc_param_buffer = this.device.createBuffer({
            label: "kc parameter buffer",
            size: 4,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });

        this.ks_param_buffer = this.device.createBuffer({
            label: "ks parameter buffer",
            size: 4,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });

        this.kd_param_buffer = this.device.createBuffer({
            label: "kd parameter buffer",
            size: 4,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });

        this.evaporation_param_buffer = this.device.createBuffer({
            label: "evaporation parameter buffer",
            size: 4,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });

        this.terrain_height_param_buffer = this.device.createBuffer({
            label: "terrain height parameter buffer",
            size: 4,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });

        this.terrain_width_param_buffer = this.device.createBuffer({
            label: "terrain width parameter buffer",
            size: 4,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });

        this.params_bind_group = this.device.createBindGroup({
            label: "parameters bind group",
            layout: this.params_bind_group_layout,
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: this.timestep_param_buffer,
                    },
                },
                {
                    binding: 1,
                    resource: {
                        buffer: this.rainfall_param_buffer,
                    },
                },
                {
                    binding: 2,
                    resource: {
                        buffer: this.g_param_buffer,
                    },
                },
                {
                    binding: 3,
                    resource: {
                        buffer: this.kc_param_buffer,
                    },
                },
                {
                    binding: 4,
                    resource: {
                        buffer: this.ks_param_buffer,
                    },
                },
                {
                    binding: 5,
                    resource: {
                        buffer: this.kd_param_buffer,
                    },
                },
                {
                    binding: 6,
                    resource: {
                        buffer: this.evaporation_param_buffer,
                    },
                },
                {
                    binding: 7,
                    resource: {
                        buffer: this.terrain_height_param_buffer,
                    },
                },
            ],
        });
    }

    init_water_increment_pipeline() {
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

        this.water_increment_shader = this.device.createShaderModule({
            label: "Water Increment Shader",
            code: water_increment_shader_string,
        });

        let water_increment_pipeline_layout = this.device.createPipelineLayout({
            bindGroupLayouts: [
                this.water_increment_bind_group_layout,
                this.params_bind_group_layout,
            ],
        });

        this.water_increment_pipeline = this.device.createComputePipeline({
            label: "Water Increment Compute Pipeline",
            compute: {
                module: this.water_increment_shader,
            },
            layout: water_increment_pipeline_layout,
        });
    }

    init_outflow_flux_pipeline() {
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

        this.outflow_flux_shader = this.device.createShaderModule({
            label: "Outflow Flux Shader",
            code: outflow_flux_shader_string,
        });

        let outflow_flux_pipeline_layout = this.device.createPipelineLayout({
            bindGroupLayouts: [
                this.outflow_flux_bind_group_layout,
                this.params_bind_group_layout,
            ],
        });

        this.outflow_flux_pipeline = this.device.createComputePipeline({
            label: "Outflow Flux Compute Pipeline",
            compute: {
                module: this.outflow_flux_shader,
            },
            layout: outflow_flux_pipeline_layout,
        });
    }

    init_water_velocity_pipeline() {
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
                            format: "rg32float",
                        },
                    },
                ],
            });

        this.water_velocity_shader = this.device.createShaderModule({
            label: "Water Velocity Shader",
            code: water_velocity_shader_string,
        });

        let water_velocity_pipeline_layout = this.device.createPipelineLayout({
            bindGroupLayouts: [
                this.water_velocity_bind_group_layout,
                this.params_bind_group_layout,
            ],
        });

        this.water_velocity_pipeline = this.device.createComputePipeline({
            label: "Water Velocity Compute Pipeline",
            compute: {
                module: this.water_velocity_shader,
            },
            layout: water_velocity_pipeline_layout,
        });
    }

    init_erosion_deposition_pipeline() {
        this.erosion_deposition_bind_group_layout =
            this.device.createBindGroupLayout({
                label: "Erosion Deposition Bindgroup Layout",
                entries: [
                    // b, s in
                    {
                        binding: 0,
                        visibility: GPUShaderStage.COMPUTE,
                        storageTexture: {
                            access: "read-only",
                            format: "rgba32float",
                        },
                    },
                    // v in
                    {
                        binding: 1,
                        visibility: GPUShaderStage.COMPUTE,
                        storageTexture: {
                            access: "read-only",
                            format: "rg32float",
                        },
                    },
                    // b, s out
                    {
                        binding: 2,
                        visibility: GPUShaderStage.COMPUTE,
                        storageTexture: {
                            access: "write-only",
                            format: "rgba32float",
                        },
                    },
                ],
            });

        this.erosion_deposition_shader = this.device.createShaderModule({
            label: "Erosion Deposition Shader",
            code: erosion_deposition_shader_string,
        });

        let erosion_deposition_pipeline_layout =
            this.device.createPipelineLayout({
                bindGroupLayouts: [
                    this.erosion_deposition_bind_group_layout,
                    this.params_bind_group_layout,
                ],
            });

        this.erosion_deposition_pipeline = this.device.createComputePipeline({
            label: "Erosion Deposition Compute Pipeline",
            compute: {
                module: this.erosion_deposition_shader,
            },
            layout: erosion_deposition_pipeline_layout,
        });
    }

    init_transportation_pipeline() {
        this.transportation_bind_group_layout =
            this.device.createBindGroupLayout({
                label: "Transportation Bindgroup Layout",
                entries: [
                    // s in
                    {
                        binding: 0,
                        visibility: GPUShaderStage.COMPUTE,
                        storageTexture: {
                            access: "read-only",
                            format: "rgba32float",
                        },
                    },
                    // v in
                    {
                        binding: 1,
                        visibility: GPUShaderStage.COMPUTE,
                        storageTexture: {
                            access: "read-only",
                            format: "rg32float",
                        },
                    },
                    // s out
                    {
                        binding: 2,
                        visibility: GPUShaderStage.COMPUTE,
                        storageTexture: {
                            access: "write-only",
                            format: "rgba32float",
                        },
                    },
                ],
            });

        this.transportation_shader = this.device.createShaderModule({
            label: "Transportation Shader",
            code: transportation_shader_string,
        });

        let transportation_pipeline_layout = this.device.createPipelineLayout({
            bindGroupLayouts: [
                this.transportation_bind_group_layout,
                this.params_bind_group_layout,
            ],
        });

        this.transportation_pipeline = this.device.createComputePipeline({
            label: "Transportation Compute Pipeline",
            compute: {
                module: this.transportation_shader,
            },
            layout: transportation_pipeline_layout,
        });
    }

    init_evaporation_pipeline() {
        this.evaporation_bind_group_layout = this.device.createBindGroupLayout({
            label: "Evaporation Bindgroup Layout",
            entries: [
                // d in
                {
                    binding: 0,
                    visibility: GPUShaderStage.COMPUTE,
                    storageTexture: {
                        access: "read-only",
                        format: "rgba32float",
                    },
                },
                // d out
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

        this.evaporation_shader = this.device.createShaderModule({
            label: "Evaporation Shader",
            code: evaporation_shader_string,
        });

        let evaporation_pipeline_layout = this.device.createPipelineLayout({
            bindGroupLayouts: [
                this.evaporation_bind_group_layout,
                this.params_bind_group_layout,
            ],
        });

        this.evaporation_pipeline = this.device.createComputePipeline({
            label: "Evaportation Compute Pipeline",
            compute: {
                module: this.evaporation_shader,
            },
            layout: evaporation_pipeline_layout,
        });
    }

    update_texture_bind_groups() {
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

        this.erosion_deposition_bind_group = this.device.createBindGroup({
            label: "Erosion Deposition Bind Group",
            layout: this.erosion_deposition_bind_group_layout,
            entries: [
                {
                    binding: 0,
                    resource: this.t1_read.createView(),
                },
                {
                    binding: 1,
                    resource: this.t3_read.createView(),
                },
                {
                    binding: 2,
                    resource: this.t1_write.createView(),
                },
            ],
        });

        this.transportation_bind_group = this.device.createBindGroup({
            label: "Transportation Bind Group",
            layout: this.transportation_bind_group_layout,
            entries: [
                {
                    binding: 0,
                    resource: this.t1_read.createView(),
                },
                {
                    binding: 1,
                    resource: this.t3_read.createView(),
                },
                {
                    binding: 2,
                    resource: this.t1_write.createView(),
                },
            ],
        });

        this.evaporation_bind_group = this.device.createBindGroup({
            label: "Evaporation Bind Group",
            layout: this.evaporation_bind_group_layout,
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

        this.view_bind_group = this.device.createBindGroup({
            label: "visualization bind group",
            layout: this.view_bind_group_layout,
            entries: [
                {
                    binding: 0,
                    resource: this.t1_read.createView({
                        format: "rgba32float",
                    }),
                },
                {
                    binding: 1,
                    resource: this.t2_read.createView({
                        format: "rgba32float",
                    }),
                },
                {
                    binding: 2,
                    resource: this.t3_read.createView({ format: "rg32float" }),
                },
                {
                    binding: 3,
                    resource: {
                        buffer: this.view_type_buffer,
                    },
                },
            ],
        });
    }

    encode_water_increment(encoder: GPUCommandEncoder) {
        const pass = encoder.beginComputePass();
        pass.setPipeline(this.water_increment_pipeline);
        pass.setBindGroup(0, this.water_increment_bind_group);
        pass.setBindGroup(1, this.params_bind_group);
        pass.dispatchWorkgroups(this.RESOLUTION / 16, this.RESOLUTION / 16);
        pass.end();
        encoder.copyTextureToTexture(
            { texture: this.t1_write },
            { texture: this.t1_read },
            { width: this.RESOLUTION, height: this.RESOLUTION }
        );
    }

    encode_outflow_flux(encoder: GPUCommandEncoder) {
        const pass = encoder.beginComputePass();
        pass.setPipeline(this.outflow_flux_pipeline);
        pass.setBindGroup(0, this.outflow_flux_bind_group);
        pass.setBindGroup(1, this.params_bind_group);
        pass.dispatchWorkgroups(this.RESOLUTION / 16, this.RESOLUTION / 16);
        pass.end();
        encoder.copyTextureToTexture(
            { texture: this.t2_write },
            { texture: this.t2_read },
            { width: this.RESOLUTION, height: this.RESOLUTION }
        );
    }

    encode_water_velocity(encoder: GPUCommandEncoder) {
        const pass = encoder.beginComputePass();
        pass.setPipeline(this.water_velocity_pipeline);
        pass.setBindGroup(0, this.water_velocity_bind_group);
        pass.setBindGroup(1, this.params_bind_group);
        pass.dispatchWorkgroups(this.RESOLUTION / 16, this.RESOLUTION / 16);
        pass.end();
        encoder.copyTextureToTexture(
            { texture: this.t1_write },
            { texture: this.t1_read },
            { width: this.RESOLUTION, height: this.RESOLUTION }
        );
        encoder.copyTextureToTexture(
            { texture: this.t3_write },
            { texture: this.t3_read },
            { width: this.RESOLUTION, height: this.RESOLUTION }
        );
    }

    encode_erosion_deposition(encoder: GPUCommandEncoder) {
        const pass = encoder.beginComputePass();
        pass.setPipeline(this.erosion_deposition_pipeline);
        pass.setBindGroup(0, this.erosion_deposition_bind_group);
        pass.setBindGroup(1, this.params_bind_group);
        pass.dispatchWorkgroups(this.RESOLUTION / 16, this.RESOLUTION / 16);
        pass.end();
        encoder.copyTextureToTexture(
            { texture: this.t1_write },
            { texture: this.t1_read },
            { width: this.RESOLUTION, height: this.RESOLUTION }
        );
    }

    encode_transportation(encoder: GPUCommandEncoder) {
        const pass = encoder.beginComputePass();
        pass.setPipeline(this.transportation_pipeline);
        pass.setBindGroup(0, this.transportation_bind_group);
        pass.setBindGroup(1, this.params_bind_group);
        pass.dispatchWorkgroups(this.RESOLUTION / 16, this.RESOLUTION / 16);
        pass.end();
        encoder.copyTextureToTexture(
            { texture: this.t1_write },
            { texture: this.t1_read },
            { width: this.RESOLUTION, height: this.RESOLUTION }
        );
    }

    encode_evaporation(encoder: GPUCommandEncoder) {
        const pass = encoder.beginComputePass();
        pass.setPipeline(this.evaporation_pipeline);
        pass.setBindGroup(0, this.evaporation_bind_group);
        pass.setBindGroup(1, this.params_bind_group);
        pass.dispatchWorkgroups(this.RESOLUTION / 16, this.RESOLUTION / 16);
        pass.end();
        encoder.copyTextureToTexture(
            { texture: this.t1_write },
            { texture: this.t1_read },
            { width: this.RESOLUTION, height: this.RESOLUTION }
        );
    }

    encode_full_step(encoder: GPUCommandEncoder) {
        this.encode_water_increment(encoder);
        this.encode_outflow_flux(encoder);
        this.encode_water_velocity(encoder);
        this.encode_erosion_deposition(encoder);
        this.encode_transportation(encoder);
        this.encode_evaporation(encoder);
    }
}
