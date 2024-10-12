struct Vertex {
    @location(0) pos: vec3f,
    @location(1) uv: vec2f,
}

struct VertexOut {
    @builtin(position) pos: vec4f,
    @location(0) uv: vec2f,
    @location(1) normal: vec3f
}

@group(0) @binding(0)
var <uniform> view: mat4x4<f32>;

@group(0) @binding(1)
var <uniform> proj: mat4x4<f32>;

@group(0) @binding(2)
var viz_sampler: sampler;

@group(1) @binding(0)
var terrain_texture: texture_2d<f32>;

@group(1) @binding(1)
var flow_texture: texture_2d<f32>;

@group(1) @binding(2)
var velocity_texture: texture_2d<f32>;

@group(1) @binding(3)
var<uniform> visualization_type: u32;

@group(2) @binding(7)
var<uniform> terrain_height_scale: f32;


@vertex
fn vertexMain(in: Vertex) -> VertexOut {
    var out: VertexOut;

    let dim = textureDimensions(terrain_texture);
    
    // virtual terrain is width*width*height in meterss
    // while the grid mesh is 1*1 in size
    // so we scale the height so it's in (0,1) and then apply the height/width ratio
    let height_scale = (1 / terrain_height_scale) * (terrain_height_scale / f32(dim.x));
    let height : f32 = textureLoad(terrain_texture,  vec2u(in.uv * f32(dim.x - 1)), 0).r * height_scale;
    let delta : f32 = 1.0 / f32(dim.x);

    let height_l : f32 = textureLoad(terrain_texture, vec2u((in.uv) * f32(dim.x - 1)) - vec2u(1, 0), 0).r * height_scale;
    let height_r : f32 = textureLoad(terrain_texture, vec2u((in.uv) * f32(dim.x - 1)) + vec2u(1, 0), 0).r * height_scale;
    let height_t : f32 = textureLoad(terrain_texture, vec2u((in.uv) * f32(dim.x - 1)) + vec2u(0, 1), 0).r * height_scale;
    let height_b : f32 = textureLoad(terrain_texture, vec2u((in.uv) * f32(dim.x - 1)) - vec2u(0, 1), 0).r * height_scale;

    let tangent = vec3f(2 * delta, height_r - height_l, 0.0);
    let bitangent = vec3f(0.0, height_t - height_b, 2 * delta);
    out.normal = -normalize(cross(tangent, bitangent));

    out.pos = proj * view * vec4f(in.pos + vec3f(0, height, 0), 1.0);
    out.uv = in.uv;

    return out;
}

@fragment
fn fragmentMain(in: VertexOut) -> @location(0) vec4f {
    let height = textureSample(terrain_texture, viz_sampler, in.uv)[0] / 100;
    let water = textureSample(terrain_texture, viz_sampler, in.uv)[1];
    let flow = textureSample(flow_texture, viz_sampler, in.uv);
    let v = textureSample(velocity_texture, viz_sampler, in.uv);
    let sediment = textureSample(terrain_texture, viz_sampler, in.uv)[2];

    // TERRAIN
    if(visualization_type == 0){

        const terrain_color = vec3f(121./255., 134./255., 69./255.);
        const sediment_color = vec3f(254./255., 250./255., 224./255.);
        const water_color = vec3f(39./255., 71./255., 110./255.);

        let light_dir = normalize(vec3f(1, 1, 0));
        let lambert = dot(in.normal, light_dir);
        let ambient = vec3f(0.1, 0.1, 0.1);

        let a = mix(terrain_color, sediment_color, smoothstep(0.0, 1.0, sediment));
        let b = mix(a, water_color, smoothstep(4.0, 5.0, water));

        return vec4f(b * lambert + ambient, 1.0);

        //return vec4f(mix(terrain_color, sediment_color, clamp(sediment, 0.0, 1.0)) * lambert + ambiant_color, 1.0);
    }

    // DEBUG FLUX
    if(visualization_type == 1){
        return vec4f(flow[0] / 10, 0.0, flow[1] / 10, 1.0);
    }
    if(visualization_type == 2){
        return vec4f(flow[2] / 10, 0.0, flow[3] / 10, 1.0);
    }

    // DEBUG VELOCITY FIELD
    if(visualization_type == 3){
        if(v.x > 0) {
            return vec4f(v.x, 0.0, 0.0, 1.0);
        } else {
            return vec4f(0.0, 0.0, abs(v.x), 1.0);
        }
    }
    if(visualization_type == 4){
        if(v.y > 0) {
            return vec4f(v.y, 0.0, 0.0, 1.0);
        } else {
            return vec4f(0.0, 0.0, abs(v.y), 1.0);
        }
    }

    // DEBUG SEDIMENTS
    if(visualization_type == 5){
        return vec4f(sediment , sediment, sediment , 1.0);
    }

    return vec4f(1.0, 0.0, 0.0, 1.0);


    //return textureSample(terrain_texture, viz_sampler, in.uv);
} 