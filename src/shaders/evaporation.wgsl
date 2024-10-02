@group(0) @binding(0)
var bds_read: texture_storage_2d<rgba32float, read>;

@group(0) @binding(1)
var bds_write: texture_storage_2d<rgba32float, write>;

@compute @workgroup_size(16, 16) fn ComputeMain(@builtin(global_invocation_id) id: vec3<u32>) {
    const K_E : f32 = 0.01; // evaporation constant

    let bds = textureLoad(bds_read, id.xy);
    let water = bds[1];
    
    let bds_new = vec4f(bds[0], water * (1 - K_E), bds[2], bds[3]);

    textureStore(bds_write, id.xy, bds_new);
}