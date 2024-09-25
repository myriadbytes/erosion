struct Vertex {
    @location(0) pos: vec3f,
    @location(1) uv: vec2f,
}

@vertex
fn vertexMain(v: Vertex) -> @builtin(position) vec4f {
    return vec4f(v.pos, 1.0);
}

@fragment
fn fragmentMain() -> @location(0) vec4f {
    return vec4f(1.0, 0.0, 1.0, 1.0);
} 