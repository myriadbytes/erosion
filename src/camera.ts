import { mat4, vec3 } from "gl-matrix";

export class OrbitCamera {
    view_matrix: mat4;
    view_matrix_buffer: GPUBuffer;
    proj_matrix: mat4;
    proj_matrix_buffer: GPUBuffer;
    is_dragging: boolean;
    last_mouse_x: number;
    last_mouse_y: number;

    //proj_matrix: mat4;
    constructor(device: GPUDevice) {
        const canvas = document.querySelector("canvas")!;

        // MATRICES & BUFFERS FOR THEM

        this.view_matrix = mat4.create();
        mat4.identity(this.view_matrix);
        mat4.lookAt(
            this.view_matrix,
            vec3.fromValues(0.0, 0.0, 1.0),
            vec3.fromValues(0.0, 0.0, 0.0),
            vec3.fromValues(0.0, 1.0, 0.0)
        );

        this.view_matrix_buffer = device.createBuffer({
            label: "View Matrix Buffer",
            size: 16 * 4,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            mappedAtCreation: true,
        });
        new Float32Array(this.view_matrix_buffer.getMappedRange()).set(
            this.view_matrix as Float32Array
        );
        this.view_matrix_buffer.unmap();

        this.proj_matrix = mat4.create();
        //mat4.identity(this.proj_matrix);
        mat4.perspective(
            this.proj_matrix,
            90,
            canvas.width / canvas.height,
            0.01,
            100
        );
        this.proj_matrix_buffer = device.createBuffer({
            label: "Projection Matrix Buffer",
            size: 16 * 4,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            mappedAtCreation: true,
        });
        new Float32Array(this.proj_matrix_buffer.getMappedRange()).set(
            this.proj_matrix as Float32Array
        );
        this.proj_matrix_buffer.unmap();

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
    }

    rotate_camera(delta_x: number, delta_y: number) {
        mat4.rotateY(this.view_matrix, this.view_matrix, delta_x * 0.01);
        mat4.rotateX(this.view_matrix, this.view_matrix, delta_y * 0.01);
    }
}
