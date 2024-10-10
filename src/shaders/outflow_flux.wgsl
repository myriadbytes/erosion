@group(0) @binding(0)
var bds_read: texture_storage_2d<rgba32float, read>;

@group(0) @binding(1)
var f_read: texture_storage_2d<rgba32float, read>;

@group(0) @binding(2)
var f_write: texture_storage_2d<rgba32float, write>;

@group(1) @binding(0)
var<uniform> timestep: f32;

@group(1) @binding(2)
var<uniform> g: f32;

@group(1) @binding(7)
var<uniform> terrain_height_scale: f32;

const a: f32 = 10.0;

@compute @workgroup_size(16, 16) fn ComputeMain(@builtin(global_invocation_id) id: vec3<u32>) {

    let dim = textureDimensions(bds_read);

    let bd : vec2f = textureLoad(bds_read, id.xy).rg;

    //let l : f32 = terrain_width_scale / f32(dim.x);
    const l = 1.0;

    // height difference
    var h_l : f32 = 0.0;
    if(id.x != 0) {
        let bd_l : vec2f = textureLoad(bds_read, id.xy - vec2u(1, 0)).rg;
        h_l = bd[0] + bd[1] - bd_l[0] - bd_l[1];
    } 

    var h_r : f32 = 0.0;
    if(id.x != (dim.x - 1)) {
        let bd_r : vec2f = textureLoad(bds_read, id.xy + vec2u(1, 0)).rg;
        h_r = bd[0] + bd[1] - bd_r[0] - bd_r[1];
    } 

    var h_t : f32 = 0.0;
    if(id.y != (dim.y - 1)) {
        let bd_t : vec2f = textureLoad(bds_read, id.xy + vec2u(0, 1)).rg;
        h_t = bd[0] + bd[1] - bd_t[0] - bd_t[1];
    } 

    var h_b : f32 = 0.0;
    if(id.y != 0) {
        let bd_b : vec2f = textureLoad(bds_read, id.xy - vec2u(0, 1)).rg;
        h_b = bd[0] + bd[1] - bd_b[0] - bd_b[1];
    }
    
    // outgoing flux
    let f : vec4f = textureLoad(f_read, id.xy);

    let f_l = max(0, f[0] + timestep * a * ((g * h_l) / l));
    let f_r = max(0, f[1] + timestep * a * ((g * h_r) / l));
    let f_t = max(0, f[2] + timestep * a * ((g * h_t) / l));
    let f_b = max(0, f[3] + timestep * a * ((g * h_b) / l));

    let f_new = f + vec4f(f_l, f_r, f_t, f_b);

    // FIXME : sort out the values for lx * ly
    let k = min(1, (bd[1] * l * l)/ ((f_new[0] + f_new[1] + f_new[2] + f_new[3]) * timestep)); // scaling factor

    textureStore(f_write, id.xy, k * f_new);
}