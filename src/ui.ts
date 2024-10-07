import { ErosionCompute } from "./compute";

export function setup_controls(compute: ErosionCompute) {
    // add event for radio button change
    // sends the type of visualization to the shader
    document
        .querySelectorAll('input[name="visualization"]')
        .forEach((radio: Element) => {
            radio.addEventListener("change", (event: Event) => {
                const target = event.target as HTMLInputElement;
                if (target.checked) {
                    let value = 0;
                    switch (target.value) {
                        case "terrain":
                            value = 0;
                            break;
                        case "flow-x":
                            value = 1;
                            break;
                        case "flow-y":
                            value = 2;
                            break;
                        case "velocity-x":
                            value = 3;
                            break;
                        case "velocity-y":
                            value = 4;
                            break;
                        case "sediment":
                            value = 5;
                            break;
                        default:
                            value = 10;
                    }
                    compute.device.queue.writeBuffer(
                        compute.view_type_buffer,
                        0,
                        new Uint32Array([value])
                    );
                }
            });
        });

    document
        .getElementById("start-stop-button")!
        .addEventListener("mousedown", () => {
            compute.running = !compute.running;
        });

    document
        .getElementById("reset-button")!
        .addEventListener("mousedown", () => {
            compute.init_heightmap();
        });

    // parameters
    let update_parameter_buffer = (buffer: GPUBuffer, value: number) => {
        compute.device.queue.writeBuffer(buffer, 0, new Float32Array([value]));
    };

    let timestep_input = document.getElementById(
        "timestep-input"
    ) as HTMLInputElement;
    timestep_input.addEventListener("input", () => {
        update_parameter_buffer(
            compute.timestep_param_buffer,
            Number(timestep_input.value)
        );
    });
    update_parameter_buffer(
        compute.timestep_param_buffer,
        Number(timestep_input.value)
    ); // send default value to the gpu

    let rainfall_input = document.getElementById(
        "rainfall-input"
    ) as HTMLInputElement;
    rainfall_input.addEventListener("input", () => {
        update_parameter_buffer(
            compute.rainfall_param_buffer,
            Number(rainfall_input.value)
        );
    });
    update_parameter_buffer(
        compute.rainfall_param_buffer,
        Number(rainfall_input.value)
    );
}
