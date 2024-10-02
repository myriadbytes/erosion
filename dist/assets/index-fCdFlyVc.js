(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const r of document.querySelectorAll('link[rel="modulepreload"]'))n(r);new MutationObserver(r=>{for(const a of r)if(a.type==="childList")for(const o of a.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&n(o)}).observe(document,{childList:!0,subtree:!0});function i(r){const a={};return r.integrity&&(a.integrity=r.integrity),r.referrerPolicy&&(a.referrerPolicy=r.referrerPolicy),r.crossOrigin==="use-credentials"?a.credentials="include":r.crossOrigin==="anonymous"?a.credentials="omit":a.credentials="same-origin",a}function n(r){if(r.ep)return;r.ep=!0;const a=i(r);fetch(r.href,a)}})();const K=`struct Vertex {
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

    let height : f32 = textureLoad(terrain_texture, vec2u(in.uv * 511.0), 0).r * 0.2;
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
  
    let height = textureSample(terrain_texture, viz_sampler, in.uv)[0];
    let terrain_diffuse = mix(terrain_color_dark, terrain_color_light, height);

    const water_color = vec3f(82./255., 139./255., 255./255.);
    let water = textureSample(terrain_texture, viz_sampler, in.uv)[1];

    let flow = textureSample(flow_texture, viz_sampler, in.uv);
    let v = textureSample(velocity_texture, viz_sampler, in.uv);

    let sediment = textureSample(terrain_texture, viz_sampler, in.uv)[2];

    return vec4f(mix(mix(terrain_diffuse, sediment_color, sediment*100), water_color, water * 10), 1.0);

    //return vec4f(sediment * 100, sediment * 100, sediment * 100, 1.0);

    //return vec4f(-v.xy, 0.0, 1.0);

    //return vec4f(mix(terrain_diffuse, water_color, water * 10), 1.0);

    //return vec4f(flow.r * 50., flow.g * 50., flow.b * 50., 1.0);

    //return textureSample(terrain_texture, viz_sampler, in.uv);
} `;class j{vertex_buffer;index_buffer;vertex_buffer_layout;nb_to_draw;shader_module;bind_group_layout;bind_group;sampler;constructor(e,i,n,r){let{vertices:a,indices:o}=H(i);const s=e.createBuffer({label:"Grid Vertex Buffer",size:a.byteLength,usage:GPUBufferUsage.VERTEX|GPUBufferUsage.COPY_DST,mappedAtCreation:!0});new Float32Array(s.getMappedRange()).set(a),s.unmap();const d=e.createBuffer({label:"Grid Index Buffer",size:o.byteLength,usage:GPUBufferUsage.INDEX|GPUBufferUsage.COPY_DST,mappedAtCreation:!0});new Uint32Array(d.getMappedRange()).set(o),d.unmap();const u={arrayStride:5*4,attributes:[{shaderLocation:0,offset:0,format:"float32x3"},{shaderLocation:1,offset:3*4,format:"float32x2"}]};this.vertex_buffer=s,this.index_buffer=d,this.vertex_buffer_layout=u,this.nb_to_draw=(i-1)*(i-1)*6,this.shader_module=e.createShaderModule({label:"Grid Mesh Shader",code:K}),this.sampler=e.createSampler({}),this.bind_group_layout=e.createBindGroupLayout({label:"Grid Mesh Bindgroup Layout",entries:[{binding:0,visibility:GPUShaderStage.VERTEX,buffer:{type:"uniform",hasDynamicOffset:!1,minBindingSize:void 0}},{binding:1,visibility:GPUShaderStage.VERTEX,buffer:{type:"uniform",hasDynamicOffset:!1,minBindingSize:void 0}},{binding:2,visibility:GPUShaderStage.FRAGMENT,sampler:{}}]}),this.bind_group=e.createBindGroup({label:"Grid Bind Group",layout:this.bind_group_layout,entries:[{binding:0,resource:{buffer:n}},{binding:1,resource:{buffer:r}},{binding:2,resource:this.sampler}]})}}function H(t){let e=new Float32Array(t*t*5),i=0;for(let a=0;a<t;a++)for(let o=0;o<t;o++)e[i++]=o/(t-1)-.5,e[i++]=0,e[i++]=a/(t-1)-.5,e[i++]=o/(t-1),e[i++]=1-a/(t-1);let n=new Uint32Array((t-1)*(t-1)*6),r=0;for(let a=0;a<t-1;a++)for(let o=0;o<t-1;o++){let s=a*t+o,d=s+1,u=(a+1)*t+o,_=u+1;n[r++]=s,n[r++]=u,n[r++]=d,n[r++]=d,n[r++]=u,n[r++]=_}return{vertices:e,indices:n}}async function Z(){let t=document.querySelector("canvas");if(!navigator.gpu)throw new Error("WebGPU not supported on this browser.");const e=await navigator.gpu.requestAdapter();if(!e)throw new Error("No appropriate GPUAdapter found.");const i=await e.requestDevice({requiredFeatures:["float32-filterable"]});if(!i)throw new Error("Your WebGPU device doesn't support filterable float32 textures !");const n=t.getContext("webgpu"),r=navigator.gpu.getPreferredCanvasFormat();n.configure({device:i,format:r});const a=i.createTexture({size:[t.width,t.height],format:"depth24plus",usage:GPUTextureUsage.RENDER_ATTACHMENT});return{device:i,context:n,canvasFormat:r,depthTexture:a}}var O=1e-6,X=typeof Float32Array<"u"?Float32Array:Array;Math.hypot||(Math.hypot=function(){for(var t=0,e=arguments.length;e--;)t+=arguments[e]*arguments[e];return Math.sqrt(t)});function I(){var t=new X(16);return X!=Float32Array&&(t[1]=0,t[2]=0,t[3]=0,t[4]=0,t[6]=0,t[7]=0,t[8]=0,t[9]=0,t[11]=0,t[12]=0,t[13]=0,t[14]=0),t[0]=1,t[5]=1,t[10]=1,t[15]=1,t}function $(t){return t[0]=1,t[1]=0,t[2]=0,t[3]=0,t[4]=0,t[5]=1,t[6]=0,t[7]=0,t[8]=0,t[9]=0,t[10]=1,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,t}function J(t,e,i,n){var r=n[0],a=n[1],o=n[2],s=Math.hypot(r,a,o),d,u,_,c,h,l,f,g,b,x,m,y,w,T,E,U,G,P,R,M,B,C,L,W;return s<O?null:(s=1/s,r*=s,a*=s,o*=s,d=Math.sin(i),u=Math.cos(i),_=1-u,c=e[0],h=e[1],l=e[2],f=e[3],g=e[4],b=e[5],x=e[6],m=e[7],y=e[8],w=e[9],T=e[10],E=e[11],U=r*r*_+u,G=a*r*_+o*d,P=o*r*_-a*d,R=r*a*_-o*d,M=a*a*_+u,B=o*a*_+r*d,C=r*o*_+a*d,L=a*o*_-r*d,W=o*o*_+u,t[0]=c*U+g*G+y*P,t[1]=h*U+b*G+w*P,t[2]=l*U+x*G+T*P,t[3]=f*U+m*G+E*P,t[4]=c*R+g*M+y*B,t[5]=h*R+b*M+w*B,t[6]=l*R+x*M+T*B,t[7]=f*R+m*M+E*B,t[8]=c*C+g*L+y*W,t[9]=h*C+b*L+w*W,t[10]=l*C+x*L+T*W,t[11]=f*C+m*L+E*W,e!==t&&(t[12]=e[12],t[13]=e[13],t[14]=e[14],t[15]=e[15]),t)}function Q(t,e,i){var n=Math.sin(i),r=Math.cos(i),a=e[0],o=e[1],s=e[2],d=e[3],u=e[8],_=e[9],c=e[10],h=e[11];return e!==t&&(t[4]=e[4],t[5]=e[5],t[6]=e[6],t[7]=e[7],t[12]=e[12],t[13]=e[13],t[14]=e[14],t[15]=e[15]),t[0]=a*r-u*n,t[1]=o*r-_*n,t[2]=s*r-c*n,t[3]=d*r-h*n,t[8]=a*n+u*r,t[9]=o*n+_*r,t[10]=s*n+c*r,t[11]=d*n+h*r,t}function ee(t,e,i,n,r){var a=1/Math.tan(e/2),o;return t[0]=a/i,t[1]=0,t[2]=0,t[3]=0,t[4]=0,t[5]=a,t[6]=0,t[7]=0,t[8]=0,t[9]=0,t[11]=-1,t[12]=0,t[13]=0,t[15]=0,r!=null&&r!==1/0?(o=1/(n-r),t[10]=(r+n)*o,t[14]=2*r*n*o):(t[10]=-1,t[14]=-2*n),t}var te=ee;function ie(t,e,i,n){var r,a,o,s,d,u,_,c,h,l,f=e[0],g=e[1],b=e[2],x=n[0],m=n[1],y=n[2],w=i[0],T=i[1],E=i[2];return Math.abs(f-w)<O&&Math.abs(g-T)<O&&Math.abs(b-E)<O?$(t):(_=f-w,c=g-T,h=b-E,l=1/Math.hypot(_,c,h),_*=l,c*=l,h*=l,r=m*h-y*c,a=y*_-x*h,o=x*c-m*_,l=Math.hypot(r,a,o),l?(l=1/l,r*=l,a*=l,o*=l):(r=0,a=0,o=0),s=c*o-h*a,d=h*r-_*o,u=_*a-c*r,l=Math.hypot(s,d,u),l?(l=1/l,s*=l,d*=l,u*=l):(s=0,d=0,u=0),t[0]=r,t[1]=s,t[2]=_,t[3]=0,t[4]=a,t[5]=d,t[6]=c,t[7]=0,t[8]=o,t[9]=u,t[10]=h,t[11]=0,t[12]=-(r*f+a*g+o*b),t[13]=-(s*f+d*g+u*b),t[14]=-(_*f+c*g+h*b),t[15]=1,t)}function z(){var t=new X(3);return X!=Float32Array&&(t[0]=0,t[1]=0,t[2]=0),t}function re(t){var e=t[0],i=t[1],n=t[2];return Math.hypot(e,i,n)}function V(t,e,i){var n=new X(3);return n[0]=t,n[1]=e,n[2]=i,n}function ne(t,e,i){return t[0]=e[0]+i[0],t[1]=e[1]+i[1],t[2]=e[2]+i[2],t}function ae(t,e,i){return t[0]=e[0]-i[0],t[1]=e[1]-i[1],t[2]=e[2]-i[2],t}function A(t,e,i){return t[0]=e[0]*i,t[1]=e[1]*i,t[2]=e[2]*i,t}function D(t,e){var i=e[0],n=e[1],r=e[2],a=i*i+n*n+r*r;return a>0&&(a=1/Math.sqrt(a)),t[0]=e[0]*a,t[1]=e[1]*a,t[2]=e[2]*a,t}function oe(t,e,i){var n=e[0],r=e[1],a=e[2],o=i[0],s=i[1],d=i[2];return t[0]=r*d-a*s,t[1]=a*o-n*d,t[2]=n*s-r*o,t}function se(t,e,i){var n=e[0],r=e[1],a=e[2],o=i[3]*n+i[7]*r+i[11]*a+i[15];return o=o||1,t[0]=(i[0]*n+i[4]*r+i[8]*a+i[12])/o,t[1]=(i[1]*n+i[5]*r+i[9]*a+i[13])/o,t[2]=(i[2]*n+i[6]*r+i[10]*a+i[14])/o,t}var F=ae,q=re;(function(){var t=z();return function(e,i,n,r,a,o){var s,d;for(i||(i=3),n||(n=0),r?d=Math.min(r*i+n,e.length):d=e.length,s=n;s<d;s+=i)t[0]=e[s],t[1]=e[s+1],t[2]=e[s+2],a(t,t,o),e[s]=t[0],e[s+1]=t[1],e[s+2]=t[2];return e}})();const de=.7,_e=10;class ue{view_matrix_buffer;proj_matrix_buffer;device;pos;target;is_dragging;last_mouse_x;last_mouse_y;constructor(e){const i=document.querySelector("canvas");this.device=e,this.pos=V(1,1,3),this.target=V(0,0,0),this.setup_buffers(i.width,i.height),this.setup_listeners(i),this.update_view_matrix()}setup_listeners(e){this.is_dragging=!1,this.last_mouse_x=0,this.last_mouse_y=0,e.addEventListener("mousedown",i=>{this.is_dragging=!0,this.last_mouse_x=i.clientX,this.last_mouse_y=i.clientY}),e.addEventListener("mouseup",()=>{this.is_dragging=!1}),e.addEventListener("mouseleave",()=>{this.is_dragging=!1}),e.addEventListener("mousemove",i=>{if(!this.is_dragging)return;const n=i.clientX-this.last_mouse_x,r=i.clientY-this.last_mouse_y;this.rotate_camera(n,r),this.last_mouse_x=i.clientX,this.last_mouse_y=i.clientY}),e.addEventListener("wheel",i=>{i.preventDefault(),this.zoom_camera(i.deltaY)})}setup_buffers(e,i){this.view_matrix_buffer=this.device.createBuffer({label:"View Matrix Buffer",size:16*4,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST,mappedAtCreation:!1});let n=I();te(n,120,e/i,.01,100),this.proj_matrix_buffer=this.device.createBuffer({label:"Projection Matrix Buffer",size:16*4,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST,mappedAtCreation:!0}),new Float32Array(this.proj_matrix_buffer.getMappedRange()).set(n),this.proj_matrix_buffer.unmap()}update_view_matrix(){let e=I();ie(e,this.pos,this.target,V(0,1,0)),this.device.queue.writeBuffer(this.view_matrix_buffer,0,e)}rotate_camera(e,i){let n=I();Q(n,n,-e*.01);let r=z();F(r,this.target,this.pos);let a=z();oe(a,r,[0,1,0]),D(a,a),J(n,n,-i*.01,a),se(this.pos,this.pos,n),this.update_view_matrix()}zoom_camera(e){let i=z();F(i,this.target,this.pos),!(q(i)<de&&e<0)&&(q(i)>_e&&e>0||(D(i,i),e>0&&A(i,i,-1),A(i,i,.1),ne(this.pos,this.pos,i),this.update_view_matrix()))}}class p{repeat;permutation;p;constructor(e=-1){this.repeat=e,this.permutation=[151,160,137,91,90,15,131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,8,99,37,240,21,10,23,190,6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,57,177,33,88,237,149,56,87,174,20,125,136,171,168,68,175,74,165,71,134,139,48,27,166,77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,55,46,245,40,244,102,143,54,65,25,63,161,1,216,80,73,209,76,132,187,208,89,18,169,200,196,135,130,116,188,159,86,164,100,109,198,173,186,3,64,52,217,226,250,124,123,5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,189,28,42,223,183,170,213,119,248,152,2,44,154,163,70,221,153,101,155,167,43,172,9,129,22,39,253,19,98,108,110,79,113,224,232,178,185,112,104,218,246,97,228,251,34,242,193,238,210,144,12,191,179,162,241,81,51,145,235,249,14,239,107,49,192,214,31,181,199,106,157,184,84,204,176,115,121,50,45,127,4,150,254,138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180],this.p=new Array(512);for(let i=0;i<512;i++)this.p[i]=this.permutation[i%256]}octavePerlin(e,i,n,r){let a=0,o=1,s=1,d=0;for(let u=0;u<n;u++)a+=this.perlin(e*o,i*o)*s,d+=s,s*=r,o*=2;return a/d}perlin(e,i){this.repeat>0&&(e=e%this.repeat,i=i%this.repeat);let n=Math.floor(e)&255,r=Math.floor(i)&255,a=e-Math.floor(e),o=i-Math.floor(i),s=p.fade(a),d=p.fade(o),u=this.p[this.p[n]+r],_=this.p[this.p[n]+this.inc(r)],c=this.p[this.p[this.inc(n)]+r],h=this.p[this.p[this.inc(n)]+this.inc(r)],l=p.lerp(p.grad(u,a,o),p.grad(c,a-1,o),s),f=p.lerp(p.grad(_,a,o-1),p.grad(h,a-1,o-1),s);return(p.lerp(l,f,d)+1)/2}inc(e){return e++,this.repeat>0&&(e%=this.repeat),e}static grad(e,i,n){const r=e&7,a=r<4?i:n,o=r<4?n:i;return(r&1?-a:a)+(r&2?-o:o)}static fade(e){return e*e*e*(e*(e*6-15)+10)}static lerp(e,i,n){return e+n*(i-e)}}const le=`@group(0) @binding(0)
var bds_read: texture_storage_2d<rgba32float, read>;

@group(0) @binding(1)
var bds_write: texture_storage_2d<rgba32float, write>;

@compute @workgroup_size(16, 16) fn ComputeMain(@builtin(global_invocation_id) id: vec3<u32>) {
    let bds = textureLoad(bds_read, id.xy);
    // FIXME : this breaks everything
    // actually it's because it creates negative water height
    // but i'm keeping the fixme to remind myself that i need to deal with negative water height
    let rainfall = abs((cos(f32(id.x)) + cos(f32(id.y)))) * (0.0001); 

    let bds_new = bds + vec4f(0, rainfall, 0, 0);
    textureStore(bds_write, id.xy, bds_new);
}`,ce=`@group(0) @binding(0)
var bds_read: texture_storage_2d<rgba32float, read>;

@group(0) @binding(1)
var f_read: texture_storage_2d<rgba32float, read>;

@group(0) @binding(2)
var f_write: texture_storage_2d<rgba32float, write>;

//const a: f32 = 1.0;
const g: f32 = 1.0;
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

    let f_l = max(0, f[0] + (g * h_l));
    let f_r = max(0, f[1] + (g * h_r));
    let f_t = max(0, f[2] + (g * h_t));
    let f_b = max(0, f[3] + (g * h_b));

    let f_new = f + vec4f(f_l, f_r, f_t, f_b);

    // FIXME : sort out the values for lx * ly
    let k = min(1, bd[1] / (f_new[0] + f_new[1] + f_new[2] + f_new[3])); // scaling factor

    textureStore(f_write, id.xy, k * f_new);
}`,he=`@group(0) @binding(0)
var f_read: texture_storage_2d<rgba32float, read>;

@group(0) @binding(1)
var bds_read: texture_storage_2d<rgba32float, read>;

@group(0) @binding(2)
var bds_write : texture_storage_2d<rgba32float, write>;

@group(0) @binding(3)
var v_write : texture_storage_2d<rg32float, write>;


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
    let volume : f32 = total_in - total_out;

    let bds = textureLoad(bds_read, id.xy);
    let bds_new = bds + vec4f(0, volume, 0, 0);

    textureStore(bds_write, id.xy, bds_new);

    // STEP 2 : calculate the velocity field
    let water_amount_u : f32 = f_in_l - f_out[0] + f_out[1] - f_in_l;
    let water_amount_v : f32 = f_in_b - f_out[3] + f_out[2] - f_in_t;

    let average_water : f32 = (bds[1] + bds_new[1]) / 2.0;

    let v: vec2f = vec2f(water_amount_u / average_water, water_amount_v / average_water);

    textureStore(v_write, id.xy, vec4f(v, 0.0, 0.0));
}`,fe=`@group(0) @binding(0)
var bds_read: texture_storage_2d<rgba32float, read>;

@group(0) @binding(1)
var v_read: texture_storage_2d<rg32float, read>;

@group(0) @binding(2)
var bds_write: texture_storage_2d<rgba32float, write>;

@compute @workgroup_size(16, 16) fn ComputeMain(@builtin(global_invocation_id) id: vec3<u32>) {
    let dim = textureDimensions(bds_read);

    const K_C : f32 = 1.0; // sediment capacity constant
    const K_S : f32 = 0.001; // sediment dissoving constant
    const K_D : f32 = 0.01; // sediment deposition constant

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
}`,pe=`@group(0) @binding(0)
var bds_read: texture_storage_2d<rgba32float, read>;

@group(0) @binding(1)
var v_read: texture_storage_2d<rg32float, read>;

@group(0) @binding(2)
var bds_write: texture_storage_2d<rgba32float, write>;

@compute @workgroup_size(16, 16) fn ComputeMain(@builtin(global_invocation_id) id: vec3<u32>) {
    let dim = textureDimensions(v_read);

    let v : vec2f = textureLoad(v_read, id.xy).xy;
    
    let x : u32 = clamp(u32(f32(id.x) - v.x), 0, dim.x - 1);
    let y : u32 = clamp(u32(f32(id.y) - v.y), 0, dim.y - 1);

    let s : f32 = textureLoad(bds_read, vec2u(x, y))[2];

    let bds = textureLoad(bds_read, id.xy);
    let bds_new = vec4f(bds[0], bds[1], s, bds[3]);

    textureStore(bds_write, id.xy, bds_new);
}`,ge=`@group(0) @binding(0)
var bds_read: texture_storage_2d<rgba32float, read>;

@group(0) @binding(1)
var bds_write: texture_storage_2d<rgba32float, write>;

@compute @workgroup_size(16, 16) fn ComputeMain(@builtin(global_invocation_id) id: vec3<u32>) {
    const K_E : f32 = 0.01; // evaporation constant

    let bds = textureLoad(bds_read, id.xy);
    let water = bds[1];
    
    let bds_new = vec4f(bds[0], water * (1 - K_E), bds[2], bds[3]);

    textureStore(bds_write, id.xy, bds_new);
}`;class be{device;TEXTURES_W=1024;t1_read;t1_write;t2_read;t2_write;t3_read;t3_write;water_increment_shader;outflow_flux_shader;water_velocity_shader;erosion_deposition_shader;transportation_shader;evaporation_shader;water_increment_bind_group;outflow_flux_bind_group;water_velocity_bind_group;erosion_deposition_bind_group;transportation_bind_group;evaporation_bind_group;water_increment_pipeline;outflow_flux_pipeline;water_velocity_pipeline;erosion_deposition_pipeline;transportation_pipeline;evaporation_pipeline;view_bind_group_layout;view_bind_group;constructor(e){this.device=e,this.init_textures(),this.init_viz_and_params(),this.init_water_increment(),this.init_outflow_flux(),this.init_water_velocity(),this.init_erosion_deposition(),this.init_transportation(),this.init_evaporation(),this.init_buttons()}init_textures(){this.t1_read=this.device.createTexture({label:"t1 read",size:{width:this.TEXTURES_W,height:this.TEXTURES_W},format:"rgba32float",usage:GPUTextureUsage.STORAGE_BINDING|GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST}),this.t1_write=this.device.createTexture({label:"t1 write",size:{width:this.TEXTURES_W,height:this.TEXTURES_W},format:"rgba32float",usage:GPUTextureUsage.STORAGE_BINDING|GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_SRC}),this.t2_read=this.device.createTexture({label:"t2 read",size:{width:this.TEXTURES_W,height:this.TEXTURES_W},format:"rgba32float",usage:GPUTextureUsage.STORAGE_BINDING|GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST}),this.t2_write=this.device.createTexture({label:"t2 write",size:{width:this.TEXTURES_W,height:this.TEXTURES_W},format:"rgba32float",usage:GPUTextureUsage.STORAGE_BINDING|GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_SRC}),this.t3_read=this.device.createTexture({label:"t3 read",size:{width:this.TEXTURES_W,height:this.TEXTURES_W},format:"rg32float",usage:GPUTextureUsage.STORAGE_BINDING|GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST}),this.t3_write=this.device.createTexture({label:"t3 write",size:{width:this.TEXTURES_W,height:this.TEXTURES_W},format:"rg32float",usage:GPUTextureUsage.STORAGE_BINDING|GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_SRC});const e=new p,i=new Float32Array(this.TEXTURES_W*this.TEXTURES_W*4).map((n,r,a)=>{if(r%4==0){let o=r/4/this.TEXTURES_W,s=r/4%this.TEXTURES_W;return e.perlin(o/this.TEXTURES_W*4,s/this.TEXTURES_W*4)}return 0});this.device.queue.writeTexture({texture:this.t1_read},i,{bytesPerRow:4*4*this.TEXTURES_W},{width:this.TEXTURES_W,height:this.TEXTURES_W})}init_viz_and_params(){this.view_bind_group_layout=this.device.createBindGroupLayout({label:"visualization bind group layout",entries:[{binding:0,visibility:GPUShaderStage.VERTEX|GPUShaderStage.FRAGMENT,texture:{}},{binding:1,visibility:GPUShaderStage.FRAGMENT,texture:{}},{binding:2,visibility:GPUShaderStage.FRAGMENT,texture:{}}]}),this.view_bind_group=this.device.createBindGroup({label:"visualization bind group",layout:this.view_bind_group_layout,entries:[{binding:0,resource:this.t1_read.createView()},{binding:1,resource:this.t2_read.createView()},{binding:2,resource:this.t3_read.createView()}]})}init_water_increment(){let e=this.device.createBindGroupLayout({label:"Water Increment Bindgroup Layout",entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,storageTexture:{access:"read-only",format:"rgba32float"}},{binding:1,visibility:GPUShaderStage.COMPUTE,storageTexture:{access:"write-only",format:"rgba32float"}}]});this.water_increment_bind_group=this.device.createBindGroup({label:"Water Increment Bind Group",layout:e,entries:[{binding:0,resource:this.t1_read.createView()},{binding:1,resource:this.t1_write.createView()}]}),this.water_increment_shader=this.device.createShaderModule({label:"Water Increment Shader",code:le});let i=this.device.createPipelineLayout({bindGroupLayouts:[e]});this.water_increment_pipeline=this.device.createComputePipeline({label:"Water Increment Compute Pipeline",compute:{module:this.water_increment_shader},layout:i})}init_outflow_flux(){let e=this.device.createBindGroupLayout({label:"Outflow Flux Bindgroup Layout",entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,storageTexture:{access:"read-only",format:"rgba32float"}},{binding:1,visibility:GPUShaderStage.COMPUTE,storageTexture:{access:"read-only",format:"rgba32float"}},{binding:2,visibility:GPUShaderStage.COMPUTE,storageTexture:{access:"write-only",format:"rgba32float"}}]});this.outflow_flux_bind_group=this.device.createBindGroup({label:"Outflow Flux Bind Group",layout:e,entries:[{binding:0,resource:this.t1_read.createView()},{binding:1,resource:this.t2_read.createView()},{binding:2,resource:this.t2_write.createView()}]}),this.outflow_flux_shader=this.device.createShaderModule({label:"Outflow Flux Shader",code:ce});let i=this.device.createPipelineLayout({bindGroupLayouts:[e]});this.outflow_flux_pipeline=this.device.createComputePipeline({label:"Outflow Flux Compute Pipeline",compute:{module:this.outflow_flux_shader},layout:i})}init_water_velocity(){let e=this.device.createBindGroupLayout({label:"Water Velocity Bindgroup Layout",entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,storageTexture:{access:"read-only",format:"rgba32float"}},{binding:1,visibility:GPUShaderStage.COMPUTE,storageTexture:{access:"read-only",format:"rgba32float"}},{binding:2,visibility:GPUShaderStage.COMPUTE,storageTexture:{access:"write-only",format:"rgba32float"}},{binding:3,visibility:GPUShaderStage.COMPUTE,storageTexture:{access:"write-only",format:"rg32float"}}]});this.water_velocity_bind_group=this.device.createBindGroup({label:"Water Velocity Bind Group",layout:e,entries:[{binding:0,resource:this.t2_read.createView()},{binding:1,resource:this.t1_read.createView()},{binding:2,resource:this.t1_write.createView()},{binding:3,resource:this.t3_write.createView()}]}),this.water_velocity_shader=this.device.createShaderModule({label:"Water Velocity Shader",code:he});let i=this.device.createPipelineLayout({bindGroupLayouts:[e]});this.water_velocity_pipeline=this.device.createComputePipeline({label:"Water Velocity Compute Pipeline",compute:{module:this.water_velocity_shader},layout:i})}init_erosion_deposition(){let e=this.device.createBindGroupLayout({label:"Erosion Deposition Bindgroup Layout",entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,storageTexture:{access:"read-only",format:"rgba32float"}},{binding:1,visibility:GPUShaderStage.COMPUTE,storageTexture:{access:"read-only",format:"rg32float"}},{binding:2,visibility:GPUShaderStage.COMPUTE,storageTexture:{access:"write-only",format:"rgba32float"}}]});this.erosion_deposition_bind_group=this.device.createBindGroup({label:"Erosion Deposition Bind Group",layout:e,entries:[{binding:0,resource:this.t1_read.createView()},{binding:1,resource:this.t3_read.createView()},{binding:2,resource:this.t1_write.createView()}]}),this.erosion_deposition_shader=this.device.createShaderModule({label:"Erosion Deposition Shader",code:fe});let i=this.device.createPipelineLayout({bindGroupLayouts:[e]});this.erosion_deposition_pipeline=this.device.createComputePipeline({label:"Erosion Deposition Compute Pipeline",compute:{module:this.erosion_deposition_shader},layout:i})}init_transportation(){let e=this.device.createBindGroupLayout({label:"Transportation Bindgroup Layout",entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,storageTexture:{access:"read-only",format:"rgba32float"}},{binding:1,visibility:GPUShaderStage.COMPUTE,storageTexture:{access:"read-only",format:"rg32float"}},{binding:2,visibility:GPUShaderStage.COMPUTE,storageTexture:{access:"write-only",format:"rgba32float"}}]});this.transportation_bind_group=this.device.createBindGroup({label:"Transportation Bind Group",layout:e,entries:[{binding:0,resource:this.t1_read.createView()},{binding:1,resource:this.t3_read.createView()},{binding:2,resource:this.t1_write.createView()}]}),this.transportation_shader=this.device.createShaderModule({label:"Transportation Shader",code:pe});let i=this.device.createPipelineLayout({bindGroupLayouts:[e]});this.transportation_pipeline=this.device.createComputePipeline({label:"Transportation Compute Pipeline",compute:{module:this.transportation_shader},layout:i})}init_evaporation(){let e=this.device.createBindGroupLayout({label:"Evaporation Bindgroup Layout",entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,storageTexture:{access:"read-only",format:"rgba32float"}},{binding:1,visibility:GPUShaderStage.COMPUTE,storageTexture:{access:"write-only",format:"rgba32float"}}]});this.evaporation_bind_group=this.device.createBindGroup({label:"Evaporation Bind Group",layout:e,entries:[{binding:0,resource:this.t1_read.createView()},{binding:1,resource:this.t1_write.createView()}]}),this.evaporation_shader=this.device.createShaderModule({label:"Evaporation Shader",code:ge});let i=this.device.createPipelineLayout({bindGroupLayouts:[e]});this.evaporation_pipeline=this.device.createComputePipeline({label:"Evaportation Compute Pipeline",compute:{module:this.evaporation_shader},layout:i})}init_buttons(){document.getElementById("water_increment_button").addEventListener("mousedown",()=>{this.run_water_increment()}),document.getElementById("outflow_flux_button").addEventListener("mousedown",()=>{this.run_outflow_flux()}),document.getElementById("water_velocity_button").addEventListener("mousedown",()=>{this.run_water_velocity()}),document.getElementById("erosion_deposition_button").addEventListener("mousedown",()=>{this.run_erosion_deposition()})}run_water_increment(){const e=this.device.createCommandEncoder({}),i=e.beginComputePass();i.setPipeline(this.water_increment_pipeline),i.setBindGroup(0,this.water_increment_bind_group),i.dispatchWorkgroups(this.TEXTURES_W/16,this.TEXTURES_W/16),i.end(),e.copyTextureToTexture({texture:this.t1_write},{texture:this.t1_read},{width:this.TEXTURES_W,height:this.TEXTURES_W});const n=e.finish();this.device.queue.submit([n])}run_outflow_flux(){const e=this.device.createCommandEncoder({}),i=e.beginComputePass();i.setPipeline(this.outflow_flux_pipeline),i.setBindGroup(0,this.outflow_flux_bind_group),i.dispatchWorkgroups(this.TEXTURES_W/16,this.TEXTURES_W/16),i.end(),e.copyTextureToTexture({texture:this.t2_write},{texture:this.t2_read},{width:this.TEXTURES_W,height:this.TEXTURES_W});const n=e.finish();this.device.queue.submit([n])}run_water_velocity(){const e=this.device.createCommandEncoder({}),i=e.beginComputePass();i.setPipeline(this.water_velocity_pipeline),i.setBindGroup(0,this.water_velocity_bind_group),i.dispatchWorkgroups(this.TEXTURES_W/16,this.TEXTURES_W/16),i.end(),e.copyTextureToTexture({texture:this.t1_write},{texture:this.t1_read},{width:this.TEXTURES_W,height:this.TEXTURES_W}),e.copyTextureToTexture({texture:this.t3_write},{texture:this.t3_read},{width:this.TEXTURES_W,height:this.TEXTURES_W});const n=e.finish();this.device.queue.submit([n])}run_erosion_deposition(){const e=this.device.createCommandEncoder({}),i=e.beginComputePass();i.setPipeline(this.erosion_deposition_pipeline),i.setBindGroup(0,this.erosion_deposition_bind_group),i.dispatchWorkgroups(this.TEXTURES_W/16,this.TEXTURES_W/16),i.end(),e.copyTextureToTexture({texture:this.t1_write},{texture:this.t1_read},{width:this.TEXTURES_W,height:this.TEXTURES_W});const n=e.finish();this.device.queue.submit([n])}run_transportation(){const e=this.device.createCommandEncoder({}),i=e.beginComputePass();i.setPipeline(this.transportation_pipeline),i.setBindGroup(0,this.transportation_bind_group),i.dispatchWorkgroups(this.TEXTURES_W/16,this.TEXTURES_W/16),i.end(),e.copyTextureToTexture({texture:this.t1_write},{texture:this.t1_read},{width:this.TEXTURES_W,height:this.TEXTURES_W});const n=e.finish();this.device.queue.submit([n])}run_evaporation(){const e=this.device.createCommandEncoder({}),i=e.beginComputePass();i.setPipeline(this.evaporation_pipeline),i.setBindGroup(0,this.evaporation_bind_group),i.dispatchWorkgroups(this.TEXTURES_W/16,this.TEXTURES_W/16),i.end(),e.copyTextureToTexture({texture:this.t1_write},{texture:this.t1_read},{width:this.TEXTURES_W,height:this.TEXTURES_W});const n=e.finish();this.device.queue.submit([n])}run_full_step(){this.run_water_increment(),this.run_outflow_flux(),this.run_water_velocity(),this.run_erosion_deposition(),this.run_transportation(),this.run_evaporation()}}const{device:S,context:ve,canvasFormat:xe,depthTexture:me}=await Z(),Y=new ue(S),v=new j(S,500,Y.view_matrix_buffer,Y.proj_matrix_buffer),N=new be(S),ye=S.createPipelineLayout({bindGroupLayouts:[v.bind_group_layout,N.view_bind_group_layout]}),we=S.createRenderPipeline({label:"Mesh Render Pipeline",layout:ye,vertex:{module:v.shader_module,entryPoint:"vertexMain",buffers:[v.vertex_buffer_layout]},fragment:{module:v.shader_module,entryPoint:"fragmentMain",targets:[{format:xe}]},primitive:{frontFace:"ccw",cullMode:"back"},depthStencil:{depthWriteEnabled:!0,depthCompare:"less",format:"depth24plus"}});function k(){N.run_full_step();const t=S.createCommandEncoder(),e=t.beginRenderPass({colorAttachments:[{view:ve.getCurrentTexture().createView(),loadOp:"clear",storeOp:"store",clearValue:[0,0,.1,1]}],depthStencilAttachment:{view:me.createView(),depthClearValue:1,depthLoadOp:"clear",depthStoreOp:"store"}});e.setPipeline(we),e.setVertexBuffer(0,v.vertex_buffer),e.setIndexBuffer(v.index_buffer,"uint32"),e.setBindGroup(0,v.bind_group),e.setBindGroup(1,N.view_bind_group),e.drawIndexed(v.nb_to_draw),e.end();const i=t.finish();S.queue.submit([i]),requestAnimationFrame(k)}requestAnimationFrame(k);
