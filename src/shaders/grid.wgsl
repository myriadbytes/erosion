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

@vertex
fn vertexMain(in: Vertex) -> VertexOut {
    var out: VertexOut;

    let dim = textureDimensions(terrain_texture);
    let height : f32 = textureLoad(terrain_texture, vec2u(in.uv * f32(dim.x - 1)), 0).r * 0.002;

    let delta : f32 = 1.0 / f32(dim.x);

    let height_l : f32 = textureLoad(terrain_texture, vec2u((in.uv) * f32(dim.x - 1)) - vec2u(1, 0), 0).r * 0.002;
    let height_r : f32 = textureLoad(terrain_texture, vec2u((in.uv) * f32(dim.x - 1)) + vec2u(1, 0), 0).r * 0.002;
    let height_t : f32 = textureLoad(terrain_texture, vec2u((in.uv) * f32(dim.x - 1)) + vec2u(0, 1), 0).r * 0.002;
    let height_b : f32 = textureLoad(terrain_texture, vec2u((in.uv) * f32(dim.x - 1)) - vec2u(0, 1), 0).r * 0.002;

    let tangent = vec3f(2 * delta, height_r - height_l, 0.0);
    let bitangent = vec3f(0.0, height_t - height_b, 2 * delta);

    out.normal = -normalize(cross(tangent, bitangent));

    out.pos = proj * view * vec4f(in.pos + vec3f(0, clamp(height, -.5, .5), 0), 1.0);

    //out.pos = proj * view * vec4f(in.pos, 1.0);
    out.uv = in.uv;

    return out;
}

@fragment
fn fragmentMain(in: VertexOut) -> @location(0) vec4f {
    const terrain_color_dark = vec3f(88./255., 59./255., 35./255.);
    const terrain_color_light = vec3f(177./255., 127./255., 87./255.);
    const sediment_color = vec3f(254./255., 215./255., 102./255.);
  
    let height = textureSample(terrain_texture, viz_sampler, in.uv)[0] / 100;
    let terrain_diffuse = mix(terrain_color_dark, terrain_color_light, height);

    const water_color = vec3f(82./255., 139./255., 255./255.);
    let water = textureSample(terrain_texture, viz_sampler, in.uv)[1];

    let flow = textureSample(flow_texture, viz_sampler, in.uv);
    let v = textureSample(velocity_texture, viz_sampler, in.uv);

    let sediment = textureSample(terrain_texture, viz_sampler, in.uv)[2];

    //return vec4f(v.xy, 0.0, 1.0);

    // DEBUG TERRAIN
    if(visualization_type == 0){
        //return vec4f(mix(mix(terrain_diffuse, sediment_color, sediment*30), water_color, water * 5), 1.0);
        //return vec4f(mix(terrain_diffuse, water_color, water * 10), 1.0);

        //return(vec4f((in.normal + 1) / 2, 1.0));

        let light = normalize(vec3f(0, 1, 1));
        let lambert = dot(in.normal, light);
        return vec4f(lambert, lambert, lambert, 1.0);
    }

    // DEBUG FLUX
    if(visualization_type == 1){
        return vec4f(flow[0] * 1000, 0.0, flow[1] * 1000, 1.0);
    }
    if(visualization_type == 2){
        return vec4f(flow[2] * 1000, 0.0, flow[3] * 1000, 1.0);
    }

    // DEBUG VELOCITY FIELD
    if(visualization_type == 3){
        if(v.x > 0) {
            return vec4f(v.x * 5, 0.0, 0.0, 1.0);
        } else {
            return vec4f(0.0, 0.0, abs(v.x) * 5, 1.0);
        }
    }
    if(visualization_type == 4){
        if(v.y > 0) {
            return vec4f(v.y * 5, 0.0, 0.0, 1.0);
        } else {
            return vec4f(0.0, 0.0, abs(v.y) * 5, 1.0);
        }
    }

    // DEBUG SEDIMENTS
    if(visualization_type == 5){
        return vec4f(sediment * 30, sediment * 30, sediment * 30, 1.0);
    }

    return vec4f(1.0, 0.0, 0.0, 1.0);


    //return textureSample(terrain_texture, viz_sampler, in.uv);
} 