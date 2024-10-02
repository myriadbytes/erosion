struct Vertex {
    @location(0) pos: vec3f,
    @location(1) uv: vec2f,
}

struct VertexOut {
    @builtin(position) pos: vec4f,
    @location(0) uv: vec2f,
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

@vertex
fn vertexMain(in: Vertex) -> VertexOut {
    var out: VertexOut;

    let height : f32 = textureLoad(terrain_texture, vec2u(in.uv * 511.0), 0).r * 0.1;

    out.pos = proj * view * vec4f(in.pos + vec3f(0, height, 0), 1.0);
    out.uv = in.uv;

    return out;
}

@fragment
fn fragmentMain(in: VertexOut) -> @location(0) vec4f {
    const terrain_color_dark = vec3f(98./255., 69./255., 45./255.);
    const terrain_color_light = vec3f(167./255., 117./255., 77./255.);
  
    let height = textureSample(terrain_texture, viz_sampler, in.uv)[0];
    let terrain_diffuse = mix(terrain_color_dark, terrain_color_light, height);

    const water_color = vec3f(82./255., 139./255., 255./255.);
    let water = textureSample(terrain_texture, viz_sampler, in.uv)[1];

    let flow = textureSample(flow_texture, viz_sampler, in.uv);
    let flow_color = vec3f(flow[0] - flow[1], flow[2] - flow[3], 0.0);

    return vec4f(mix(terrain_diffuse, water_color, water), 1.0);

    //return vec4f(in.uv, 0.0, 1.0);

    //return textureSample(terrain_texture, viz_sampler, in.uv);

    //return textureSample(flow_texture, viz_sampler, in.uv);
} 