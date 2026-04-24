uniform float iTime;
uniform float uSpeed;

varying vec2 vUv;

#include <common>
#include <fog_pars_vertex>

void main() {
    vUv = uv;
    vec3 transformed = position;

    // Le vent / courant marin (plus fort en haut)
    float heightFactor = vUv.y;

    transformed.x += sin(iTime * uSpeed + position.y * 0.5) * 0.3 * heightFactor;
    transformed.z += cos(iTime * uSpeed + position.y * 0.5) * 0.3 * heightFactor; 

    vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    #include <fog_vertex>
}
