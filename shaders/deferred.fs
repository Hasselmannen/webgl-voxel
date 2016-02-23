precision highp float;

varying vec2 texCoord;
varying vec3 farPlaneRay;

uniform float godRayIntensity;

uniform vec3 viewSpaceLightPos;
uniform mat4 invModelViewMatrix;

uniform sampler2D normalDepthTexture;
uniform sampler2D diffuseTexture;
uniform samplerCube shadowMap;
uniform sampler2D ssaoTexture;

#define MAX_NR_LIGHTS 10

uniform vec3 viewSpaceLightPositions[MAX_NR_LIGHTS];
uniform vec3 lightColours[MAX_NR_LIGHTS];
uniform int nrLights;
uniform vec3 viewSpaceLightDirs[MAX_NR_LIGHTS];
uniform float lightInnerAngles[MAX_NR_LIGHTS];
uniform float lightOuterAngles[MAX_NR_LIGHTS];

vec3 ambientLight = vec3(0.3, 0.3, 0.3);
vec3 diffuseLight = vec3(0.9, 0.9, 0.5);
vec3 specularLight = vec3(0.9, 0.9, 0.5);
vec3 crepuscularLight = vec3(0.225, 0.225, 0.125);

float materialShininess = 8.0;

const float EPS1 = 0.0;
const float EPS2 = 0.25;

#define CREPUSCULAR_RAYS
#define NUM_CREPUSCULAR_SAMPLES 100
#define SHADOWS
#define MAIN_LIGHT

vec3 calculateAmbient(vec3 ambientLight, vec3 materialAmbient) {
    return ambientLight * materialAmbient;
}

vec3 calculateDiffuse(vec3 diffuseLight, vec3 materialDiffuse, float diffuseReflectance) {
    return diffuseLight * materialDiffuse * diffuseReflectance;
}

vec3 calculateFresnel(vec3 materialSpecular, vec3 normal, vec3 directionFromEye) {
    return materialSpecular + (vec3(1.0) - materialSpecular) * pow(clamp(1.0 + dot(directionFromEye, normal), 0.0, 1.0), 5.0);
}

vec3 calculateSpecular(vec3 specularLight, vec3 materialSpecular, float materialShininess, vec3 normal, vec3 directionToLight, vec3 directionFromEye) {
    float normalizationFactor = ((materialShininess + 2.0) / 8.0);
    vec3 h = normalize(directionToLight - directionFromEye);
    return specularLight * materialSpecular * pow(max(dot(h, normal), 0.0), materialShininess) * normalizationFactor;
}

bool inShadow(samplerCube shadowMap, mat4 invModelViewMatrix, vec3 vectorFromLight, float eps1, float eps2) {
    #ifdef SHADOWS
        float nearestDepth = textureCube(shadowMap, mat3(invModelViewMatrix) * vectorFromLight).r;
        float distanceSquare = dot(vectorFromLight, vectorFromLight);
        return distanceSquare > eps1 + eps2 * distanceSquare / 10.0 + nearestDepth;
    #endif
    return false;
}

void main(void) {
    vec4 normalDepth = texture2D(normalDepthTexture, texCoord);
    vec4 colorRGBA = texture2D(diffuseTexture, texCoord);
    vec3 occlusion = texture2D(ssaoTexture, texCoord).rgb;

    float depth = normalDepth.a;
    float alpha = colorRGBA.a;
    vec3 normal = normalize(normalDepth.rgb);
    vec3 color = colorRGBA.rgb;
    vec3 viewSpacePosition = vec3((farPlaneRay * depth).xy, -depth);

    vec3 ambient = calculateAmbient(ambientLight, color);

    vec3 directionFromEye = normalize(viewSpacePosition);
    vec3 fresnel = calculateFresnel(color, normal, directionFromEye);

    vec3 diffuse = vec3(0);
    vec3 specular = vec3(0);
    vec3 crepuscularRays = vec3(0);

    #ifdef MAIN_LIGHT
    vec3 vectorFromLight = viewSpacePosition - viewSpaceLightPos;
    vec3 directionToLight = normalize(-vectorFromLight);

    float diffuseReflectance = max(0.0, dot(directionToLight, normal));
    float visibility = 0.0;
    if (diffuseReflectance > 0.0 && !inShadow(shadowMap, invModelViewMatrix, vectorFromLight, EPS1, EPS2)) {
        visibility = 1.0;
    }

    if (visibility > 0.01) {
        diffuse = calculateDiffuse(diffuseLight, color, diffuseReflectance);
        specular = calculateSpecular(specularLight, fresnel, materialShininess, normal, directionToLight, directionFromEye);
    }

    #if defined(CREPUSCULAR_RAYS) && defined(SHADOWS)
    vec3 stepSize = viewSpacePosition / float(NUM_CREPUSCULAR_SAMPLES);
    vec3 intensity = crepuscularLight / float(NUM_CREPUSCULAR_SAMPLES);
    for (int i = 0; i < NUM_CREPUSCULAR_SAMPLES; i++) {
        vec3 pos = stepSize * float(i);
        vec3 lightToPos = pos - viewSpaceLightPos;
        if (!inShadow(shadowMap, invModelViewMatrix, lightToPos, EPS1, EPS2)) {
            crepuscularRays += intensity / sqrt(length(lightToPos));
        }
    }
    crepuscularRays *= length(stepSize) * godRayIntensity;
    #endif
    #endif
    //vec3 emissive = materialEmissive;

    vec3 accDiffuse = vec3(0);
    vec3 accSpec    = vec3(0);
    for (int i = 0; i < MAX_NR_LIGHTS; i++) {
        if (i >= nrLights) { break; }

        vec3 diffuse = vec3(0);
        vec3 specular = vec3(0);

        vec3 directionToLight = normalize(viewSpaceLightPositions[i] - viewSpacePosition);

        float diffuseReflectance = max(0.0, dot(directionToLight, normal));

        if (diffuseReflectance > 0.0) {
            float angle = dot(directionToLight, -viewSpaceLightDirs[i]);
            float attenuation = smoothstep(lightOuterAngles[i], lightInnerAngles[i], angle);

            accDiffuse += attenuation * calculateDiffuse(lightColours[i], color, diffuseReflectance);
            accSpec    += attenuation * calculateSpecular(lightColours[i], fresnel, materialShininess, normal, directionToLight, directionFromEye);
        }
    }

    gl_FragColor = vec4(vec3(0)
    + ambient * vec3(occlusion)
    + diffuse
    + specular
    + crepuscularRays
    + accDiffuse
    + accSpec
    , 1.0);
}
