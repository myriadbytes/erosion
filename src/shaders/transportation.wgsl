@group(0) @binding(0)
var bds_read: texture_storage_2d<rgba32float, read>;

@group(0) @binding(1)
var v_read: texture_storage_2d<rg32float, read>;

@group(0) @binding(2)
var bds_write: texture_storage_2d<rgba32float, write>;

@compute @workgroup_size(16, 16) fn ComputeMain(@builtin(global_invocation_id) id: vec3<u32>) {
    let dim = textureDimensions(v_read);

    let v : vec2f = textureLoad(v_read, id.xy).xy;
    
    let x : u32 = clamp(u32(f32(id.x) - v.x), 0, dim.x - 1);
    let y : u32 = clamp(u32(f32(id.y) - v.y), 0, dim.y - 1);

    let s : f32 = textureLoad(bds_read, vec2u(x, y))[2];

    let bds = textureLoad(bds_read, id.xy);
    let bds_new = vec4f(bds[0], bds[1], s, bds[3]);

    textureStore(bds_write, id.xy, bds_new);
}