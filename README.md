# WebGPU Hydraulic Erosion Simulation

## Try it in your browser !

The simulation is live at https://weltauseis.github.io/erosion/.  
WebGPU support is needed, errors are logged to the console.

## Info

No dependencies were used, except `gl-matrix` for 3D-related linear algebra.  
The algorithm used for the simulation is based on [a paper by Xing Mei, Philippe Decaudin and Bao-Gang Hu](https://inria.hal.science/inria-00402079/document).

## Bugs

The simulation still needs some tweaking to be more stable in the long run and prevent artifacts on crests.
There is also flickering on the water layer, the cause of which I have not found yet. If anyone has any insight, feel free to reach out !
