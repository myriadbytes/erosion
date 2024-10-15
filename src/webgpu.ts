export async function InitWebGPU() {
    let canvas = document.querySelector("canvas")!;

    if (!navigator.gpu) {
        throw new Error("WebGPU not supported on this browser.");
    }
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
        throw new Error("No appropriate GPUAdapter found.");
    }

    const device = await adapter.requestDevice({
        requiredFeatures: [],
    });
    if (!device) {
        throw new Error(
            "Your WebGPU device doesn't support filterable float32 textures !"
        );
    }

    const context = canvas.getContext("webgpu")!;
    const canvasFormat = navigator.gpu.getPreferredCanvasFormat();
    context.configure({
        device: device,
        format: canvasFormat,
    });

    const depthTexture = device.createTexture({
        size: [canvas.width, canvas.height],
        format: "depth24plus",
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });

    return { device, context, canvasFormat, depthTexture };
}
