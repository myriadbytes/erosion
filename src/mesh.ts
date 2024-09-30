import grid_shader_string from "./shaders/grid.wgsl?raw";

export class GridMesh {
    // vertex data
    vertex_buffer: GPUBuffer;
    index_buffer: GPUBuffer;
    vertex_buffer_layout: GPUVertexBufferLayout;
    nb_to_draw: number;
    // rendering data
    shader_module: GPUShaderModule;
    bind_group_layout: GPUBindGroupLayout;
    bind_group: GPUBindGroup;
    sampler: GPUSampler;
    constructor(
        device: GPUDevice,
        resolution: number,
        view_matrix_buffer: GPUBuffer,
        proj_matrix_buffer: GPUBuffer
    ) {
        // vertex data
        let { vertices, indices } = GenerateGridMesh(resolution);

        const vertex_buffer = device.createBuffer({
            label: "Grid Vertex Buffer",
            size: vertices.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
            mappedAtCreation: true,
        });
        new Float32Array(vertex_buffer.getMappedRange()).set(vertices);
        vertex_buffer.unmap();

        const index_buffer = device.createBuffer({
            label: "Grid Index Buffer",
            size: indices.byteLength,
            usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
            mappedAtCreation: true,
        });
        new Uint32Array(index_buffer.getMappedRange()).set(indices);
        index_buffer.unmap();

        const vertex_buffer_layout: GPUVertexBufferLayout = {
            arrayStride: 5 * 4, // (x, y, z, u ,v) * sizeof(f32)
            attributes: [
                {
                    shaderLocation: 0,
                    offset: 0,
                    format: "float32x3",
                },
                {
                    shaderLocation: 1,
                    offset: 3 * 4,
                    format: "float32x2",
                },
            ],
        };

        this.vertex_buffer = vertex_buffer;
        this.index_buffer = index_buffer;
        this.vertex_buffer_layout = vertex_buffer_layout;
        this.nb_to_draw = (resolution - 1) * (resolution - 1) * 6;

        // rendering data
        this.shader_module = device.createShaderModule({
            label: "Grid Mesh Shader",
            code: grid_shader_string,
        });

        this.sampler = device.createSampler({});

        this.bind_group_layout = device.createBindGroupLayout({
            label: "Grid Mesh Bindgroup Layout",
            entries: [
                {
                    binding: 0, // view matrix
                    visibility: GPUShaderStage.VERTEX,
                    buffer: {
                        type: "uniform",
                        hasDynamicOffset: false,
                        minBindingSize: undefined,
                    },
                },
                {
                    binding: 1, // proj matrix
                    visibility: GPUShaderStage.VERTEX,
                    buffer: {
                        type: "uniform",
                        hasDynamicOffset: false,
                        minBindingSize: undefined,
                    },
                },
                {
                    binding: 2, // sampler for texture visualization
                    visibility: GPUShaderStage.FRAGMENT,
                    sampler: {},
                },
            ],
        });

        this.bind_group = device.createBindGroup({
            label: "Grid Bind Group",
            layout: this.bind_group_layout,
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: view_matrix_buffer,
                    },
                },
                {
                    binding: 1,
                    resource: {
                        buffer: proj_matrix_buffer,
                    },
                },
                { binding: 2, resource: this.sampler },
            ],
        });
    }
}

function GenerateGridMesh(resolution: number) {
    // the vertex positions are in the range (-0.5; 0.5)^2
    let vertices = new Float32Array(resolution * resolution * 5); // x, y, z, u, v
    let vertex_idx = 0;
    for (let y = 0; y < resolution; y++) {
        for (let x = 0; x < resolution; x++) {
            vertices[vertex_idx++] = x / (resolution - 1) - 0.5;
            vertices[vertex_idx++] = 0.0;
            vertices[vertex_idx++] = y / (resolution - 1) - 0.5;
            vertices[vertex_idx++] = x / (resolution - 1);
            vertices[vertex_idx++] = 1.0 - y / (resolution - 1);

            /* console.log(
                `Vertex (${x}, ${y}) ${y * resolution + x} : pos(${
                    vertices[vertex_idx - 5]
                }, ${vertices[vertex_idx - 4]})`
            ); */
        }
    }

    // triangle generation : clockwise
    let indices = new Uint32Array((resolution - 1) * (resolution - 1) * 6);
    let index_idx = 0;
    for (let y = 0; y < resolution - 1; y++) {
        for (let x = 0; x < resolution - 1; x++) {
            let top_left = y * resolution + x;
            let top_right = top_left + 1;
            let bottom_left = (y + 1) * resolution + x;
            let bottom_right = bottom_left + 1;

            indices[index_idx++] = top_left;
            indices[index_idx++] = bottom_left;
            indices[index_idx++] = top_right;

            indices[index_idx++] = top_right;
            indices[index_idx++] = bottom_left;
            indices[index_idx++] = bottom_right;

            /* console.log(`Quad (${x}, ${y}) :`);
            console.log(
                `   Triangle 1 : {${indices[index_idx - 6]}, ${
                    indices[index_idx - 5]
                }, ${indices[index_idx - 4]}}`
            );
            console.log(
                `   Triangle 2 : {${indices[index_idx - 3]}, ${
                    indices[index_idx - 2]
                }, ${indices[index_idx - 1]}}`
            ); */
        }
    }

    return { vertices, indices };
}
