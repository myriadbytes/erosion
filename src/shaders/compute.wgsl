@group(0) @binding(0)
var t1: texture_storage_2d<r32float, read_write>;

@compute @workgroup_size(32) fn computeSomething(@builtin(global_invocation_id) id: vec3<u32>) {
    let pixel = textureLoad(t1, id.xy);
    textureStore(t1, id.xy, 1 - pixel);
}