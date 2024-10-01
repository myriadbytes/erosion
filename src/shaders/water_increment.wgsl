@group(0) @binding(0)
var bds_read: texture_storage_2d<rgba32float, read>;

@group(0) @binding(1)
var bds_write: texture_storage_2d<rgba32float, write>;

@compute @workgroup_size(16, 16) fn ComputeMain(@builtin(global_invocation_id) id: vec3<u32>) {
    let bds = textureLoad(bds_read, id.xy);
    let rainfall = (cos(f32(id.x)) + cos(f32(id.y))) * 0.1; // just using cos to have water spots for now

    let bds_new = bds + vec4f(0, rainfall, 0, 0);
    textureStore(bds_write, id.xy, bds_new);
}