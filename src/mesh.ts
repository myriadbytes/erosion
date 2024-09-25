function GenerateGridMesh(width: number) {
    /* // the vertex positions are in the range (-1; 1)^2
    let vertices = new Float32Array(width * width * 5); // x, y, z, u, v
    let vertex_idx = 0;
    for (let y = 0; y < width; y++) {
        for (let x = 0; x < width; x++) {
            vertices[vertex_idx++] = x / width - 0.5;
            vertices[vertex_idx++] = 0.0;
            vertices[vertex_idx++] = y / width - 0.5;
            vertices[vertex_idx++] = x / width;
            vertices[vertex_idx++] = y / width;
        }
    }

    // triangle generation : clockwise
    let indices = new Uint32Array((width - 1) * (width - 1) * 6);
    let index_idx = 0;
    for (let y = 0; y < width - 1; y++) {
        for (let x = 0; x < width - 1; x++) {
            let top_left = y * width + x;
            let top_right = top_left + 1;
            let bottom_left = (y + 1) * width + x;
            let bottom_right = bottom_left + 1;

            indices[index_idx++] = top_left;
            indices[index_idx++] = top_right;
            indices[index_idx++] = bottom_left;

            indices[index_idx++] = top_right;
            indices[index_idx++] = bottom_right;
            indices[index_idx++] = bottom_left;
        }
    }
 */

    const vertices = new Float32Array([
        -0.5, 0.5, 0, 0, 1 /**/, 0.5, 0.5, 0, 1, 1, /**/ -0.5, -0.5, 0.0, 0.0,
        0.0 /**/, 0.5, -0.5, 0.0, 1.0, 0.0,
    ]);

    const indices = new Uint32Array([0, 2, 1, 1, 2, 3]);
    return { vertices, indices };
}

export function InitGridMesh(device: GPUDevice, width: number) {
    let { vertices, indices } = GenerateGridMesh(width);

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
    new Float32Array(index_buffer.getMappedRange()).set(indices);
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

    return { vertex_buffer, index_buffer, vertex_buffer_layout };
}
