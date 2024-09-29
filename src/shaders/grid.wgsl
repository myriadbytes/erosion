struct Vertex {
    @location(0) pos: vec3f,
    @location(1) uv: vec2f,
}

struct VertexOut {
    @builtin(position) pos: vec4f,
    @location(0) uv: vec2f,
    @location(1) normal: vec3f,
}

@group(0) @binding(0)
var <uniform> view: mat4x4<f32>;

@group(0) @binding(1)
var <uniform> proj: mat4x4<f32>;

@group(0) @binding(2)
var heightmap_texture: texture_2d<f32>;

const height_scaling: f32 = 0.3;

fn heightmap_vertex_sample(uv: vec2f) -> f32 {
    let dim: vec2<u32> = textureDimensions(heightmap_texture) -1;
    let pixel_uv = vec2<u32>(uv * vec2f(dim));
    return textureLoad(heightmap_texture, pixel_uv, 0).r * height_scaling;
}

fn heightmap_normal_compute(uv:vec2f) -> vec3f {
    let dim: vec2<u32> = textureDimensions(heightmap_texture) -1;
    let pixel_uv = vec2<u32>(uv * vec2f(dim));

    let up_uv = pixel_uv + vec2<u32>(0, 1);
    let down_uv = pixel_uv - vec2<u32>(0, 1);
    let left_uv = pixel_uv - vec2<u32>(1, 0);
    let right_uv = pixel_uv + vec2<u32>(1, 0);

    let up : f32 = textureLoad(heightmap_texture, up_uv, 0).r * height_scaling;
    let down : f32 = textureLoad(heightmap_texture, down_uv, 0).r * height_scaling;
    let left : f32 = textureLoad(heightmap_texture, left_uv, 0).r * height_scaling;
    let right : f32 = textureLoad(heightmap_texture, right_uv, 0).r * height_scaling;

    let texel_size = 1.0 / vec2f(textureDimensions(heightmap_texture));
    let tangent_vertical = vec3f(0, up - down, 2 * texel_size.y);
    let tangent_horizontal = vec3f(2 * texel_size.x, right - left, 0);

    return normalize(cross(tangent_horizontal, tangent_vertical));
}

@vertex
fn vertexMain(in: Vertex) -> VertexOut {
    var out: VertexOut;
   
    let height = heightmap_vertex_sample(in.uv);

    out.pos = proj * view * vec4f(in.pos + vec3f(0, height, 0), 1.0);
    out.uv = in.uv;
    out.normal = heightmap_normal_compute(in.uv);

    return out;
}

@fragment
fn fragmentMain(in: VertexOut) -> @location(0) vec4f {
    //return vec4f(in.uv, 0.0, 1.0);
    //return vec4f(1.0, 1.0, 1.0, 1.0);

    let light_dir = normalize(vec3f(-1, -1, -1));
    let l = max(0, dot(in.normal, light_dir));

    let diffuse = vec3f(l, l, l);
    let ambiant = vec3f(0.1, 0.1, 0.1);

    return vec4f(diffuse + ambiant, 1.0);
} 