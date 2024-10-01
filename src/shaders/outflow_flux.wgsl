@group(0) @binding(0)
var bds_read: texture_storage_2d<rgba32float, read>;

@group(0) @binding(1)
var f_read: texture_storage_2d<rgba32float, read>;

@group(0) @binding(2)
var f_write: texture_storage_2d<rgba32float, write>;

const a: f32 = 1.0;
const g: f32 = 6.67;
const l: f32 = 1.0;

@compute @workgroup_size(16, 16) fn ComputeMain(@builtin(global_invocation_id) id: vec3<u32>) {

    let dim = textureDimensions(bds_read);

    let bd : vec2f = textureLoad(bds_read, id.xy).rg;

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

    let k = min(1, (bd[1] * l * l) / (f[0] + f[1] + f[2] + f[3])); // scaling factor

    let f_l = max(0, f[0] + a * ((g * h_l) / l));
    let f_r = max(0, f[1] + a * ((g * h_r) / l));
    let f_t = max(0, f[2] + a * ((g * h_t) / l));
    let f_b = max(0, f[3] + a * ((g * h_b) / l));

    let f_new = f + k * vec4f(f_l, f_r, f_t, f_b);

    textureStore(f_write, id.xy, f_new);
}