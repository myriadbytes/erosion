import "./style.css";
import { GridMesh } from "./mesh";
import { InitWebGPU } from "./webgpu";
import { mat4, vec3 } from "gl-matrix";

import gridShaderString from "./shaders/grid.wgsl?raw";
import { OrbitCamera } from "./camera";
import { Perlin } from "./noise";
import { ErosionCompute } from "./compute";

const { device, context, canvasFormat, depthTexture } = await InitWebGPU();

const grid_mesh = new GridMesh(device, 100);
const camera = new OrbitCamera(device);

const HEIGHTMAP_WIDTH = 32;
const heightmap = new Float32Array(HEIGHTMAP_WIDTH * HEIGHTMAP_WIDTH).map(
    (e, i, a) => {
        const noise = new Perlin();
        let x = i / HEIGHTMAP_WIDTH;
        let y = i % HEIGHTMAP_WIDTH;
        return noise.perlin(
            (x / HEIGHTMAP_WIDTH) * 4,
            (y / HEIGHTMAP_WIDTH) * 4
        );
    }
);

const heightmap_texture = device.createTexture({
    label: "heightmap texture",
    size: [HEIGHTMAP_WIDTH, HEIGHTMAP_WIDTH],
    format: "r32float",
    usage:
        GPUTextureUsage.STORAGE_BINDING |
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.COPY_DST,
});
device.queue.writeTexture(
    { texture: heightmap_texture },
    heightmap,
    { bytesPerRow: HEIGHTMAP_WIDTH * 4 },
    { width: HEIGHTMAP_WIDTH, height: HEIGHTMAP_WIDTH }
);

const heightmap_sampler = device.createSampler({ magFilter: "linear" });

//const compute = new ErosionCompute(device, heightmap_texture);

const gridShaderModule = device.createShaderModule({
    label: "Grid Shader",
    code: gridShaderString,
});

const grid_bind_group_layout = device.createBindGroupLayout({
    label: "Grid Bind Group Layout",
    entries: [
        {
            binding: 0, // view
            visibility: GPUShaderStage.VERTEX,
            buffer: {
                type: "uniform",
                hasDynamicOffset: false,
                minBindingSize: undefined,
            },
        },
        {
            binding: 1, // proj
            visibility: GPUShaderStage.VERTEX,
            buffer: {
                type: "uniform",
                hasDynamicOffset: false,
                minBindingSize: undefined,
            },
        },
        {
            binding: 2, // heightmap sampler
            visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
            sampler: {},
        },
        {
            binding: 3, // heightmap f32 texture
            visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
            texture: {},
        },
    ],
});

const grid_bind_group = device.createBindGroup({
    label: "Grid Bind Group",
    layout: grid_bind_group_layout,
    entries: [
        {
            binding: 0,
            resource: {
                buffer: camera.view_matrix_buffer,
            },
        },
        {
            binding: 1,
            resource: {
                buffer: camera.proj_matrix_buffer,
            },
        },
        {
            binding: 2,
            resource: heightmap_sampler,
        },
        {
            binding: 3,
            resource: heightmap_texture.createView(),
        },
    ],
});

const simple_pipeline_layout = device.createPipelineLayout({
    bindGroupLayouts: [grid_bind_group_layout],
});

const simple_pipeline = device.createRenderPipeline({
    label: "Simple Pipeline",
    layout: simple_pipeline_layout,
    vertex: {
        module: gridShaderModule,
        entryPoint: "vertexMain",
        buffers: [grid_mesh.vertex_buffer_layout],
    },
    fragment: {
        module: gridShaderModule,
        entryPoint: "fragmentMain",
        targets: [
            {
                format: canvasFormat,
            },
        ],
    },
    primitive: {
        frontFace: "ccw",
        cullMode: "back",
    },
    depthStencil: {
        depthWriteEnabled: true,
        depthCompare: "less",
        format: "depth24plus",
    },
});

function render() {
    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
        colorAttachments: [
            {
                view: context.getCurrentTexture().createView(),
                loadOp: "clear",
                storeOp: "store",
                clearValue: [0.0, 0.0, 0.1, 1.0],
            },
        ],
        depthStencilAttachment: {
            view: depthTexture.createView(),
            depthClearValue: 1.0,
            depthLoadOp: "clear",
            depthStoreOp: "store",
        },
    });

    pass.setPipeline(simple_pipeline);
    pass.setVertexBuffer(0, grid_mesh.vertex_buffer);
    pass.setIndexBuffer(grid_mesh.index_buffer, "uint32");
    pass.setBindGroup(0, grid_bind_group);
    pass.drawIndexed(grid_mesh.nb_to_draw);
    pass.end();

    const commandBuffer = encoder.finish();

    device.queue.submit([commandBuffer]);

    requestAnimationFrame(render);
}

requestAnimationFrame(render);
