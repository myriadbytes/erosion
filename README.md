# WebGPU Hydraulic Erosion Simulation

![image](https://github.com/user-attachments/assets/219c00ed-c64d-4391-94cc-362a8d320fe7)

## Try it in your browser !

The simulation is live at https://weltauseis.github.io/erosion/.  
WebGPU support is needed, errors are logged to the console.

## Info

No dependencies were used, except `gl-matrix` for 3D-related linear algebra.  
The algorithm used for the simulation is based on [a paper by Xing Mei, Philippe Decaudin and Bao-Gang Hu](https://inria.hal.science/inria-00402079/document).

## Bugs

The simulation still needs some tweaking to be more stable in the long run and prevent artifacts on crests.  
There is also flickering on the water layer, which may be related to simulation code but also seems to be in some capacity dependent on the user's GPU. If anyone has any insight, feel free to reach out !
