(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const n of document.querySelectorAll('link[rel="modulepreload"]'))r(n);new MutationObserver(n=>{for(const a of n)if(a.type==="childList")for(const s of a.addedNodes)s.tagName==="LINK"&&s.rel==="modulepreload"&&r(s)}).observe(document,{childList:!0,subtree:!0});function i(n){const a={};return n.integrity&&(a.integrity=n.integrity),n.referrerPolicy&&(a.referrerPolicy=n.referrerPolicy),n.crossOrigin==="use-credentials"?a.credentials="include":n.crossOrigin==="anonymous"?a.credentials="omit":a.credentials="same-origin",a}function r(n){if(n.ep)return;n.ep=!0;const a=i(n);fetch(n.href,a)}})();const H=`struct Vertex {
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

} `;class Z{vertex_buffer;index_buffer;vertex_buffer_layout;nb_to_draw;shader_module;bind_group_layout;bind_group;sampler;constructor(t,i,r,n){let{vertices:a,indices:s}=$(i);const o=t.createBuffer({label:"Grid Vertex Buffer",size:a.byteLength,usage:GPUBufferUsage.VERTEX|GPUBufferUsage.COPY_DST,mappedAtCreation:!0});new Float32Array(o.getMappedRange()).set(a),o.unmap();const u=t.createBuffer({label:"Grid Index Buffer",size:s.byteLength,usage:GPUBufferUsage.INDEX|GPUBufferUsage.COPY_DST,mappedAtCreation:!0});new Uint32Array(u.getMappedRange()).set(s),u.unmap();const d={arrayStride:5*4,attributes:[{shaderLocation:0,offset:0,format:"float32x3"},{shaderLocation:1,offset:3*4,format:"float32x2"}]};this.vertex_buffer=o,this.index_buffer=u,this.vertex_buffer_layout=d,this.nb_to_draw=(i-1)*(i-1)*6,this.shader_module=t.createShaderModule({label:"Grid Mesh Shader",code:H}),this.sampler=t.createSampler({}),this.bind_group_layout=t.createBindGroupLayout({label:"Grid Mesh Bindgroup Layout",entries:[{binding:0,visibility:GPUShaderStage.VERTEX,buffer:{type:"uniform",hasDynamicOffset:!1,minBindingSize:void 0}},{binding:1,visibility:GPUShaderStage.VERTEX,buffer:{type:"uniform",hasDynamicOffset:!1,minBindingSize:void 0}},{binding:2,visibility:GPUShaderStage.FRAGMENT,sampler:{}}]}),this.bind_group=t.createBindGroup({label:"Grid Bind Group",layout:this.bind_group_layout,entries:[{binding:0,resource:{buffer:r}},{binding:1,resource:{buffer:n}},{binding:2,resource:this.sampler}]})}}function $(e){let t=new Float32Array(e*e*5),i=0;for(let a=0;a<e;a++)for(let s=0;s<e;s++)t[i++]=s/(e-1)-.5,t[i++]=0,t[i++]=a/(e-1)-.5,t[i++]=s/(e-1),t[i++]=1-a/(e-1);let r=new Uint32Array((e-1)*(e-1)*6),n=0;for(let a=0;a<e-1;a++)for(let s=0;s<e-1;s++){let o=a*e+s,u=o+1,d=(a+1)*e+s,_=d+1;r[n++]=o,r[n++]=d,r[n++]=u,r[n++]=u,r[n++]=d,r[n++]=_}return{vertices:t,indices:r}}async function J(){let e=document.querySelector("canvas");if(!navigator.gpu)throw new Error("WebGPU not supported on this browser.");const t=await navigator.gpu.requestAdapter();if(!t)throw new Error("No appropriate GPUAdapter found.");const i=await t.requestDevice({requiredFeatures:["float32-filterable"]});if(!i)throw new Error("Your WebGPU device doesn't support filterable float32 textures !");const r=e.getContext("webgpu"),n=navigator.gpu.getPreferredCanvasFormat();r.configure({device:i,format:n});const a=i.createTexture({size:[e.width,e.height],format:"depth24plus",usage:GPUTextureUsage.RENDER_ATTACHMENT});return{device:i,context:r,canvasFormat:n,depthTexture:a}}var D=1e-6,z=typeof Float32Array<"u"?Float32Array:Array;Math.hypot||(Math.hypot=function(){for(var e=0,t=arguments.length;t--;)e+=arguments[t]*arguments[t];return Math.sqrt(e)});function A(){var e=new z(16);return z!=Float32Array&&(e[1]=0,e[2]=0,e[3]=0,e[4]=0,e[6]=0,e[7]=0,e[8]=0,e[9]=0,e[11]=0,e[12]=0,e[13]=0,e[14]=0),e[0]=1,e[5]=1,e[10]=1,e[15]=1,e}function Q(e){return e[0]=1,e[1]=0,e[2]=0,e[3]=0,e[4]=0,e[5]=1,e[6]=0,e[7]=0,e[8]=0,e[9]=0,e[10]=1,e[11]=0,e[12]=0,e[13]=0,e[14]=0,e[15]=1,e}function ee(e,t,i,r){var n=r[0],a=r[1],s=r[2],o=Math.hypot(n,a,s),u,d,_,p,l,f,h,g,b,m,y,x,w,U,T,P,G,L,B,I,N,R,M,C;return o<D?null:(o=1/o,n*=o,a*=o,s*=o,u=Math.sin(i),d=Math.cos(i),_=1-d,p=t[0],l=t[1],f=t[2],h=t[3],g=t[4],b=t[5],m=t[6],y=t[7],x=t[8],w=t[9],U=t[10],T=t[11],P=n*n*_+d,G=a*n*_+s*u,L=s*n*_-a*u,B=n*a*_-s*u,I=a*a*_+d,N=s*a*_+n*u,R=n*s*_+a*u,M=a*s*_-n*u,C=s*s*_+d,e[0]=p*P+g*G+x*L,e[1]=l*P+b*G+w*L,e[2]=f*P+m*G+U*L,e[3]=h*P+y*G+T*L,e[4]=p*B+g*I+x*N,e[5]=l*B+b*I+w*N,e[6]=f*B+m*I+U*N,e[7]=h*B+y*I+T*N,e[8]=p*R+g*M+x*C,e[9]=l*R+b*M+w*C,e[10]=f*R+m*M+U*C,e[11]=h*R+y*M+T*C,t!==e&&(e[12]=t[12],e[13]=t[13],e[14]=t[14],e[15]=t[15]),e)}function te(e,t,i){var r=Math.sin(i),n=Math.cos(i),a=t[0],s=t[1],o=t[2],u=t[3],d=t[8],_=t[9],p=t[10],l=t[11];return t!==e&&(e[4]=t[4],e[5]=t[5],e[6]=t[6],e[7]=t[7],e[12]=t[12],e[13]=t[13],e[14]=t[14],e[15]=t[15]),e[0]=a*n-d*r,e[1]=s*n-_*r,e[2]=o*n-p*r,e[3]=u*n-l*r,e[8]=a*r+d*n,e[9]=s*r+_*n,e[10]=o*r+p*n,e[11]=u*r+l*n,e}function ie(e,t,i,r,n){var a=1/Math.tan(t/2),s;return e[0]=a/i,e[1]=0,e[2]=0,e[3]=0,e[4]=0,e[5]=a,e[6]=0,e[7]=0,e[8]=0,e[9]=0,e[11]=-1,e[12]=0,e[13]=0,e[15]=0,n!=null&&n!==1/0?(s=1/(r-n),e[10]=(n+r)*s,e[14]=2*n*r*s):(e[10]=-1,e[14]=-2*r),e}var re=ie;function ne(e,t,i,r){var n,a,s,o,u,d,_,p,l,f,h=t[0],g=t[1],b=t[2],m=r[0],y=r[1],x=r[2],w=i[0],U=i[1],T=i[2];return Math.abs(h-w)<D&&Math.abs(g-U)<D&&Math.abs(b-T)<D?Q(e):(_=h-w,p=g-U,l=b-T,f=1/Math.hypot(_,p,l),_*=f,p*=f,l*=f,n=y*l-x*p,a=x*_-m*l,s=m*p-y*_,f=Math.hypot(n,a,s),f?(f=1/f,n*=f,a*=f,s*=f):(n=0,a=0,s=0),o=p*s-l*a,u=l*n-_*s,d=_*a-p*n,f=Math.hypot(o,u,d),f?(f=1/f,o*=f,u*=f,d*=f):(o=0,u=0,d=0),e[0]=n,e[1]=o,e[2]=_,e[3]=0,e[4]=a,e[5]=u,e[6]=p,e[7]=0,e[8]=s,e[9]=d,e[10]=l,e[11]=0,e[12]=-(n*h+a*g+s*b),e[13]=-(o*h+u*g+d*b),e[14]=-(_*h+p*g+l*b),e[15]=1,e)}function E(){var e=new z(3);return z!=Float32Array&&(e[0]=0,e[1]=0,e[2]=0),e}function ae(e){var t=e[0],i=e[1],r=e[2];return Math.hypot(t,i,r)}function V(e,t,i){var r=new z(3);return r[0]=e,r[1]=t,r[2]=i,r}function se(e,t,i){return e[0]=t[0]+i[0],e[1]=t[1]+i[1],e[2]=t[2]+i[2],e}function oe(e,t,i){return e[0]=t[0]-i[0],e[1]=t[1]-i[1],e[2]=t[2]-i[2],e}function q(e,t,i){return e[0]=t[0]*i,e[1]=t[1]*i,e[2]=t[2]*i,e}function F(e,t){var i=t[0],r=t[1],n=t[2],a=i*i+r*r+n*n;return a>0&&(a=1/Math.sqrt(a)),e[0]=t[0]*a,e[1]=t[1]*a,e[2]=t[2]*a,e}function ue(e,t){return e[0]*t[0]+e[1]*t[1]+e[2]*t[2]}function de(e,t,i){var r=t[0],n=t[1],a=t[2],s=i[0],o=i[1],u=i[2];return e[0]=n*u-a*o,e[1]=a*s-r*u,e[2]=r*o-n*s,e}function _e(e,t,i){var r=t[0],n=t[1],a=t[2],s=i[3]*r+i[7]*n+i[11]*a+i[15];return s=s||1,e[0]=(i[0]*r+i[4]*n+i[8]*a+i[12])/s,e[1]=(i[1]*r+i[5]*n+i[9]*a+i[13])/s,e[2]=(i[2]*r+i[6]*n+i[10]*a+i[14])/s,e}var k=oe,Y=ae;(function(){var e=E();return function(t,i,r,n,a,s){var o,u;for(i||(i=3),r||(r=0),n?u=Math.min(n*i+r,t.length):u=t.length,o=r;o<u;o+=i)e[0]=t[o],e[1]=t[o+1],e[2]=t[o+2],a(e,e,s),t[o]=e[0],t[o+1]=e[1],t[o+2]=e[2];return t}})();const le=.7,fe=10;class pe{view_matrix_buffer;proj_matrix_buffer;device;pos;target;is_dragging;last_mouse_x;last_mouse_y;constructor(t){const i=document.querySelector("canvas");this.device=t,this.pos=V(.6,1.2,.9),this.target=V(0,0,0),this.setup_buffers(i.width,i.height),this.setup_listeners(i),this.update_view_matrix()}setup_listeners(t){this.is_dragging=!1,this.last_mouse_x=0,this.last_mouse_y=0,t.addEventListener("mousedown",i=>{this.is_dragging=!0,this.last_mouse_x=i.clientX,this.last_mouse_y=i.clientY}),t.addEventListener("mouseup",()=>{this.is_dragging=!1}),t.addEventListener("mouseleave",()=>{this.is_dragging=!1}),t.addEventListener("mousemove",i=>{if(!this.is_dragging)return;const r=i.clientX-this.last_mouse_x,n=i.clientY-this.last_mouse_y;this.rotate_camera(r,n),this.last_mouse_x=i.clientX,this.last_mouse_y=i.clientY}),t.addEventListener("wheel",i=>{i.preventDefault(),this.zoom_camera(i.deltaY)})}setup_buffers(t,i){this.view_matrix_buffer=this.device.createBuffer({label:"View Matrix Buffer",size:16*4,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST,mappedAtCreation:!1});let r=A();re(r,120,t/i,.01,100),this.proj_matrix_buffer=this.device.createBuffer({label:"Projection Matrix Buffer",size:16*4,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST,mappedAtCreation:!0}),new Float32Array(this.proj_matrix_buffer.getMappedRange()).set(r),this.proj_matrix_buffer.unmap()}update_view_matrix(){let t=A();ne(t,this.pos,this.target,V(0,1,0)),this.device.queue.writeBuffer(this.view_matrix_buffer,0,t)}rotate_camera(t,i){let r=A();te(r,r,-t*.01);let n=E();k(n,this.target,this.pos);let a=E();de(a,n,[0,1,0]),F(a,a),ee(r,r,-i*.01,a);let s=E();_e(s,this.pos,r);let o=E();k(o,this.target,s),F(o,o);let u=ue(o,[0,-1,0]);u>.95||u<-.95||(this.pos=s,this.update_view_matrix())}zoom_camera(t){let i=E();k(i,this.target,this.pos),!(Y(i)<le&&t<0)&&(Y(i)>fe&&t>0||(F(i,i),t>0&&q(i,i,-1),q(i,i,.1),se(this.pos,this.pos,i),this.update_view_matrix()))}}class c{repeat;permutation;p;constructor(t=-1){this.repeat=t,this.permutation=[151,160,137,91,90,15,131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,8,99,37,240,21,10,23,190,6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,57,177,33,88,237,149,56,87,174,20,125,136,171,168,68,175,74,165,71,134,139,48,27,166,77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,55,46,245,40,244,102,143,54,65,25,63,161,1,216,80,73,209,76,132,187,208,89,18,169,200,196,135,130,116,188,159,86,164,100,109,198,173,186,3,64,52,217,226,250,124,123,5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,189,28,42,223,183,170,213,119,248,152,2,44,154,163,70,221,153,101,155,167,43,172,9,129,22,39,253,19,98,108,110,79,113,224,232,178,185,112,104,218,246,97,228,251,34,242,193,238,210,144,12,191,179,162,241,81,51,145,235,249,14,239,107,49,192,214,31,181,199,106,157,184,84,204,176,115,121,50,45,127,4,150,254,138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180],this.p=new Array(512);for(let i=0;i<512;i++)this.p[i]=this.permutation[i%256]}octavePerlin(t,i,r,n){let a=0,s=1,o=1,u=0;for(let d=0;d<r;d++)a+=this.perlin(t*s,i*s)*o,u+=o,o*=n,s*=2;return a/u}perlin(t,i){this.repeat>0&&(t=t%this.repeat,i=i%this.repeat);let r=Math.floor(t)&255,n=Math.floor(i)&255,a=t-Math.floor(t),s=i-Math.floor(i),o=c.fade(a),u=c.fade(s),d=this.p[this.p[r]+n],_=this.p[this.p[r]+this.inc(n)],p=this.p[this.p[this.inc(r)]+n],l=this.p[this.p[this.inc(r)]+this.inc(n)],f=c.lerp(c.grad(d,a,s),c.grad(p,a-1,s),o),h=c.lerp(c.grad(_,a,s-1),c.grad(l,a-1,s-1),o);return(c.lerp(f,h,u)+1)/2}inc(t){return t++,this.repeat>0&&(t%=this.repeat),t}static grad(t,i,r){const n=t&7,a=n<4?i:r,s=n<4?r:i;return(n&1?-a:a)+(n&2?-s:s)}static fade(t){return t*t*t*(t*(t*6-15)+10)}static lerp(t,i,r){return t+r*(i-t)}}const he=`@group(0) @binding(0)
var bds_read: texture_storage_2d<rgba32float, read>;

@group(0) @binding(1)
var bds_write: texture_storage_2d<rgba32float, write>;

@group(1) @binding(0)
var<uniform> timestep: f32;

@group(1) @binding(1)
var<uniform> rainfall: f32;

@compute @workgroup_size(16, 16) fn ComputeMain(@builtin(global_invocation_id) id: vec3<u32>) {
    let bds = textureLoad(bds_read, id.xy);
    
    let bds_new = bds + vec4f(0, rainfall * timestep, 0, 0);

    textureStore(bds_write, id.xy, bds_new);
}`,ce=`@group(0) @binding(0)
var bds_read: texture_storage_2d<rgba32float, read>;

@group(0) @binding(1)
var f_read: texture_storage_2d<rgba32float, read>;

@group(0) @binding(2)
var f_write: texture_storage_2d<rgba32float, write>;

@group(1) @binding(0)
var<uniform> timestep: f32;

@group(1) @binding(2)
var<uniform> g: f32;

@group(1) @binding(7)
var<uniform> terrain_height_scale: f32;

const a: f32 = 10.0;
const l = 1.0;

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

    let f_l = max(0, f[0] + timestep * a * ((g * h_l) / l));
    let f_r = max(0, f[1] + timestep * a * ((g * h_r) / l));
    let f_t = max(0, f[2] + timestep * a * ((g * h_t) / l));
    let f_b = max(0, f[3] + timestep * a * ((g * h_b) / l));

    let f_new = f + vec4f(f_l, f_r, f_t, f_b);

    let k = min(1, (bd[1] * l * l)/ ((f_new[0] + f_new[1] + f_new[2] + f_new[3]) * timestep)); // scaling factor

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

@group(1) @binding(7)
var<uniform> terrain_height_scale: f32;

@compute @workgroup_size(16, 16) fn ComputeMain(@builtin(global_invocation_id) id: vec3<u32>) {
    
    let dim = textureDimensions(bds_read);
    //let l : f32 = terrain_width_scale / f32(dim.x);
    const l = 1.0;

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

    let volume : f32 = (timestep *(total_in - total_out)) / l * l;

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
}`;class ye{device;running=!0;next_resolution;RESOLUTION=1024;t1_read;t1_write;t2_read;t2_write;t3_read;t3_write;water_increment_shader;outflow_flux_shader;water_velocity_shader;erosion_deposition_shader;transportation_shader;evaporation_shader;water_increment_bind_group;outflow_flux_bind_group;water_velocity_bind_group;erosion_deposition_bind_group;transportation_bind_group;evaporation_bind_group;water_increment_bind_group_layout;outflow_flux_bind_group_layout;water_velocity_bind_group_layout;erosion_deposition_bind_group_layout;transportation_bind_group_layout;evaporation_bind_group_layout;water_increment_pipeline;outflow_flux_pipeline;water_velocity_pipeline;erosion_deposition_pipeline;transportation_pipeline;evaporation_pipeline;view_bind_group_layout;view_bind_group;view_type_buffer;params_bind_group_layout;params_bind_group;timestep_param_buffer;rainfall_param_buffer;g_param_buffer;kc_param_buffer;ks_param_buffer;kd_param_buffer;evaporation_param_buffer;terrain_height_param_buffer;terrain_width_param_buffer;terrain_height=200;constructor(t){this.device=t,this.init_textures(),this.init_viz_and_params(),this.init_water_increment_pipeline(),this.init_outflow_flux_pipeline(),this.init_water_velocity_pipeline(),this.init_erosion_deposition_pipeline(),this.init_transportation_pipeline(),this.init_evaporation_pipeline(),this.reset_heightmap(),this.update_texture_bind_groups()}init_textures(){this.next_resolution&&(this.RESOLUTION=this.next_resolution),this.t1_read&&this.t1_read.destroy(),this.t1_read=this.device.createTexture({label:"t1 read",size:{width:this.RESOLUTION,height:this.RESOLUTION},format:"rgba32float",usage:GPUTextureUsage.STORAGE_BINDING|GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST}),this.t1_write=this.device.createTexture({label:"t1 write",size:{width:this.RESOLUTION,height:this.RESOLUTION},format:"rgba32float",usage:GPUTextureUsage.STORAGE_BINDING|GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_SRC}),this.t2_read=this.device.createTexture({label:"t2 read",size:{width:this.RESOLUTION,height:this.RESOLUTION},format:"rgba32float",usage:GPUTextureUsage.STORAGE_BINDING|GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST}),this.t2_write=this.device.createTexture({label:"t2 write",size:{width:this.RESOLUTION,height:this.RESOLUTION},format:"rgba32float",usage:GPUTextureUsage.STORAGE_BINDING|GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_SRC}),this.t3_read=this.device.createTexture({label:"t3 read",size:{width:this.RESOLUTION,height:this.RESOLUTION},format:"rg32float",usage:GPUTextureUsage.STORAGE_BINDING|GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST}),this.t3_write=this.device.createTexture({label:"t3 write",size:{width:this.RESOLUTION,height:this.RESOLUTION},format:"rg32float",usage:GPUTextureUsage.STORAGE_BINDING|GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_SRC})}reset_heightmap(){const t=new c,i=Math.random()*10,r=Math.random()*10,n=new Float32Array(this.RESOLUTION*this.RESOLUTION*4).map((a,s,o)=>{if(s%4==0){let u=s/4/this.RESOLUTION,d=s/4%this.RESOLUTION;return t.perlin((u/this.RESOLUTION+i)*6,(d/this.RESOLUTION+r)*6)*this.terrain_height}return 0});this.device.queue.writeTexture({texture:this.t1_read},n,{bytesPerRow:4*4*this.RESOLUTION},{width:this.RESOLUTION,height:this.RESOLUTION}),this.device.queue.writeTexture({texture:this.t2_read},new Float32Array(this.RESOLUTION*this.RESOLUTION*4),{offset:0,bytesPerRow:4*4*this.RESOLUTION,rowsPerImage:this.RESOLUTION},{width:this.RESOLUTION,height:this.RESOLUTION}),this.device.queue.writeTexture({texture:this.t3_read},new Float32Array(this.RESOLUTION*this.RESOLUTION*2),{offset:0,bytesPerRow:4*2*this.RESOLUTION,rowsPerImage:this.RESOLUTION},{width:this.RESOLUTION,height:this.RESOLUTION}),this.device.queue.writeBuffer(this.terrain_height_param_buffer,0,new Float32Array([this.terrain_height]))}init_viz_and_params(){this.view_type_buffer=this.device.createBuffer({label:"visualization type buffer",size:4,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),this.view_bind_group_layout=this.device.createBindGroupLayout({label:"visualization bind group layout",entries:[{binding:0,visibility:GPUShaderStage.VERTEX|GPUShaderStage.FRAGMENT,texture:{}},{binding:1,visibility:GPUShaderStage.FRAGMENT,texture:{}},{binding:2,visibility:GPUShaderStage.FRAGMENT,texture:{}},{binding:3,visibility:GPUShaderStage.FRAGMENT,buffer:{}}]}),this.params_bind_group_layout=this.device.createBindGroupLayout({label:"parameters bind group layout",entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{}},{binding:3,visibility:GPUShaderStage.COMPUTE,buffer:{}},{binding:4,visibility:GPUShaderStage.COMPUTE,buffer:{}},{binding:5,visibility:GPUShaderStage.COMPUTE,buffer:{}},{binding:6,visibility:GPUShaderStage.COMPUTE,buffer:{}},{binding:7,visibility:GPUShaderStage.COMPUTE|GPUShaderStage.VERTEX,buffer:{}}]}),this.timestep_param_buffer=this.device.createBuffer({label:"timestep parameter buffer",size:4,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),this.rainfall_param_buffer=this.device.createBuffer({label:"rainfall parameter buffer",size:4,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),this.g_param_buffer=this.device.createBuffer({label:"gravity parameter buffer",size:4,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),this.kc_param_buffer=this.device.createBuffer({label:"kc parameter buffer",size:4,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),this.ks_param_buffer=this.device.createBuffer({label:"ks parameter buffer",size:4,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),this.kd_param_buffer=this.device.createBuffer({label:"kd parameter buffer",size:4,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),this.evaporation_param_buffer=this.device.createBuffer({label:"evaporation parameter buffer",size:4,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),this.terrain_height_param_buffer=this.device.createBuffer({label:"terrain height parameter buffer",size:4,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),this.terrain_width_param_buffer=this.device.createBuffer({label:"terrain width parameter buffer",size:4,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),this.params_bind_group=this.device.createBindGroup({label:"parameters bind group",layout:this.params_bind_group_layout,entries:[{binding:0,resource:{buffer:this.timestep_param_buffer}},{binding:1,resource:{buffer:this.rainfall_param_buffer}},{binding:2,resource:{buffer:this.g_param_buffer}},{binding:3,resource:{buffer:this.kc_param_buffer}},{binding:4,resource:{buffer:this.ks_param_buffer}},{binding:5,resource:{buffer:this.kd_param_buffer}},{binding:6,resource:{buffer:this.evaporation_param_buffer}},{binding:7,resource:{buffer:this.terrain_height_param_buffer}}]})}init_water_increment_pipeline(){this.water_increment_bind_group_layout=this.device.createBindGroupLayout({label:"Water Increment Bindgroup Layout",entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,storageTexture:{access:"read-only",format:"rgba32float"}},{binding:1,visibility:GPUShaderStage.COMPUTE,storageTexture:{access:"write-only",format:"rgba32float"}}]}),this.water_increment_shader=this.device.createShaderModule({label:"Water Increment Shader",code:he});let t=this.device.createPipelineLayout({bindGroupLayouts:[this.water_increment_bind_group_layout,this.params_bind_group_layout]});this.water_increment_pipeline=this.device.createComputePipeline({label:"Water Increment Compute Pipeline",compute:{module:this.water_increment_shader},layout:t})}init_outflow_flux_pipeline(){this.outflow_flux_bind_group_layout=this.device.createBindGroupLayout({label:"Outflow Flux Bindgroup Layout",entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,storageTexture:{access:"read-only",format:"rgba32float"}},{binding:1,visibility:GPUShaderStage.COMPUTE,storageTexture:{access:"read-only",format:"rgba32float"}},{binding:2,visibility:GPUShaderStage.COMPUTE,storageTexture:{access:"write-only",format:"rgba32float"}}]}),this.outflow_flux_shader=this.device.createShaderModule({label:"Outflow Flux Shader",code:ce});let t=this.device.createPipelineLayout({bindGroupLayouts:[this.outflow_flux_bind_group_layout,this.params_bind_group_layout]});this.outflow_flux_pipeline=this.device.createComputePipeline({label:"Outflow Flux Compute Pipeline",compute:{module:this.outflow_flux_shader},layout:t})}init_water_velocity_pipeline(){this.water_velocity_bind_group_layout=this.device.createBindGroupLayout({label:"Water Velocity Bindgroup Layout",entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,storageTexture:{access:"read-only",format:"rgba32float"}},{binding:1,visibility:GPUShaderStage.COMPUTE,storageTexture:{access:"read-only",format:"rgba32float"}},{binding:2,visibility:GPUShaderStage.COMPUTE,storageTexture:{access:"write-only",format:"rgba32float"}},{binding:3,visibility:GPUShaderStage.COMPUTE,storageTexture:{access:"write-only",format:"rg32float"}}]}),this.water_velocity_shader=this.device.createShaderModule({label:"Water Velocity Shader",code:ge});let t=this.device.createPipelineLayout({bindGroupLayouts:[this.water_velocity_bind_group_layout,this.params_bind_group_layout]});this.water_velocity_pipeline=this.device.createComputePipeline({label:"Water Velocity Compute Pipeline",compute:{module:this.water_velocity_shader},layout:t})}init_erosion_deposition_pipeline(){this.erosion_deposition_bind_group_layout=this.device.createBindGroupLayout({label:"Erosion Deposition Bindgroup Layout",entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,storageTexture:{access:"read-only",format:"rgba32float"}},{binding:1,visibility:GPUShaderStage.COMPUTE,storageTexture:{access:"read-only",format:"rg32float"}},{binding:2,visibility:GPUShaderStage.COMPUTE,storageTexture:{access:"write-only",format:"rgba32float"}}]}),this.erosion_deposition_shader=this.device.createShaderModule({label:"Erosion Deposition Shader",code:be});let t=this.device.createPipelineLayout({bindGroupLayouts:[this.erosion_deposition_bind_group_layout,this.params_bind_group_layout]});this.erosion_deposition_pipeline=this.device.createComputePipeline({label:"Erosion Deposition Compute Pipeline",compute:{module:this.erosion_deposition_shader},layout:t})}init_transportation_pipeline(){this.transportation_bind_group_layout=this.device.createBindGroupLayout({label:"Transportation Bindgroup Layout",entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,storageTexture:{access:"read-only",format:"rgba32float"}},{binding:1,visibility:GPUShaderStage.COMPUTE,storageTexture:{access:"read-only",format:"rg32float"}},{binding:2,visibility:GPUShaderStage.COMPUTE,storageTexture:{access:"write-only",format:"rgba32float"}}]}),this.transportation_shader=this.device.createShaderModule({label:"Transportation Shader",code:ve});let t=this.device.createPipelineLayout({bindGroupLayouts:[this.transportation_bind_group_layout,this.params_bind_group_layout]});this.transportation_pipeline=this.device.createComputePipeline({label:"Transportation Compute Pipeline",compute:{module:this.transportation_shader},layout:t})}init_evaporation_pipeline(){this.evaporation_bind_group_layout=this.device.createBindGroupLayout({label:"Evaporation Bindgroup Layout",entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,storageTexture:{access:"read-only",format:"rgba32float"}},{binding:1,visibility:GPUShaderStage.COMPUTE,storageTexture:{access:"write-only",format:"rgba32float"}}]}),this.evaporation_shader=this.device.createShaderModule({label:"Evaporation Shader",code:me});let t=this.device.createPipelineLayout({bindGroupLayouts:[this.evaporation_bind_group_layout,this.params_bind_group_layout]});this.evaporation_pipeline=this.device.createComputePipeline({label:"Evaportation Compute Pipeline",compute:{module:this.evaporation_shader},layout:t})}update_texture_bind_groups(){this.water_increment_bind_group=this.device.createBindGroup({label:"Water Increment Bind Group",layout:this.water_increment_bind_group_layout,entries:[{binding:0,resource:this.t1_read.createView()},{binding:1,resource:this.t1_write.createView()}]}),this.outflow_flux_bind_group=this.device.createBindGroup({label:"Outflow Flux Bind Group",layout:this.outflow_flux_bind_group_layout,entries:[{binding:0,resource:this.t1_read.createView()},{binding:1,resource:this.t2_read.createView()},{binding:2,resource:this.t2_write.createView()}]}),this.water_velocity_bind_group=this.device.createBindGroup({label:"Water Velocity Bind Group",layout:this.water_velocity_bind_group_layout,entries:[{binding:0,resource:this.t2_read.createView()},{binding:1,resource:this.t1_read.createView()},{binding:2,resource:this.t1_write.createView()},{binding:3,resource:this.t3_write.createView()}]}),this.erosion_deposition_bind_group=this.device.createBindGroup({label:"Erosion Deposition Bind Group",layout:this.erosion_deposition_bind_group_layout,entries:[{binding:0,resource:this.t1_read.createView()},{binding:1,resource:this.t3_read.createView()},{binding:2,resource:this.t1_write.createView()}]}),this.transportation_bind_group=this.device.createBindGroup({label:"Transportation Bind Group",layout:this.transportation_bind_group_layout,entries:[{binding:0,resource:this.t1_read.createView()},{binding:1,resource:this.t3_read.createView()},{binding:2,resource:this.t1_write.createView()}]}),this.evaporation_bind_group=this.device.createBindGroup({label:"Evaporation Bind Group",layout:this.evaporation_bind_group_layout,entries:[{binding:0,resource:this.t1_read.createView()},{binding:1,resource:this.t1_write.createView()}]}),this.view_bind_group=this.device.createBindGroup({label:"visualization bind group",layout:this.view_bind_group_layout,entries:[{binding:0,resource:this.t1_read.createView()},{binding:1,resource:this.t2_read.createView()},{binding:2,resource:this.t3_read.createView()},{binding:3,resource:{buffer:this.view_type_buffer}}]})}run_water_increment(){const t=this.device.createCommandEncoder({}),i=t.beginComputePass();i.setPipeline(this.water_increment_pipeline),i.setBindGroup(0,this.water_increment_bind_group),i.setBindGroup(1,this.params_bind_group),i.dispatchWorkgroups(this.RESOLUTION/16,this.RESOLUTION/16),i.end(),t.copyTextureToTexture({texture:this.t1_write},{texture:this.t1_read},{width:this.RESOLUTION,height:this.RESOLUTION});const r=t.finish();this.device.queue.submit([r])}run_outflow_flux(){const t=this.device.createCommandEncoder({}),i=t.beginComputePass();i.setPipeline(this.outflow_flux_pipeline),i.setBindGroup(0,this.outflow_flux_bind_group),i.setBindGroup(1,this.params_bind_group),i.dispatchWorkgroups(this.RESOLUTION/16,this.RESOLUTION/16),i.end(),t.copyTextureToTexture({texture:this.t2_write},{texture:this.t2_read},{width:this.RESOLUTION,height:this.RESOLUTION});const r=t.finish();this.device.queue.submit([r])}run_water_velocity(){const t=this.device.createCommandEncoder({}),i=t.beginComputePass();i.setPipeline(this.water_velocity_pipeline),i.setBindGroup(0,this.water_velocity_bind_group),i.setBindGroup(1,this.params_bind_group),i.dispatchWorkgroups(this.RESOLUTION/16,this.RESOLUTION/16),i.end(),t.copyTextureToTexture({texture:this.t1_write},{texture:this.t1_read},{width:this.RESOLUTION,height:this.RESOLUTION}),t.copyTextureToTexture({texture:this.t3_write},{texture:this.t3_read},{width:this.RESOLUTION,height:this.RESOLUTION});const r=t.finish();this.device.queue.submit([r])}run_erosion_deposition(){const t=this.device.createCommandEncoder({}),i=t.beginComputePass();i.setPipeline(this.erosion_deposition_pipeline),i.setBindGroup(0,this.erosion_deposition_bind_group),i.setBindGroup(1,this.params_bind_group),i.dispatchWorkgroups(this.RESOLUTION/16,this.RESOLUTION/16),i.end(),t.copyTextureToTexture({texture:this.t1_write},{texture:this.t1_read},{width:this.RESOLUTION,height:this.RESOLUTION});const r=t.finish();this.device.queue.submit([r])}run_transportation(){const t=this.device.createCommandEncoder({}),i=t.beginComputePass();i.setPipeline(this.transportation_pipeline),i.setBindGroup(0,this.transportation_bind_group),i.setBindGroup(1,this.params_bind_group),i.dispatchWorkgroups(this.RESOLUTION/16,this.RESOLUTION/16),i.end(),t.copyTextureToTexture({texture:this.t1_write},{texture:this.t1_read},{width:this.RESOLUTION,height:this.RESOLUTION});const r=t.finish();this.device.queue.submit([r])}run_evaporation(){const t=this.device.createCommandEncoder({}),i=t.beginComputePass();i.setPipeline(this.evaporation_pipeline),i.setBindGroup(0,this.evaporation_bind_group),i.setBindGroup(1,this.params_bind_group),i.dispatchWorkgroups(this.RESOLUTION/16,this.RESOLUTION/16),i.end(),t.copyTextureToTexture({texture:this.t1_write},{texture:this.t1_read},{width:this.RESOLUTION,height:this.RESOLUTION});const r=t.finish();this.device.queue.submit([r])}run_full_step(){this.run_water_increment(),this.run_outflow_flux(),this.run_water_velocity(),this.run_erosion_deposition(),this.run_transportation(),this.run_evaporation()}}function xe(e){document.querySelectorAll('input[name="visualization"]').forEach(d=>{d.addEventListener("change",_=>{const p=_.target;if(p.checked){let l=0;switch(p.value){case"terrain":l=0;break;case"flow-x":l=1;break;case"flow-y":l=2;break;case"velocity-x":l=3;break;case"velocity-y":l=4;break;case"sediment":l=5;break;default:l=10}e.device.queue.writeBuffer(e.view_type_buffer,0,new Uint32Array([l]))}})}),document.getElementById("start-stop-button").addEventListener("mousedown",()=>{e.running=!e.running}),document.getElementById("reset-button").addEventListener("mousedown",()=>{e.init_textures(),e.update_texture_bind_groups(),e.reset_heightmap()});let t=(d,_)=>{e.device.queue.writeBuffer(d,0,new Float32Array([_]))},i=document.getElementById("timestep-input");i.addEventListener("input",()=>{t(e.timestep_param_buffer,Number(i.value))}),t(e.timestep_param_buffer,Number(i.value));let r=document.getElementById("rainfall-input");r.addEventListener("input",()=>{t(e.rainfall_param_buffer,Number(r.value))}),t(e.rainfall_param_buffer,Number(r.value));let n=document.getElementById("g-input");n.addEventListener("input",()=>{t(e.g_param_buffer,Number(n.value))}),t(e.g_param_buffer,Number(n.value));let a=document.getElementById("kc-input");a.addEventListener("input",()=>{t(e.kc_param_buffer,Number(a.value))}),t(e.kc_param_buffer,Number(a.value));let s=document.getElementById("ks-input");s.addEventListener("input",()=>{t(e.ks_param_buffer,Number(s.value))}),t(e.ks_param_buffer,Number(s.value));let o=document.getElementById("kd-input");o.addEventListener("input",()=>{t(e.kd_param_buffer,Number(o.value))}),t(e.kd_param_buffer,Number(o.value));let u=document.getElementById("evaporation-input");u.addEventListener("input",()=>{t(e.evaporation_param_buffer,Number(u.value))}),t(e.evaporation_param_buffer,Number(u.value)),document.getElementById("water-increment-button").addEventListener("mousedown",()=>{e.run_water_increment()}),document.getElementById("outflow-flux-button").addEventListener("mousedown",()=>{e.run_outflow_flux()}),document.getElementById("water-velocity-button").addEventListener("mousedown",()=>{e.run_water_velocity()}),document.getElementById("erosion-deposition-button").addEventListener("mousedown",()=>{e.run_erosion_deposition()}),document.getElementById("resolution-select").addEventListener("input",d=>{e.next_resolution=Number(d.target.value)}),document.getElementById("height-scale-input").addEventListener("input",d=>{e.terrain_height=Number(d.target.value)})}let X=document.querySelector("#viewport"),j=document.querySelector("canvas");j.width=X.clientWidth;j.height=X.clientHeight;const{device:S,context:we,canvasFormat:Ue,depthTexture:Te}=await J(),W=new pe(S),v=new Z(S,1024,W.view_matrix_buffer,W.proj_matrix_buffer),O=new ye(S);xe(O);const Oe=S.createPipelineLayout({bindGroupLayouts:[v.bind_group_layout,O.view_bind_group_layout,O.params_bind_group_layout]}),Se=S.createRenderPipeline({label:"Mesh Render Pipeline",layout:Oe,vertex:{module:v.shader_module,entryPoint:"vertexMain",buffers:[v.vertex_buffer_layout]},fragment:{module:v.shader_module,entryPoint:"fragmentMain",targets:[{format:Ue}]},primitive:{frontFace:"ccw",cullMode:"back"},depthStencil:{depthWriteEnabled:!0,depthCompare:"less",format:"depth24plus"}});function K(){O.running&&O.run_full_step();const e=S.createCommandEncoder(),t=e.beginRenderPass({colorAttachments:[{view:we.getCurrentTexture().createView(),loadOp:"clear",storeOp:"store",clearValue:[0,0,0,1]}],depthStencilAttachment:{view:Te.createView(),depthClearValue:1,depthLoadOp:"clear",depthStoreOp:"store"}});t.setPipeline(Se),t.setVertexBuffer(0,v.vertex_buffer),t.setIndexBuffer(v.index_buffer,"uint32"),t.setBindGroup(0,v.bind_group),t.setBindGroup(1,O.view_bind_group),t.setBindGroup(2,O.params_bind_group),t.drawIndexed(v.nb_to_draw),t.end();const i=e.finish();S.queue.submit([i]),requestAnimationFrame(K)}requestAnimationFrame(K);
