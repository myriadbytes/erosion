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
var heightmap_sampler: sampler;
@group(0) @binding(3)
var heightmap_texture: texture_2d<f32>;

fn sample_heightmap_vertex(uv: vec2f) -> f32 {
    let dims = textureDimensions(heightmap_texture) - 1;
    let scaled_uv = uv * vec2<f32>(dims);
    let coord = vec2<i32>(floor(scaled_uv));
    let fract = fract(scaled_uv);

    let h00 = textureLoad(heightmap_texture, coord, 0).r;
    let h10 = textureLoad(heightmap_texture, coord + vec2<i32>(1, 0), 0).r;
    let h01 = textureLoad(heightmap_texture, coord + vec2<i32>(0, 1), 0).r;
    let h11 = textureLoad(heightmap_texture, coord + vec2<i32>(1, 1), 0).r;

    let h0 = mix(h00, h10, fract.x);
    let h1 = mix(h01, h11, fract.x);
    return mix(h0, h1, fract.y);
}

@vertex
fn vertexMain(in: Vertex) -> VertexOut {
    var out: VertexOut;

    let height = sample_heightmap_vertex(in.uv);    

    out.pos = proj * view * vec4f(in.pos + vec3f(0.0, height * 0.5 - 0.3, 0.0), 1.0);
    out.uv = in.uv;

    return out;
}

@fragment
fn fragmentMain(in: VertexOut) -> @location(0) vec4f {
    //return vec4f(in.uv, 0.0, 1.0);
    //return vec4f(1.0, 1.0, 1.0, 1.0);
    let height = textureSample(heightmap_texture, heightmap_sampler, in.uv);
    return vec4f(height.r, height.r, height.r, 1.0);
} 