uniform vec3 uFlowerColor;
uniform vec3 uStemColor;
uniform float uThreshold;
uniform float uMode;
// SPLIT
vec4 texElement = texture2D(map, vUv);
float mask = texElement.r;

float factor;
if (uMode > 0.5) {
    // MODE HORIZONTAL (Axe central vers bords)
    factor = abs(vUv.x - 0.5) * 2.0;
} else {
    // MODE VERTICAL (Bas vers Haut)
    factor = vUv.y;
}

// On applique le seuil sur ce nouveau facteur
float mixStrength = smoothstep(uThreshold - 0.1, uThreshold + 0.1, factor);
vec3 finalColor = mix(uStemColor, uFlowerColor, mixStrength);

// OVER CAPE DES COULEURS POUR QUE LE BLOOM FONCTIONNE :D
diffuseColor.rgb = finalColor * 10.5;
diffuseColor.a = mask;
