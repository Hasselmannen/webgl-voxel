precision highp float;

attribute vec2 position;

uniform mat4 invProjectionMatrix;

varying vec2 texCoord;
varying vec3 farPlaneRay;

const vec2 scale = vec2(0.5, 0.5);

void main(void) {
    texCoord = position * scale + scale;
    farPlaneRay = (invProjectionMatrix * vec4(position, 0.0, 0.0)).xyz;
    gl_Position = vec4(position, 0.0, 1.0);
}
