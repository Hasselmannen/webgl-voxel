precision highp float;

varying vec2 texCoord;
varying vec3 farPlaneRay;

uniform mat4 projectionMatrix;

uniform sampler2D normalDepthTexture;

#define ENABLE_SSAO
#define NUM_SSAO_SAMPLES 64
uniform sampler2D noiseTexture;
uniform vec3 hemisphere[NUM_SSAO_SAMPLES];

void main(void) {
    vec4 normalDepth = texture2D(normalDepthTexture, texCoord);

    float depth = normalDepth.a;
    vec3 normal = normalize(normalDepth.rgb);

    vec3 viewSpacePosition = vec3((farPlaneRay * depth).xy, -depth);

    // SSAO Implementation (http://john-chapman-graphics.blogspot.co.il/2013/01/ssao-tutorial.html)
    // TODO: Move scaling with render target size to uniforms
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

    gl_FragColor = vec4(vec3(occlusion), 1.0);
}
