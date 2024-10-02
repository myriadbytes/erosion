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

    out.pos = proj * view * vec4f(in.pos + vec3f(0, clamp(height, -.5, .5), 0), 1.0);
    out.uv = in.uv;

    return out;
}

@fragment
fn fragmentMain(in: VertexOut) -> @location(0) vec4f {
    const terrain_color_dark = vec3f(88./255., 59./255., 35./255.);
    const terrain_color_light = vec3f(177./255., 127./255., 87./255.);
  
    let height = textureSample(terrain_texture, viz_sampler, in.uv)[0];
    let terrain_diffuse = mix(terrain_color_dark, terrain_color_light, height);

    const water_color = vec3f(82./255., 139./255., 255./255.);
    let water = textureSample(terrain_texture, viz_sampler, in.uv)[1];

    let flow = textureSample(flow_texture, viz_sampler, in.uv);
    let v = textureSample(velocity_texture, viz_sampler, in.uv);

    let sediment = textureSample(terrain_texture, viz_sampler, in.uv)[2];

    //return vec4f(sediment * 100, sediment * 100, sediment * 100, 1.0);

    //return vec4f(v.xy, 1.0, 1.0);

    return vec4f(mix(terrain_diffuse, water_color, water * 10), 1.0);

    //return vec4f(flow.r * 50., flow.g * 50., flow.b * 50., 1.0);
} 