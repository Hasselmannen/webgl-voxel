#extension GL_EXT_draw_buffers : require

precision highp float;

uniform sampler2D diffuseTexture;
uniform sampler2D normalTexture;
uniform sampler2D depthMap;

varying vec3 viewSpaceNormal;
varying vec3 viewSpacePosition;
varying vec3 tangentSpacePosition;
varying mat3 TBN;
varying mat3 invTBN;
varying vec2 texCoord;

#define PARALLAX_MAPPING
#define MIN_LAYERS 16.0
#define MAX_LAYERS 64.0
#define HEIGHT_SCALE 0.1

#define NORMAL_MAPPING
#define DIFFUSE_TEXTURE

vec2 parallax(vec2 texCoord, vec3 viewDir) {
    // Algorithm:
    // http://www.learnopengl.com/#!Advanced-Lighting/Parallax-Mapping
    float numLayers = mix(MAX_LAYERS, MIN_LAYERS, abs(dot(vec3(0, 0, 1), viewDir)));
    float layerDepth = 1.0 / numLayers;
    float currentDepth = 0.0;
    vec2 offset = viewDir.xy / viewDir.z * HEIGHT_SCALE;
    vec2 deltaTexCoord = offset / numLayers;

    float prevDepth = texture2D(depthMap, texCoord).r * 2.0 - 1.0;

    for (float i = 0.0; i < MAX_LAYERS; i += 1.0) {
        texCoord -= deltaTexCoord;
        prevDepth = texture2D(depthMap, texCoord).r * 2.0 - 1.0;
        currentDepth += layerDepth;

        if (currentDepth >= prevDepth) {
            break;
        }
    }

    vec2 prevTexCoord = texCoord + deltaTexCoord;

    float afterDepth = prevDepth - currentDepth;
    float beforeDepth = texture2D(depthMap, prevTexCoord).r - currentDepth + layerDepth;
    float weight = afterDepth / (afterDepth - beforeDepth);

    return prevTexCoord * weight + texCoord * (1.0 - weight);
}

void main(void) {
    #ifdef PARALLAX_MAPPING
    vec3 viewDir = normalize(tangentSpacePosition);
    vec2 newCoord = parallax(texCoord, viewDir);
    #else
    vec2 newCoord = texCoord;
    #endif

    #ifdef NORMAL_MAPPING
    vec3 normal = normalize(invTBN * (texture2D(normalTexture, newCoord).rgb * 2.0 - 1.0));
    #else
    vec3 normal = normalize(viewSpaceNormal);
    #endif

    #ifdef DIFFUSE_TEXTURE
    vec4 diffuseColor = texture2D(diffuseTexture, newCoord);
    #else
    vec4 diffuseColor = vec4(0.5, 0.5, 0.5, 1.0);
    #endif

    // TODO: Consider another pass to get correct depth after parallax mapping
    gl_FragData[0] = diffuseColor;
    gl_FragData[1] = vec4(normal, -viewSpacePosition.z);
}
