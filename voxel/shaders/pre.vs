precision highp float;

attribute vec3 position;
attribute vec3 normal;
attribute vec3 tangent;
attribute vec3 bitangent;
attribute vec2 texCoordIn;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

varying vec3 viewSpaceNormal;
varying vec3 viewSpacePosition;
varying mat3 invTBN;
varying mat3 TBN;
varying vec2 texCoord;

varying vec3 tangentSpacePosition;

void main(void) {
    viewSpacePosition = vec3(modelViewMatrix * vec4(position, 1));
    viewSpaceNormal = vec3(modelViewMatrix * vec4(normal, 0));
    gl_Position = projectionMatrix * vec4(viewSpacePosition, 1);

    vec3 T = normalize(modelViewMatrix * vec4(tangent, 0.0)).xyz;
    vec3 B = normalize(modelViewMatrix * vec4(bitangent, 0.0)).xyz;
    vec3 N = normalize(modelViewMatrix * vec4(normal, 0.0)).xyz;

    invTBN = mat3(T, B, N);

    TBN = mat3(
        T.x, B.x, N.x,
        T.y, B.y, N.y,
        T.z, B.z, N.z
    );

    tangentSpacePosition = TBN * viewSpacePosition;

    texCoord = texCoordIn;
}
