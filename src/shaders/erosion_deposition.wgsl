@group(0) @binding(0)
var bds_read: texture_storage_2d<rgba32float, read>;

@group(0) @binding(1)
var v_read: texture_storage_2d<rg32float, read>;

@group(0) @binding(2)
var bds_write: texture_storage_2d<rgba32float, write>;

@group(1) @binding(3)
var<uniform> K_C: f32;

@group(1) @binding(4)
var<uniform> K_S: f32;

@group(1) @binding(5)
var<uniform> K_D: f32;

@compute @workgroup_size(16, 16) fn ComputeMain(@builtin(global_invocation_id) id: vec3<u32>) {
    let dim = textureDimensions(bds_read);

    // find the "local tilt angle"
    let bds = textureLoad(bds_read, id.xy);

    var h_l : f32 = bds[0];
    if(id.x != 0) {
        h_l = textureLoad(bds_read, id.xy - vec2u(1, 0)).r;  
    } 
    var h_r : f32 = bds[0];
    if(id.x != (dim.x - 1)) {
        h_r = textureLoad(bds_read, id.xy + vec2u(1, 0)).r;
    } 
    var h_t : f32 = bds[0];
    if(id.y != (dim.y - 1)) {
        h_t = textureLoad(bds_read, id.xy + vec2u(0, 1)).r;
    } 
    var h_b : f32 = bds[0];
    if(id.y != 0) {
        h_b = textureLoad(bds_read, id.xy - vec2u(0, 1)).r;
    }

    let grad_x : f32 = (h_r - h_l) / 2.0;
    let grad_y : f32 = (h_t - h_b) / 2.0;

    let sin_a : f32 = sqrt(pow(grad_x, 2) + pow(grad_y, 2)) / sqrt(1 + pow(grad_x, 2) + pow(grad_y, 2));

    // calculate the capacity

    let v : vec2f = textureLoad(v_read, id.xy).xy;
    let c : f32 = K_C * sin_a * length(v);
    let s : f32 = bds[2];

    var b_change : f32 = 0;
    var s_change : f32 = 0;

    if(c > s) {
        // terrain dissolved into sediment
        b_change = -K_S * (c - s);
        s_change = K_S * (c - s);   
    }

    if(c < s) {
        // sediment deposit into terrain
        b_change = K_D * (s - c);
        s_change = -K_D * (s - c);
    }

    textureStore(bds_write, id.xy, bds + vec4f(b_change, 0, s_change, 0));
}