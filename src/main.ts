import "./style.css";
import { InitGridMesh } from "./mesh";

import simpleShaderString from "./shaders/simple.wgsl?raw";

async function InitWebGPU(canvas: HTMLCanvasElement) {
    if (!navigator.gpu) {
        throw new Error("WebGPU not supported on this browser.");
    }
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
        throw new Error("No appropriate GPUAdapter found.");
    }

    const device = await adapter.requestDevice();

    const context = canvas.getContext("webgpu")!;
    const canvasFormat = navigator.gpu.getPreferredCanvasFormat();
    context.configure({
        device: device,
        format: canvasFormat,
    });

    return { device, context, canvasFormat };
}

let canvas = document.querySelector("canvas")!;

const { device, context, canvasFormat } = await InitWebGPU(canvas);

const { vertex_buffer, index_buffer, vertex_buffer_layout } = InitGridMesh(
    device,
    10
);

const simpleShaderModule = device.createShaderModule({
    label: "Simple Shader",
    code: simpleShaderString,
});

const simplePipeline = device.createRenderPipeline({
    label: "Simple Pipeline",
    layout: "auto",
    vertex: {
        module: simpleShaderModule,
        entryPoint: "vertexMain",
        buffers: [vertex_buffer_layout],
    },
    fragment: {
        module: simpleShaderModule,
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

const encoder = device.createCommandEncoder();
const pass = encoder.beginRenderPass({
    colorAttachments: [
        {
            view: context.getCurrentTexture().createView(),
            loadOp: "clear",
            storeOp: "store",
            clearValue: [0.9, 0.2, 0.3, 1.0],
        },
    ],
});

pass.setPipeline(simplePipeline);
pass.setVertexBuffer(0, vertex_buffer);
pass.setIndexBuffer(index_buffer, "uint32");
pass.drawIndexed(6);
pass.end();

const commandBuffer = encoder.finish();

device.queue.submit([commandBuffer]);
