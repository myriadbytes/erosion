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

            compute.device.queue.writeTexture(
                { texture: compute.t2_read },
                new Float32Array(compute.TEXTURES_W * compute.TEXTURES_W * 4),
                {
                    offset: 0,
                    bytesPerRow: 4 * 4 * compute.TEXTURES_W,
                    rowsPerImage: compute.TEXTURES_W,
                },
                { width: compute.TEXTURES_W, height: compute.TEXTURES_W }
            );

            compute.device.queue.writeTexture(
                { texture: compute.t3_read },
                new Float32Array(compute.TEXTURES_W * compute.TEXTURES_W * 2),
                {
                    offset: 0,
                    bytesPerRow: 4 * 2 * compute.TEXTURES_W,
                    rowsPerImage: compute.TEXTURES_W,
                },
                { width: compute.TEXTURES_W, height: compute.TEXTURES_W }
            );
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

    let g_input = document.getElementById("g-input") as HTMLInputElement;
    g_input.addEventListener("input", () => {
        update_parameter_buffer(compute.g_param_buffer, Number(g_input.value));
    });
    update_parameter_buffer(compute.g_param_buffer, Number(g_input.value));

    let kc_input = document.getElementById("kc-input") as HTMLInputElement;
    kc_input.addEventListener("input", () => {
        update_parameter_buffer(
            compute.kc_param_buffer,
            Number(kc_input.value)
        );
    });
    update_parameter_buffer(compute.kc_param_buffer, Number(kc_input.value));

    let ks_input = document.getElementById("ks-input") as HTMLInputElement;
    ks_input.addEventListener("input", () => {
        update_parameter_buffer(
            compute.ks_param_buffer,
            Number(ks_input.value)
        );
    });
    update_parameter_buffer(compute.ks_param_buffer, Number(ks_input.value));

    let kd_input = document.getElementById("kd-input") as HTMLInputElement;
    kd_input.addEventListener("input", () => {
        update_parameter_buffer(
            compute.kd_param_buffer,
            Number(kd_input.value)
        );
    });
    update_parameter_buffer(compute.kd_param_buffer, Number(kd_input.value));

    let evaporation_input = document.getElementById(
        "evaporation-input"
    ) as HTMLInputElement;
    evaporation_input.addEventListener("input", () => {
        update_parameter_buffer(
            compute.evaporation_param_buffer,
            Number(evaporation_input.value)
        );
    });
    update_parameter_buffer(
        compute.evaporation_param_buffer,
        Number(evaporation_input.value)
    );

    // steps
    document
        .getElementById("water-increment-button")!
        .addEventListener("mousedown", () => {
            compute.run_water_increment();
        });

    document
        .getElementById("outflow-flux-button")!
        .addEventListener("mousedown", () => {
            compute.run_outflow_flux();
        });

    document
        .getElementById("water-velocity-button")!
        .addEventListener("mousedown", () => {
            compute.run_water_velocity();
        });

    document
        .getElementById("erosion-deposition-button")!
        .addEventListener("mousedown", () => {
            compute.run_erosion_deposition();
        });
}
