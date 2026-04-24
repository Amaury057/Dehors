uniform float iTime;
uniform vec3 uColor;
uniform float uOpacity;
uniform float uSpeed;
uniform float uWaveIntensity;

varying vec2 vUv;
varying vec3 vPosition;

// Fonctions de bruit pour les petites vagues en surface (normal mapping procédural)
vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }

float snoise(vec2 v){
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
           -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy) );
  vec2 x0 = v -   i + dot(i, C.xx);
  vec2 i1;
  i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
  + i.x + vec3(0.0, i1.x, 1.0 ));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
    dot(x12.zw,x12.zw)), 0.0);
  m = m*m ;
  m = m*m ;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

void main() {
    float time = iTime * uSpeed;
    
    // Génération d'une normale de surface pour simuler le vent
    vec2 noiseUv1 = vUv * 10.0 + vec2(time * 0.2, time * 0.1);
    vec2 noiseUv2 = vUv * 15.0 - vec2(time * 0.15, time * 0.25);
    
    float noise1 = snoise(noiseUv1);
    float noise2 = snoise(noiseUv2);
    
    float surfaceNoise = (noise1 + noise2) * 0.5;
    
    // Perturbation de la normale basée sur le bruit
    vec3 normal = normalize(vec3(noise1 * uWaveIntensity * 0.2, 1.0, noise2 * uWaveIntensity * 0.2));
    
    // Éclairage basique
    vec3 lightDir = normalize(vec3(1.0, 1.0, 0.5));
    vec3 viewDir = normalize(vec3(0.0, 1.0, 1.0)); // Caméra
    
    // Spéculaire
    vec3 halfVector = normalize(lightDir + viewDir);
    float spec = pow(max(dot(normal, halfVector), 0.0), 50.0);
    
    // Couleur de base (plus sombre dans les creux)
    vec3 finalColor = uColor;
    finalColor -= vec3(0.1) * (1.0 - surfaceNoise) * uWaveIntensity;
    
    // Ajout d'une écume légère sur les "pics" de bruit et sur les vagues globales
    float foam = smoothstep(0.4, 1.0, surfaceNoise) * uWaveIntensity * 0.5;
    
    finalColor = mix(finalColor, vec3(1.0), foam);
    finalColor += vec3(1.0) * spec * 0.5; // reflet
    
    gl_FragColor = vec4(finalColor, uOpacity);
}