precision highp float;

varying vec2 texCoord;
varying vec3 farPlaneRay;

uniform vec3 viewSpaceLightPos;
uniform mat4 projectionMatrix;
uniform mat4 invModelViewMatrix;
uniform mat4 invProjectionMatrix;

uniform sampler2D normalDepthTexture;
uniform sampler2D diffuseTexture;
uniform samplerCube shadowMap;

#define ENABLE_SSAO
#define NUM_SSAO_SAMPLES 64
uniform sampler2D noiseTexture;
uniform vec3 hemisphere[NUM_SSAO_SAMPLES];

vec3 ambientLight = vec3(0.3, 0.3, 0.3);
vec3 diffuseLight = vec3(0.9, 0.9, 0.5);
vec3 specularLight = vec3(0.9, 0.9, 0.5);
vec3 crepuscularLight = vec3(0.225, 0.225, 0.125);

float materialShininess = 8.0;

const float EPS1 = 0.0;
const float EPS2 = 0.25;

#define NUM_CREPUSCULAR_SAMPLES 100

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
    float nearestDepth = textureCube(shadowMap, mat3(invModelViewMatrix) * vectorFromLight).r;
    float distanceSquare = dot(vectorFromLight, vectorFromLight);
    return distanceSquare > eps1 + eps2 * distanceSquare / 10.0 + nearestDepth;
}

void main(void) {
    vec4 normalDepth = texture2D(normalDepthTexture, texCoord);
    vec4 colorRGBA = texture2D(diffuseTexture, texCoord);

    float depth = normalDepth.a;
    float alpha = colorRGBA.a;
    vec3 normal = normalize(normalDepth.rgb);
    vec3 color = colorRGBA.rgb;
    vec3 viewSpacePosition = vec3((farPlaneRay * depth).xy, -depth);

    vec3 vectorFromLight = viewSpacePosition - viewSpaceLightPos;
    vec3 directionToLight = normalize(-vectorFromLight);
    vec3 directionFromEye = normalize(viewSpacePosition);

    float diffuseReflectance = max(0.0, dot(directionToLight, normal));
    float visibility = 0.0;
    if (diffuseReflectance > 0.0 && !inShadow(shadowMap, invModelViewMatrix, vectorFromLight, EPS1, EPS2)) {
        visibility = 1.0;
    }

    vec3 fresnel = calculateFresnel(color, normal, directionFromEye);

    vec3 ambient = calculateAmbient(ambientLight, color);

    vec3 diffuse = vec3(0);
    vec3 specular = vec3(0);
    if (visibility > 0.01) {
        diffuse = calculateDiffuse(diffuseLight, color, diffuseReflectance);
        specular = calculateSpecular(specularLight, fresnel, materialShininess, normal, directionToLight, directionFromEye);
    }
    //vec3 emissive = materialEmissive;

    vec3 crepuscularRays = vec3(0);
    vec3 stepSize = viewSpacePosition / float(NUM_CREPUSCULAR_SAMPLES);
    vec3 intensity = crepuscularLight / float(NUM_CREPUSCULAR_SAMPLES);
    for (int i = 0; i < NUM_CREPUSCULAR_SAMPLES; i++) {
        vec3 pos = stepSize * float(i);
        if (!inShadow(shadowMap, invModelViewMatrix, pos - viewSpaceLightPos, EPS1, EPS2)) {
            crepuscularRays += intensity;
        }
    }

    // SSAO Implementation (http://john-chapman-graphics.blogspot.co.il/2013/01/ssao-tutorial.html)
    // TODO: Move scaling with render target size to uniforms
    // TODO: Move to separate shader for blur passes
    // TODO: Move radius to uniform
    vec3 randomVec = texture2D(noiseTexture, texCoord * vec2(1280.0/4.0, 720.0/4.0)).xyz;
    vec3 tangent = normalize(randomVec - normal * dot(randomVec, normal));
    vec3 bitangent = cross(normal, tangent);
    mat3 invTBN = mat3(tangent, bitangent, normal);

    float occlusion = 0.0;
    #ifdef ENABLE_SSAO
    float radius = 0.75;
    for (int i = 0; i < NUM_SSAO_SAMPLES; i++) {
        vec3 sample = invTBN * hemisphere[i];
        sample = sample * radius + viewSpacePosition;

        vec4 offset = vec4(sample, 1.0);
        offset = projectionMatrix * offset;
        offset.xy /= offset.w;
        offset.xy = offset.xy * 0.5 + 0.5;

        float sampleDepth = -texture2D(normalDepthTexture, offset.xy).a;

        float rangeCheck = abs(viewSpacePosition.z - sampleDepth) < radius ? 1.0 : 0.0;
        occlusion += (sampleDepth > sample.z ? 1.0 : 0.0) * rangeCheck;
    }
    occlusion /= float(NUM_SSAO_SAMPLES);
    #endif
    occlusion = 1.0 - occlusion;

    gl_FragColor = vec4(vec3(0)
    + ambient * vec3(occlusion)
    + diffuse * visibility
    + specular * visibility
    + crepuscularRays
    , 1.0);
}
