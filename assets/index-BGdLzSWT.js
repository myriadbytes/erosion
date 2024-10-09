(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))n(i);new MutationObserver(i=>{for(const a of i)if(a.type==="childList")for(const s of a.addedNodes)s.tagName==="LINK"&&s.rel==="modulepreload"&&n(s)}).observe(document,{childList:!0,subtree:!0});function r(i){const a={};return i.integrity&&(a.integrity=i.integrity),i.referrerPolicy&&(a.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?a.credentials="include":i.crossOrigin==="anonymous"?a.credentials="omit":a.credentials="same-origin",a}function n(i){if(i.ep)return;i.ep=!0;const a=r(i);fetch(i.href,a)}})();const H=`struct Vertex {
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
    const terrain_color = vec3f(121./255., 134./255., 69./255.);
    const sediment_color = vec3f(254./255., 250./255., 224./255.);
  
    let height = textureSample(terrain_texture, viz_sampler, in.uv)[0] / 100;

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

        let light_dir = normalize(vec3f(1, 1, 0));
        let lambert = dot(in.normal, light_dir);

        let ambiant_color = vec3f(0.1, 0.1, 0.1);

        return vec4f(mix(terrain_color, sediment_color, clamp(sediment, 0.0, 1.0)) * lambert + ambiant_color, 1.0);
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
} `;class Z{vertex_buffer;index_buffer;vertex_buffer_layout;nb_to_draw;shader_module;bind_group_layout;bind_group;sampler;constructor(t,r,n,i){let{vertices:a,indices:s}=$(r);const o=t.createBuffer({label:"Grid Vertex Buffer",size:a.byteLength,usage:GPUBufferUsage.VERTEX|GPUBufferUsage.COPY_DST,mappedAtCreation:!0});new Float32Array(o.getMappedRange()).set(a),o.unmap();const d=t.createBuffer({label:"Grid Index Buffer",size:s.byteLength,usage:GPUBufferUsage.INDEX|GPUBufferUsage.COPY_DST,mappedAtCreation:!0});new Uint32Array(d.getMappedRange()).set(s),d.unmap();const _={arrayStride:5*4,attributes:[{shaderLocation:0,offset:0,format:"float32x3"},{shaderLocation:1,offset:3*4,format:"float32x2"}]};this.vertex_buffer=o,this.index_buffer=d,this.vertex_buffer_layout=_,this.nb_to_draw=(r-1)*(r-1)*6,this.shader_module=t.createShaderModule({label:"Grid Mesh Shader",code:H}),this.sampler=t.createSampler({}),this.bind_group_layout=t.createBindGroupLayout({label:"Grid Mesh Bindgroup Layout",entries:[{binding:0,visibility:GPUShaderStage.VERTEX,buffer:{type:"uniform",hasDynamicOffset:!1,minBindingSize:void 0}},{binding:1,visibility:GPUShaderStage.VERTEX,buffer:{type:"uniform",hasDynamicOffset:!1,minBindingSize:void 0}},{binding:2,visibility:GPUShaderStage.FRAGMENT,sampler:{}}]}),this.bind_group=t.createBindGroup({label:"Grid Bind Group",layout:this.bind_group_layout,entries:[{binding:0,resource:{buffer:n}},{binding:1,resource:{buffer:i}},{binding:2,resource:this.sampler}]})}}function $(e){let t=new Float32Array(e*e*5),r=0;for(let a=0;a<e;a++)for(let s=0;s<e;s++)t[r++]=s/(e-1)-.5,t[r++]=0,t[r++]=a/(e-1)-.5,t[r++]=s/(e-1),t[r++]=1-a/(e-1);let n=new Uint32Array((e-1)*(e-1)*6),i=0;for(let a=0;a<e-1;a++)for(let s=0;s<e-1;s++){let o=a*e+s,d=o+1,_=(a+1)*e+s,u=_+1;n[i++]=o,n[i++]=_,n[i++]=d,n[i++]=d,n[i++]=_,n[i++]=u}return{vertices:t,indices:n}}async function J(){let e=document.querySelector("canvas");if(!navigator.gpu)throw new Error("WebGPU not supported on this browser.");const t=await navigator.gpu.requestAdapter();if(!t)throw new Error("No appropriate GPUAdapter found.");const r=await t.requestDevice({requiredFeatures:["float32-filterable"]});if(!r)throw new Error("Your WebGPU device doesn't support filterable float32 textures !");const n=e.getContext("webgpu"),i=navigator.gpu.getPreferredCanvasFormat();n.configure({device:r,format:i});const a=r.createTexture({size:[e.width,e.height],format:"depth24plus",usage:GPUTextureUsage.RENDER_ATTACHMENT});return{device:r,context:n,canvasFormat:i,depthTexture:a}}var z=1e-6,I=typeof Float32Array<"u"?Float32Array:Array;Math.hypot||(Math.hypot=function(){for(var e=0,t=arguments.length;t--;)e+=arguments[t]*arguments[t];return Math.sqrt(e)});function N(){var e=new I(16);return I!=Float32Array&&(e[1]=0,e[2]=0,e[3]=0,e[4]=0,e[6]=0,e[7]=0,e[8]=0,e[9]=0,e[11]=0,e[12]=0,e[13]=0,e[14]=0),e[0]=1,e[5]=1,e[10]=1,e[15]=1,e}function Q(e){return e[0]=1,e[1]=0,e[2]=0,e[3]=0,e[4]=0,e[5]=1,e[6]=0,e[7]=0,e[8]=0,e[9]=0,e[10]=1,e[11]=0,e[12]=0,e[13]=0,e[14]=0,e[15]=1,e}function ee(e,t,r,n){var i=n[0],a=n[1],s=n[2],o=Math.hypot(i,a,s),d,_,u,c,l,f,p,g,b,m,x,y,w,T,E,P,G,B,R,M,C,L,O,W;return o<z?null:(o=1/o,i*=o,a*=o,s*=o,d=Math.sin(r),_=Math.cos(r),u=1-_,c=t[0],l=t[1],f=t[2],p=t[3],g=t[4],b=t[5],m=t[6],x=t[7],y=t[8],w=t[9],T=t[10],E=t[11],P=i*i*u+_,G=a*i*u+s*d,B=s*i*u-a*d,R=i*a*u-s*d,M=a*a*u+_,C=s*a*u+i*d,L=i*s*u+a*d,O=a*s*u-i*d,W=s*s*u+_,e[0]=c*P+g*G+y*B,e[1]=l*P+b*G+w*B,e[2]=f*P+m*G+T*B,e[3]=p*P+x*G+E*B,e[4]=c*R+g*M+y*C,e[5]=l*R+b*M+w*C,e[6]=f*R+m*M+T*C,e[7]=p*R+x*M+E*C,e[8]=c*L+g*O+y*W,e[9]=l*L+b*O+w*W,e[10]=f*L+m*O+T*W,e[11]=p*L+x*O+E*W,t!==e&&(e[12]=t[12],e[13]=t[13],e[14]=t[14],e[15]=t[15]),e)}function te(e,t,r){var n=Math.sin(r),i=Math.cos(r),a=t[0],s=t[1],o=t[2],d=t[3],_=t[8],u=t[9],c=t[10],l=t[11];return t!==e&&(e[4]=t[4],e[5]=t[5],e[6]=t[6],e[7]=t[7],e[12]=t[12],e[13]=t[13],e[14]=t[14],e[15]=t[15]),e[0]=a*i-_*n,e[1]=s*i-u*n,e[2]=o*i-c*n,e[3]=d*i-l*n,e[8]=a*n+_*i,e[9]=s*n+u*i,e[10]=o*n+c*i,e[11]=d*n+l*i,e}function re(e,t,r,n,i){var a=1/Math.tan(t/2),s;return e[0]=a/r,e[1]=0,e[2]=0,e[3]=0,e[4]=0,e[5]=a,e[6]=0,e[7]=0,e[8]=0,e[9]=0,e[11]=-1,e[12]=0,e[13]=0,e[15]=0,i!=null&&i!==1/0?(s=1/(n-i),e[10]=(i+n)*s,e[14]=2*i*n*s):(e[10]=-1,e[14]=-2*n),e}var ie=re;function ne(e,t,r,n){var i,a,s,o,d,_,u,c,l,f,p=t[0],g=t[1],b=t[2],m=n[0],x=n[1],y=n[2],w=r[0],T=r[1],E=r[2];return Math.abs(p-w)<z&&Math.abs(g-T)<z&&Math.abs(b-E)<z?Q(e):(u=p-w,c=g-T,l=b-E,f=1/Math.hypot(u,c,l),u*=f,c*=f,l*=f,i=x*l-y*c,a=y*u-m*l,s=m*c-x*u,f=Math.hypot(i,a,s),f?(f=1/f,i*=f,a*=f,s*=f):(i=0,a=0,s=0),o=c*s-l*a,d=l*i-u*s,_=u*a-c*i,f=Math.hypot(o,d,_),f?(f=1/f,o*=f,d*=f,_*=f):(o=0,d=0,_=0),e[0]=i,e[1]=o,e[2]=u,e[3]=0,e[4]=a,e[5]=d,e[6]=c,e[7]=0,e[8]=s,e[9]=_,e[10]=l,e[11]=0,e[12]=-(i*p+a*g+s*b),e[13]=-(o*p+d*g+_*b),e[14]=-(u*p+c*g+l*b),e[15]=1,e)}function S(){var e=new I(3);return I!=Float32Array&&(e[0]=0,e[1]=0,e[2]=0),e}function ae(e){var t=e[0],r=e[1],n=e[2];return Math.hypot(t,r,n)}function D(e,t,r){var n=new I(3);return n[0]=e,n[1]=t,n[2]=r,n}function se(e,t,r){return e[0]=t[0]+r[0],e[1]=t[1]+r[1],e[2]=t[2]+r[2],e}function oe(e,t,r){return e[0]=t[0]-r[0],e[1]=t[1]-r[1],e[2]=t[2]-r[2],e}function F(e,t,r){return e[0]=t[0]*r,e[1]=t[1]*r,e[2]=t[2]*r,e}function A(e,t){var r=t[0],n=t[1],i=t[2],a=r*r+n*n+i*i;return a>0&&(a=1/Math.sqrt(a)),e[0]=t[0]*a,e[1]=t[1]*a,e[2]=t[2]*a,e}function de(e,t){return e[0]*t[0]+e[1]*t[1]+e[2]*t[2]}function ue(e,t,r){var n=t[0],i=t[1],a=t[2],s=r[0],o=r[1],d=r[2];return e[0]=i*d-a*o,e[1]=a*s-n*d,e[2]=n*o-i*s,e}function _e(e,t,r){var n=t[0],i=t[1],a=t[2],s=r[3]*n+r[7]*i+r[11]*a+r[15];return s=s||1,e[0]=(r[0]*n+r[4]*i+r[8]*a+r[12])/s,e[1]=(r[1]*n+r[5]*i+r[9]*a+r[13])/s,e[2]=(r[2]*n+r[6]*i+r[10]*a+r[14])/s,e}var k=oe,V=ae;(function(){var e=S();return function(t,r,n,i,a,s){var o,d;for(r||(r=3),n||(n=0),i?d=Math.min(i*r+n,t.length):d=t.length,o=n;o<d;o+=r)e[0]=t[o],e[1]=t[o+1],e[2]=t[o+2],a(e,e,s),t[o]=e[0],t[o+1]=e[1],t[o+2]=e[2];return t}})();const le=.7,fe=10;class ce{view_matrix_buffer;proj_matrix_buffer;device;pos;target;is_dragging;last_mouse_x;last_mouse_y;constructor(t){const r=document.querySelector("canvas");this.device=t,this.pos=D(.6,1.2,.9),this.target=D(0,0,0),this.setup_buffers(r.width,r.height),this.setup_listeners(r),this.update_view_matrix()}setup_listeners(t){this.is_dragging=!1,this.last_mouse_x=0,this.last_mouse_y=0,t.addEventListener("mousedown",r=>{this.is_dragging=!0,this.last_mouse_x=r.clientX,this.last_mouse_y=r.clientY}),t.addEventListener("mouseup",()=>{this.is_dragging=!1}),t.addEventListener("mouseleave",()=>{this.is_dragging=!1}),t.addEventListener("mousemove",r=>{if(!this.is_dragging)return;const n=r.clientX-this.last_mouse_x,i=r.clientY-this.last_mouse_y;this.rotate_camera(n,i),this.last_mouse_x=r.clientX,this.last_mouse_y=r.clientY}),t.addEventListener("wheel",r=>{r.preventDefault(),this.zoom_camera(r.deltaY)})}setup_buffers(t,r){this.view_matrix_buffer=this.device.createBuffer({label:"View Matrix Buffer",size:16*4,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST,mappedAtCreation:!1});let n=N();ie(n,120,t/r,.01,100),this.proj_matrix_buffer=this.device.createBuffer({label:"Projection Matrix Buffer",size:16*4,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST,mappedAtCreation:!0}),new Float32Array(this.proj_matrix_buffer.getMappedRange()).set(n),this.proj_matrix_buffer.unmap()}update_view_matrix(){let t=N();ne(t,this.pos,this.target,D(0,1,0)),this.device.queue.writeBuffer(this.view_matrix_buffer,0,t)}rotate_camera(t,r){let n=N();te(n,n,-t*.01);let i=S();k(i,this.target,this.pos);let a=S();ue(a,i,[0,1,0]),A(a,a),ee(n,n,-r*.01,a);let s=S();_e(s,this.pos,n);let o=S();k(o,this.target,s),A(o,o);let d=de(o,[0,-1,0]);d>.95||d<-.95||(this.pos=s,this.update_view_matrix())}zoom_camera(t){let r=S();k(r,this.target,this.pos),!(V(r)<le&&t<0)&&(V(r)>fe&&t>0||(A(r,r),t>0&&F(r,r,-1),F(r,r,.1),se(this.pos,this.pos,r),this.update_view_matrix()))}}class h{repeat;permutation;p;constructor(t=-1){this.repeat=t,this.permutation=[151,160,137,91,90,15,131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,8,99,37,240,21,10,23,190,6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,57,177,33,88,237,149,56,87,174,20,125,136,171,168,68,175,74,165,71,134,139,48,27,166,77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,55,46,245,40,244,102,143,54,65,25,63,161,1,216,80,73,209,76,132,187,208,89,18,169,200,196,135,130,116,188,159,86,164,100,109,198,173,186,3,64,52,217,226,250,124,123,5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,189,28,42,223,183,170,213,119,248,152,2,44,154,163,70,221,153,101,155,167,43,172,9,129,22,39,253,19,98,108,110,79,113,224,232,178,185,112,104,218,246,97,228,251,34,242,193,238,210,144,12,191,179,162,241,81,51,145,235,249,14,239,107,49,192,214,31,181,199,106,157,184,84,204,176,115,121,50,45,127,4,150,254,138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180],this.p=new Array(512);for(let r=0;r<512;r++)this.p[r]=this.permutation[r%256]}octavePerlin(t,r,n,i){let a=0,s=1,o=1,d=0;for(let _=0;_<n;_++)a+=this.perlin(t*s,r*s)*o,d+=o,o*=i,s*=2;return a/d}perlin(t,r){this.repeat>0&&(t=t%this.repeat,r=r%this.repeat);let n=Math.floor(t)&255,i=Math.floor(r)&255,a=t-Math.floor(t),s=r-Math.floor(r),o=h.fade(a),d=h.fade(s),_=this.p[this.p[n]+i],u=this.p[this.p[n]+this.inc(i)],c=this.p[this.p[this.inc(n)]+i],l=this.p[this.p[this.inc(n)]+this.inc(i)],f=h.lerp(h.grad(_,a,s),h.grad(c,a-1,s),o),p=h.lerp(h.grad(u,a,s-1),h.grad(l,a-1,s-1),o);return(h.lerp(f,p,d)+1)/2}inc(t){return t++,this.repeat>0&&(t%=this.repeat),t}static grad(t,r,n){const i=t&7,a=i<4?r:n,s=i<4?n:r;return(i&1?-a:a)+(i&2?-s:s)}static fade(t){return t*t*t*(t*(t*6-15)+10)}static lerp(t,r,n){return t+n*(r-t)}}const pe=`@group(0) @binding(0)
var bds_read: texture_storage_2d<rgba32float, read>;

@group(0) @binding(1)
var bds_write: texture_storage_2d<rgba32float, write>;

@group(1) @binding(0)
var<uniform> timestep: f32;

@group(1) @binding(1)
var<uniform> rainfall: f32;

@compute @workgroup_size(16, 16) fn ComputeMain(@builtin(global_invocation_id) id: vec3<u32>) {
    let bds = textureLoad(bds_read, id.xy);
    // FIXME : this breaks everything
    // actually it's because it creates negative water height
    // but i'm keeping the fixme to remind myself that i need to deal with negative water height
   // let rainfall = abs((cos(f32(id.x)) + cos(f32(id.y)))) * rainfall * timestep; 
    let bds_new = bds + vec4f(0, rainfall * timestep, 0, 0);
    textureStore(bds_write, id.xy, bds_new);
}`,he=`@group(0) @binding(0)
var bds_read: texture_storage_2d<rgba32float, read>;

@group(0) @binding(1)
var f_read: texture_storage_2d<rgba32float, read>;

@group(0) @binding(2)
var f_write: texture_storage_2d<rgba32float, write>;

@group(1) @binding(0)
var<uniform> timestep: f32;

@group(1) @binding(2)
var<uniform> g: f32;

//const a: f32 = 1.0;
//const l: f32 = 1.0;

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

    let f_l = max(0, f[0] + timestep * 10 * (g * h_l));
    let f_r = max(0, f[1] + timestep * 10 * (g * h_r));
    let f_t = max(0, f[2] + timestep * 10 * (g * h_t));
    let f_b = max(0, f[3] + timestep * 10 * (g * h_b));

    let f_new = f + vec4f(f_l, f_r, f_t, f_b);

    // FIXME : sort out the values for lx * ly
    let k = min(1, bd[1] / ((f_new[0] + f_new[1] + f_new[2] + f_new[3]) * timestep)); // scaling factor

    textureStore(f_write, id.xy, k * f_new);
}`,ge=`@group(0) @binding(0)
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
    let water_amount_u : f32 = (f_in_l - f_out[0] + f_out[1] - f_in_r) / 2.0;
    let water_amount_v : f32 = (f_in_b - f_out[3] + f_out[2] - f_in_t) / 2.0;

    let average_water : f32 = (bds[1] + bds_new[1]) / 2.0;

    let v: vec2f = vec2f(water_amount_u / average_water, water_amount_v / average_water);

    textureStore(v_write, id.xy, vec4f(v, 0.0, 0.0));
}`,be=`@group(0) @binding(0)
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
    let c : f32 = K_C * clamp(sin_a, 0.1, 1.0) * length(v);
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
}`,ve=`@group(0) @binding(0)
var bds_read: texture_storage_2d<rgba32float, read>;

@group(0) @binding(1)
var v_read: texture_storage_2d<rg32float, read>;

@group(0) @binding(2)
var bds_write: texture_storage_2d<rgba32float, write>;

@group(1) @binding(0)
var<uniform> timestep: f32;

@compute @workgroup_size(16, 16) fn ComputeMain(@builtin(global_invocation_id) id: vec3<u32>) {
    let dim = textureDimensions(v_read);

    let v : vec2f = textureLoad(v_read, id.xy).xy;
    
    let x : u32 = clamp(u32(round(f32(id.x) - (v.x * timestep))), 0, dim.x - 1);
    let y : u32 = clamp(u32(round(f32(id.y) - (v.y * timestep))), 0, dim.y - 1);

    let s : f32 = textureLoad(bds_read, vec2u(x, y))[2];

    let bds = textureLoad(bds_read, id.xy);
    let bds_new = vec4f(bds[0], bds[1], s, bds[3]);

    textureStore(bds_write, id.xy, bds_new);
}`,me=`@group(0) @binding(0)
var bds_read: texture_storage_2d<rgba32float, read>;

@group(0) @binding(1)
var bds_write: texture_storage_2d<rgba32float, write>;

@group(1) @binding(0)
var<uniform> timestep: f32;

@group(1) @binding(6)
var<uniform> evaporation_constant: f32;

@compute @workgroup_size(16, 16) fn ComputeMain(@builtin(global_invocation_id) id: vec3<u32>) {

    let bds = textureLoad(bds_read, id.xy);
    let water = bds[1];
    
    let bds_new = vec4f(bds[0], water * (1 - evaporation_constant * timestep), bds[2], bds[3]);

    textureStore(bds_write, id.xy, bds_new);
}`;class xe{device;running=!0;TEXTURES_W=256;t1_read;t1_write;t2_read;t2_write;t3_read;t3_write;water_increment_shader;outflow_flux_shader;water_velocity_shader;erosion_deposition_shader;transportation_shader;evaporation_shader;water_increment_bind_group;outflow_flux_bind_group;water_velocity_bind_group;erosion_deposition_bind_group;transportation_bind_group;evaporation_bind_group;water_increment_pipeline;outflow_flux_pipeline;water_velocity_pipeline;erosion_deposition_pipeline;transportation_pipeline;evaporation_pipeline;view_bind_group_layout;view_bind_group;view_type_buffer;params_bind_group_layout;params_bind_group;timestep_param_buffer;rainfall_param_buffer;g_param_buffer;kc_param_buffer;ks_param_buffer;kd_param_buffer;evaporation_param_buffer;height_scale=100;constructor(t){this.device=t,this.init_textures(),this.init_viz_and_params(),this.init_water_increment(),this.init_outflow_flux(),this.init_water_velocity(),this.init_erosion_deposition(),this.init_transportation(),this.init_evaporation()}init_textures(){this.t1_read=this.device.createTexture({label:"t1 read",size:{width:this.TEXTURES_W,height:this.TEXTURES_W},format:"rgba32float",usage:GPUTextureUsage.STORAGE_BINDING|GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST}),this.t1_write=this.device.createTexture({label:"t1 write",size:{width:this.TEXTURES_W,height:this.TEXTURES_W},format:"rgba32float",usage:GPUTextureUsage.STORAGE_BINDING|GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_SRC}),this.t2_read=this.device.createTexture({label:"t2 read",size:{width:this.TEXTURES_W,height:this.TEXTURES_W},format:"rgba32float",usage:GPUTextureUsage.STORAGE_BINDING|GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST}),this.t2_write=this.device.createTexture({label:"t2 write",size:{width:this.TEXTURES_W,height:this.TEXTURES_W},format:"rgba32float",usage:GPUTextureUsage.STORAGE_BINDING|GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_SRC}),this.t3_read=this.device.createTexture({label:"t3 read",size:{width:this.TEXTURES_W,height:this.TEXTURES_W},format:"rg32float",usage:GPUTextureUsage.STORAGE_BINDING|GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST}),this.t3_write=this.device.createTexture({label:"t3 write",size:{width:this.TEXTURES_W,height:this.TEXTURES_W},format:"rg32float",usage:GPUTextureUsage.STORAGE_BINDING|GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_SRC}),this.init_heightmap()}init_heightmap(){const t=new h,r=new Float32Array(this.TEXTURES_W*this.TEXTURES_W*4).map((n,i,a)=>{if(i%4==0){let s=i/4/this.TEXTURES_W,o=i/4%this.TEXTURES_W;return t.perlin(s/this.TEXTURES_W*6,o/this.TEXTURES_W*6)*this.height_scale}return 0});this.device.queue.writeTexture({texture:this.t1_read},r,{bytesPerRow:4*4*this.TEXTURES_W},{width:this.TEXTURES_W,height:this.TEXTURES_W})}init_viz_and_params(){this.view_type_buffer=this.device.createBuffer({label:"visualization type buffer",size:4,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),this.view_bind_group_layout=this.device.createBindGroupLayout({label:"visualization bind group layout",entries:[{binding:0,visibility:GPUShaderStage.VERTEX|GPUShaderStage.FRAGMENT,texture:{}},{binding:1,visibility:GPUShaderStage.FRAGMENT,texture:{}},{binding:2,visibility:GPUShaderStage.FRAGMENT,texture:{}},{binding:3,visibility:GPUShaderStage.FRAGMENT,buffer:{}}]}),this.view_bind_group=this.device.createBindGroup({label:"visualization bind group",layout:this.view_bind_group_layout,entries:[{binding:0,resource:this.t1_read.createView()},{binding:1,resource:this.t2_read.createView()},{binding:2,resource:this.t3_read.createView()},{binding:3,resource:{buffer:this.view_type_buffer}}]}),this.params_bind_group_layout=this.device.createBindGroupLayout({label:"parameters bind group layout",entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{}},{binding:3,visibility:GPUShaderStage.COMPUTE,buffer:{}},{binding:4,visibility:GPUShaderStage.COMPUTE,buffer:{}},{binding:5,visibility:GPUShaderStage.COMPUTE,buffer:{}},{binding:6,visibility:GPUShaderStage.COMPUTE,buffer:{}}]}),this.timestep_param_buffer=this.device.createBuffer({label:"timestep parameter buffer",size:4,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),this.rainfall_param_buffer=this.device.createBuffer({label:"rainfall parameter buffer",size:4,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),this.g_param_buffer=this.device.createBuffer({label:"gravity parameter buffer",size:4,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),this.kc_param_buffer=this.device.createBuffer({label:"kc parameter buffer",size:4,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),this.ks_param_buffer=this.device.createBuffer({label:"ks parameter buffer",size:4,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),this.kd_param_buffer=this.device.createBuffer({label:"kd parameter buffer",size:4,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),this.evaporation_param_buffer=this.device.createBuffer({label:"evaporation parameter buffer",size:4,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),this.params_bind_group=this.device.createBindGroup({label:"parameters bind group",layout:this.params_bind_group_layout,entries:[{binding:0,resource:{buffer:this.timestep_param_buffer}},{binding:1,resource:{buffer:this.rainfall_param_buffer}},{binding:2,resource:{buffer:this.g_param_buffer}},{binding:3,resource:{buffer:this.kc_param_buffer}},{binding:4,resource:{buffer:this.ks_param_buffer}},{binding:5,resource:{buffer:this.kd_param_buffer}},{binding:6,resource:{buffer:this.evaporation_param_buffer}}]})}init_water_increment(){let t=this.device.createBindGroupLayout({label:"Water Increment Bindgroup Layout",entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,storageTexture:{access:"read-only",format:"rgba32float"}},{binding:1,visibility:GPUShaderStage.COMPUTE,storageTexture:{access:"write-only",format:"rgba32float"}}]});this.water_increment_bind_group=this.device.createBindGroup({label:"Water Increment Bind Group",layout:t,entries:[{binding:0,resource:this.t1_read.createView()},{binding:1,resource:this.t1_write.createView()}]}),this.water_increment_shader=this.device.createShaderModule({label:"Water Increment Shader",code:pe});let r=this.device.createPipelineLayout({bindGroupLayouts:[t,this.params_bind_group_layout]});this.water_increment_pipeline=this.device.createComputePipeline({label:"Water Increment Compute Pipeline",compute:{module:this.water_increment_shader},layout:r})}init_outflow_flux(){let t=this.device.createBindGroupLayout({label:"Outflow Flux Bindgroup Layout",entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,storageTexture:{access:"read-only",format:"rgba32float"}},{binding:1,visibility:GPUShaderStage.COMPUTE,storageTexture:{access:"read-only",format:"rgba32float"}},{binding:2,visibility:GPUShaderStage.COMPUTE,storageTexture:{access:"write-only",format:"rgba32float"}}]});this.outflow_flux_bind_group=this.device.createBindGroup({label:"Outflow Flux Bind Group",layout:t,entries:[{binding:0,resource:this.t1_read.createView()},{binding:1,resource:this.t2_read.createView()},{binding:2,resource:this.t2_write.createView()}]}),this.outflow_flux_shader=this.device.createShaderModule({label:"Outflow Flux Shader",code:he});let r=this.device.createPipelineLayout({bindGroupLayouts:[t,this.params_bind_group_layout]});this.outflow_flux_pipeline=this.device.createComputePipeline({label:"Outflow Flux Compute Pipeline",compute:{module:this.outflow_flux_shader},layout:r})}init_water_velocity(){let t=this.device.createBindGroupLayout({label:"Water Velocity Bindgroup Layout",entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,storageTexture:{access:"read-only",format:"rgba32float"}},{binding:1,visibility:GPUShaderStage.COMPUTE,storageTexture:{access:"read-only",format:"rgba32float"}},{binding:2,visibility:GPUShaderStage.COMPUTE,storageTexture:{access:"write-only",format:"rgba32float"}},{binding:3,visibility:GPUShaderStage.COMPUTE,storageTexture:{access:"write-only",format:"rg32float"}}]});this.water_velocity_bind_group=this.device.createBindGroup({label:"Water Velocity Bind Group",layout:t,entries:[{binding:0,resource:this.t2_read.createView()},{binding:1,resource:this.t1_read.createView()},{binding:2,resource:this.t1_write.createView()},{binding:3,resource:this.t3_write.createView()}]}),this.water_velocity_shader=this.device.createShaderModule({label:"Water Velocity Shader",code:ge});let r=this.device.createPipelineLayout({bindGroupLayouts:[t,this.params_bind_group_layout]});this.water_velocity_pipeline=this.device.createComputePipeline({label:"Water Velocity Compute Pipeline",compute:{module:this.water_velocity_shader},layout:r})}init_erosion_deposition(){let t=this.device.createBindGroupLayout({label:"Erosion Deposition Bindgroup Layout",entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,storageTexture:{access:"read-only",format:"rgba32float"}},{binding:1,visibility:GPUShaderStage.COMPUTE,storageTexture:{access:"read-only",format:"rg32float"}},{binding:2,visibility:GPUShaderStage.COMPUTE,storageTexture:{access:"write-only",format:"rgba32float"}}]});this.erosion_deposition_bind_group=this.device.createBindGroup({label:"Erosion Deposition Bind Group",layout:t,entries:[{binding:0,resource:this.t1_read.createView()},{binding:1,resource:this.t3_read.createView()},{binding:2,resource:this.t1_write.createView()}]}),this.erosion_deposition_shader=this.device.createShaderModule({label:"Erosion Deposition Shader",code:be});let r=this.device.createPipelineLayout({bindGroupLayouts:[t,this.params_bind_group_layout]});this.erosion_deposition_pipeline=this.device.createComputePipeline({label:"Erosion Deposition Compute Pipeline",compute:{module:this.erosion_deposition_shader},layout:r})}init_transportation(){let t=this.device.createBindGroupLayout({label:"Transportation Bindgroup Layout",entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,storageTexture:{access:"read-only",format:"rgba32float"}},{binding:1,visibility:GPUShaderStage.COMPUTE,storageTexture:{access:"read-only",format:"rg32float"}},{binding:2,visibility:GPUShaderStage.COMPUTE,storageTexture:{access:"write-only",format:"rgba32float"}}]});this.transportation_bind_group=this.device.createBindGroup({label:"Transportation Bind Group",layout:t,entries:[{binding:0,resource:this.t1_read.createView()},{binding:1,resource:this.t3_read.createView()},{binding:2,resource:this.t1_write.createView()}]}),this.transportation_shader=this.device.createShaderModule({label:"Transportation Shader",code:ve});let r=this.device.createPipelineLayout({bindGroupLayouts:[t,this.params_bind_group_layout]});this.transportation_pipeline=this.device.createComputePipeline({label:"Transportation Compute Pipeline",compute:{module:this.transportation_shader},layout:r})}init_evaporation(){let t=this.device.createBindGroupLayout({label:"Evaporation Bindgroup Layout",entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,storageTexture:{access:"read-only",format:"rgba32float"}},{binding:1,visibility:GPUShaderStage.COMPUTE,storageTexture:{access:"write-only",format:"rgba32float"}}]});this.evaporation_bind_group=this.device.createBindGroup({label:"Evaporation Bind Group",layout:t,entries:[{binding:0,resource:this.t1_read.createView()},{binding:1,resource:this.t1_write.createView()}]}),this.evaporation_shader=this.device.createShaderModule({label:"Evaporation Shader",code:me});let r=this.device.createPipelineLayout({bindGroupLayouts:[t,this.params_bind_group_layout]});this.evaporation_pipeline=this.device.createComputePipeline({label:"Evaportation Compute Pipeline",compute:{module:this.evaporation_shader},layout:r})}run_water_increment(){const t=this.device.createCommandEncoder({}),r=t.beginComputePass();r.setPipeline(this.water_increment_pipeline),r.setBindGroup(0,this.water_increment_bind_group),r.setBindGroup(1,this.params_bind_group),r.dispatchWorkgroups(this.TEXTURES_W/16,this.TEXTURES_W/16),r.end(),t.copyTextureToTexture({texture:this.t1_write},{texture:this.t1_read},{width:this.TEXTURES_W,height:this.TEXTURES_W});const n=t.finish();this.device.queue.submit([n])}run_outflow_flux(){const t=this.device.createCommandEncoder({}),r=t.beginComputePass();r.setPipeline(this.outflow_flux_pipeline),r.setBindGroup(0,this.outflow_flux_bind_group),r.setBindGroup(1,this.params_bind_group),r.dispatchWorkgroups(this.TEXTURES_W/16,this.TEXTURES_W/16),r.end(),t.copyTextureToTexture({texture:this.t2_write},{texture:this.t2_read},{width:this.TEXTURES_W,height:this.TEXTURES_W});const n=t.finish();this.device.queue.submit([n])}run_water_velocity(){const t=this.device.createCommandEncoder({}),r=t.beginComputePass();r.setPipeline(this.water_velocity_pipeline),r.setBindGroup(0,this.water_velocity_bind_group),r.setBindGroup(1,this.params_bind_group),r.dispatchWorkgroups(this.TEXTURES_W/16,this.TEXTURES_W/16),r.end(),t.copyTextureToTexture({texture:this.t1_write},{texture:this.t1_read},{width:this.TEXTURES_W,height:this.TEXTURES_W}),t.copyTextureToTexture({texture:this.t3_write},{texture:this.t3_read},{width:this.TEXTURES_W,height:this.TEXTURES_W});const n=t.finish();this.device.queue.submit([n])}run_erosion_deposition(){const t=this.device.createCommandEncoder({}),r=t.beginComputePass();r.setPipeline(this.erosion_deposition_pipeline),r.setBindGroup(0,this.erosion_deposition_bind_group),r.setBindGroup(1,this.params_bind_group),r.dispatchWorkgroups(this.TEXTURES_W/16,this.TEXTURES_W/16),r.end(),t.copyTextureToTexture({texture:this.t1_write},{texture:this.t1_read},{width:this.TEXTURES_W,height:this.TEXTURES_W});const n=t.finish();this.device.queue.submit([n])}run_transportation(){const t=this.device.createCommandEncoder({}),r=t.beginComputePass();r.setPipeline(this.transportation_pipeline),r.setBindGroup(0,this.transportation_bind_group),r.setBindGroup(1,this.params_bind_group),r.dispatchWorkgroups(this.TEXTURES_W/16,this.TEXTURES_W/16),r.end(),t.copyTextureToTexture({texture:this.t1_write},{texture:this.t1_read},{width:this.TEXTURES_W,height:this.TEXTURES_W});const n=t.finish();this.device.queue.submit([n])}run_evaporation(){const t=this.device.createCommandEncoder({}),r=t.beginComputePass();r.setPipeline(this.evaporation_pipeline),r.setBindGroup(0,this.evaporation_bind_group),r.setBindGroup(1,this.params_bind_group),r.dispatchWorkgroups(this.TEXTURES_W/16,this.TEXTURES_W/16),r.end(),t.copyTextureToTexture({texture:this.t1_write},{texture:this.t1_read},{width:this.TEXTURES_W,height:this.TEXTURES_W});const n=t.finish();this.device.queue.submit([n])}run_full_step(){this.run_water_increment(),this.run_outflow_flux(),this.run_water_velocity(),this.run_erosion_deposition(),this.run_transportation(),this.run_evaporation()}}function ye(e){document.querySelectorAll('input[name="visualization"]').forEach(_=>{_.addEventListener("change",u=>{const c=u.target;if(c.checked){let l=0;switch(c.value){case"terrain":l=0;break;case"flow-x":l=1;break;case"flow-y":l=2;break;case"velocity-x":l=3;break;case"velocity-y":l=4;break;case"sediment":l=5;break;default:l=10}e.device.queue.writeBuffer(e.view_type_buffer,0,new Uint32Array([l]))}})}),document.getElementById("start-stop-button").addEventListener("mousedown",()=>{e.running=!e.running}),document.getElementById("reset-button").addEventListener("mousedown",()=>{e.init_heightmap(),e.device.queue.writeTexture({texture:e.t2_read},new Float32Array(e.TEXTURES_W*e.TEXTURES_W*4),{offset:0,bytesPerRow:4*4*e.TEXTURES_W,rowsPerImage:e.TEXTURES_W},{width:e.TEXTURES_W,height:e.TEXTURES_W}),e.device.queue.writeTexture({texture:e.t3_read},new Float32Array(e.TEXTURES_W*e.TEXTURES_W*2),{offset:0,bytesPerRow:4*2*e.TEXTURES_W,rowsPerImage:e.TEXTURES_W},{width:e.TEXTURES_W,height:e.TEXTURES_W})});let t=(_,u)=>{e.device.queue.writeBuffer(_,0,new Float32Array([u]))},r=document.getElementById("timestep-input");r.addEventListener("input",()=>{t(e.timestep_param_buffer,Number(r.value))}),t(e.timestep_param_buffer,Number(r.value));let n=document.getElementById("rainfall-input");n.addEventListener("input",()=>{t(e.rainfall_param_buffer,Number(n.value))}),t(e.rainfall_param_buffer,Number(n.value));let i=document.getElementById("g-input");i.addEventListener("input",()=>{t(e.g_param_buffer,Number(i.value))}),t(e.g_param_buffer,Number(i.value));let a=document.getElementById("kc-input");a.addEventListener("input",()=>{t(e.kc_param_buffer,Number(a.value))}),t(e.kc_param_buffer,Number(a.value));let s=document.getElementById("ks-input");s.addEventListener("input",()=>{t(e.ks_param_buffer,Number(s.value))}),t(e.ks_param_buffer,Number(s.value));let o=document.getElementById("kd-input");o.addEventListener("input",()=>{t(e.kd_param_buffer,Number(o.value))}),t(e.kd_param_buffer,Number(o.value));let d=document.getElementById("evaporation-input");d.addEventListener("input",()=>{t(e.evaporation_param_buffer,Number(d.value))}),t(e.evaporation_param_buffer,Number(d.value)),document.getElementById("water-increment-button").addEventListener("mousedown",()=>{e.run_water_increment()}),document.getElementById("outflow-flux-button").addEventListener("mousedown",()=>{e.run_outflow_flux()}),document.getElementById("water-velocity-button").addEventListener("mousedown",()=>{e.run_water_velocity()}),document.getElementById("erosion-deposition-button").addEventListener("mousedown",()=>{e.run_erosion_deposition()})}let Y=document.querySelector("#viewport"),j=document.querySelector("canvas");j.width=Y.clientWidth;j.height=Y.clientHeight;const{device:U,context:we,canvasFormat:Te,depthTexture:Ee}=await J(),q=new ce(U),v=new Z(U,512,q.view_matrix_buffer,q.proj_matrix_buffer),X=new xe(U);ye(X);const Ue=U.createPipelineLayout({bindGroupLayouts:[v.bind_group_layout,X.view_bind_group_layout]}),Se=U.createRenderPipeline({label:"Mesh Render Pipeline",layout:Ue,vertex:{module:v.shader_module,entryPoint:"vertexMain",buffers:[v.vertex_buffer_layout]},fragment:{module:v.shader_module,entryPoint:"fragmentMain",targets:[{format:Te}]},primitive:{frontFace:"ccw",cullMode:"back"},depthStencil:{depthWriteEnabled:!0,depthCompare:"less",format:"depth24plus"}});function K(){X.running&&X.run_full_step();const e=U.createCommandEncoder(),t=e.beginRenderPass({colorAttachments:[{view:we.getCurrentTexture().createView(),loadOp:"clear",storeOp:"store",clearValue:[0,0,.1,1]}],depthStencilAttachment:{view:Ee.createView(),depthClearValue:1,depthLoadOp:"clear",depthStoreOp:"store"}});t.setPipeline(Se),t.setVertexBuffer(0,v.vertex_buffer),t.setIndexBuffer(v.index_buffer,"uint32"),t.setBindGroup(0,v.bind_group),t.setBindGroup(1,X.view_bind_group),t.drawIndexed(v.nb_to_draw),t.end();const r=e.finish();U.queue.submit([r]),requestAnimationFrame(K)}requestAnimationFrame(K);
