// terrain height
@group(0) @binding(0)
var b: texture_storage_2d<r32float, read_write>;

// water height
@group(0) @binding(1)
var d: texture_storage_2d<r32float, read_write>;

@compute @workgroup_size(16, 16) fn ErosionComputeMain(@builtin(global_invocation_id) id: vec3<u32>) {
    //let pixel = textureLoad(b, id.xy);
    //textureStore(b, id.xy, 1 - pixel);

    let water = textureLoad(d, id.xy);
    let new_water = (cos(f32(id.x)) + cos(f32(id.y))) * 0.1; 
    textureStore(d, id.xy, water + new_water);
}