import "./style.css";
import { GridMesh } from "./mesh";
import { InitWebGPU } from "./webgpu";
import { mat4, vec3 } from "gl-matrix";

import gridShaderString from "./shaders/grid.wgsl?raw";
import { OrbitCamera } from "./camera";

const { device, context, canvasFormat } = await InitWebGPU();

const grid_mesh = new GridMesh(device, 3);

const camera = new OrbitCamera(device);

const gridShaderModule = device.createShaderModule({
    label: "Grid Shader",
    code: gridShaderString,
});

const grid_bind_group_layout = device.createBindGroupLayout({
    label: "Grid Bind Group Layout",
    entries: [
        {
            binding: 0,
            visibility: GPUShaderStage.VERTEX,
            buffer: {
                type: "uniform",
                hasDynamicOffset: false,
                minBindingSize: undefined,
            },
        },
        {
            binding: 1,
            visibility: GPUShaderStage.VERTEX,
            buffer: {
                type: "uniform",
                hasDynamicOffset: false,
                minBindingSize: undefined,
            },
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
