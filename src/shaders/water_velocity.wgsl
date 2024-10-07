@group(0) @binding(0)
var f_read: texture_storage_2d<rgba32float, read>;

@group(0) @binding(1)
var bds_read: texture_storage_2d<rgba32float, read>;

@group(0) @binding(2)
var bds_write : texture_storage_2d<rgba32float, write>;

@group(0) @binding(3)
var v_write : texture_storage_2d<rg32float, write>;

@group(1) @binding(0)
var<uniform> timestep: f32;

@compute @workgroup_size(16, 16) fn ComputeMain(@builtin(global_invocation_id) id: vec3<u32>) {
    
    let dim = textureDimensions(bds_read);

    // STEP 1 : update water based on incoming and outgoing flux

    // flux in from the left
    // f in from the left for (x, y) = f out to the right for (x - 1, y)
    var f_in_l : f32 = 0;
    if(id.x != 0) {
        f_in_l = textureLoad(f_read, id.xy - vec2u(1, 0))[1]; 
    }

    var f_in_r : f32 = 0;
    if(id.x != (dim.x - 1)) {
        f_in_r = textureLoad(f_read, id.xy + vec2u(1, 0))[0];
    }

    var f_in_t : f32 = 0;
    if(id.y != (dim.y - 1)) {
        f_in_t = textureLoad(f_read, id.xy + vec2u(0, 1))[3];
    }

    var f_in_b : f32 = 0;
    if(id.y != 0) {
        f_in_b = textureLoad(f_read, id.xy - vec2u(0, 1))[2];
    }

    let total_in : f32 = f_in_l + f_in_r + f_in_t + f_in_b;

    let f_out : vec4f = textureLoad(f_read, id.xy);
    let total_out : f32 = f_out[0] + f_out[1] + f_out[2] + f_out[3];

   // FIXME : add the scaling by lx * ly
    let volume : f32 = timestep *(total_in - total_out);

    let bds = textureLoad(bds_read, id.xy);
    let bds_new = bds + vec4f(0, volume, 0, 0);

    textureStore(bds_write, id.xy, bds_new);

    // STEP 2 : calculate the velocity field
    let water_amount_u : f32 = (f_in_l - f_out[0] + f_out[1] - f_in_l) / 2.0;
    let water_amount_v : f32 = (f_in_b - f_out[3] + f_out[2] - f_in_t) / 2.0;

    let average_water : f32 = (bds[1] + bds_new[1]) / 2.0;

    let v: vec2f = vec2f(water_amount_u / average_water, water_amount_v / average_water);

    textureStore(v_write, id.xy, vec4f(v, 0.0, 0.0));
}