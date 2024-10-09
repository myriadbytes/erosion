import { mat4, vec3 } from "gl-matrix";

const CLOSEST_ZOOM = 0.7;
const FURTHEST_ZOOM = 10.0;

export class OrbitCamera {
    view_matrix_buffer: GPUBuffer;
    proj_matrix_buffer: GPUBuffer;
    device: GPUDevice;
    pos: vec3;
    target: vec3;
    is_dragging: boolean;
    last_mouse_x: number;
    last_mouse_y: number;

    constructor(device: GPUDevice) {
        const canvas = document.querySelector("canvas")!;

        this.device = device;
        this.pos = vec3.fromValues(0.0, 1.6, 0.5);
        this.target = vec3.fromValues(0.0, 0.0, 0.0);

        this.setup_buffers(canvas.width, canvas.height);
        this.setup_listeners(canvas);

        this.update_view_matrix();
    }

    setup_listeners(canvas: HTMLCanvasElement) {
        this.is_dragging = false;
        this.last_mouse_x = 0;
        this.last_mouse_y = 0;
        canvas.addEventListener("mousedown", (e) => {
            this.is_dragging = true;
            this.last_mouse_x = e.clientX;
            this.last_mouse_y = e.clientY;
        });
        canvas.addEventListener("mouseup", () => {
            this.is_dragging = false;
        });
        canvas.addEventListener("mouseleave", () => {
            this.is_dragging = false;
        });
        canvas.addEventListener("mousemove", (e) => {
            if (!this.is_dragging) return;

            const delta_x = e.clientX - this.last_mouse_x;
            const delta_y = e.clientY - this.last_mouse_y;

            this.rotate_camera(delta_x, delta_y);

            this.last_mouse_x = e.clientX;
            this.last_mouse_y = e.clientY;
        });

        canvas.addEventListener("wheel", (e) => {
            e.preventDefault();
            this.zoom_camera(e.deltaY);
        });
    }

    setup_buffers(width: number, height: number) {
        // view matrix buffer
        this.view_matrix_buffer = this.device.createBuffer({
            label: "View Matrix Buffer",
            size: 16 * 4,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            mappedAtCreation: false,
        });

        // proj matrix buffer
        // directly mapped, since it's not going to change (for now)
        let proj_matrix = mat4.create();
        mat4.perspective(proj_matrix, 120, width / height, 0.01, 100);
        this.proj_matrix_buffer = this.device.createBuffer({
            label: "Projection Matrix Buffer",
            size: 16 * 4,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            mappedAtCreation: true,
        });
        new Float32Array(this.proj_matrix_buffer.getMappedRange()).set(
            proj_matrix as Float32Array
        );
        this.proj_matrix_buffer.unmap();
    }

    update_view_matrix() {
        let view_matrix = mat4.create();
        mat4.lookAt(
            view_matrix,
            this.pos,
            this.target,
            vec3.fromValues(0.0, 1.0, 0.0)
        );

        this.device.queue.writeBuffer(
            this.view_matrix_buffer,
            0,
            view_matrix as Float32Array
        );
    }

    // FIXME : behavior is weird when you scroll too far vertically
    rotate_camera(delta_x: number, delta_y: number) {
        let rotation_m = mat4.create();

        // left / right rotation is always around Y
        mat4.rotateY(rotation_m, rotation_m, -delta_x * 0.01);

        // for up / down, we want to rotate around an axis that is "parallel" to the camera
        let eye_v = vec3.create();
        vec3.sub(eye_v, this.target, this.pos);
        let axis = vec3.create();
        vec3.cross(axis, eye_v, [0.0, 1.0, 0.0]);
        vec3.normalize(axis, axis);
        mat4.rotate(rotation_m, rotation_m, -delta_y * 0.01, axis);

        // tranform the position of the camera
        vec3.transformMat4(this.pos, this.pos, rotation_m);
        this.update_view_matrix();
    }

    // FIXME : the zoom limit thing is janky
    zoom_camera(delta: number) {
        let dir_v = vec3.create();
        vec3.sub(dir_v, this.target, this.pos);

        if (vec3.len(dir_v) < CLOSEST_ZOOM && delta < 0) {
            return;
        }
        if (vec3.len(dir_v) > FURTHEST_ZOOM && delta > 0) {
            return;
        }

        vec3.normalize(dir_v, dir_v);

        if (delta > 0) vec3.scale(dir_v, dir_v, -1);

        vec3.scale(dir_v, dir_v, 0.1);
        vec3.add(this.pos, this.pos, dir_v);

        this.update_view_matrix();
    }
}
