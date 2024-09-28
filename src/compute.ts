export class ErosionCompute {
    compute_bind_group_layout: GPUBindGroupLayout;
    compute_bind_group: GPUBindGroup;
    constructor(device: GPUDevice, heightmap_texture: GPUTexture) {
        this.compute_bind_group_layout = device.createBindGroupLayout({
            label: "Compute Bind Group Layout",
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.COMPUTE,
                    texture: {},
                },
            ],
        });

        this.compute_bind_group = device.createBindGroup({
            label: "Compute Bind Group",
            layout: this.compute_bind_group_layout,
            entries: [
                {
                    binding: 0,
                    resource: heightmap_texture.createView(),
                },
            ],
        });
    }
}
