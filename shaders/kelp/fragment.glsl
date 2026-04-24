uniform sampler2D iTexture;
uniform float iTime;
uniform float uBrightness;
uniform vec3 uColorBottom;
uniform vec3 uColorTop;

// Les coordonnées UV reçues du Vertex Shader
varying vec2 vUv;

#include <common>
#include <fog_pars_fragment>

void main() {
    // On simplifie l'UV pour être sûr
    vec2 repeatedUv = vUv * vec2(0.4, 1.0);
    
    vec4 texColor = texture2D(iTexture, repeatedUv);
    
    vec3 baseColor = mix(uColorBottom, uColorTop, vUv.y);
    
    // On mélange la couleur de base avec la texture et on applique la luminosité
    vec3 finalColor = baseColor * (texColor.rgb + 0.5) * uBrightness; 
    
    gl_FragColor = vec4(finalColor, 1.0);

    #include <fog_fragment>
}