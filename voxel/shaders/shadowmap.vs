precision highp float;

attribute vec3 position;

uniform mat4 projectionMatrix;
uniform mat4 modelViewMatrix;

varying float distance;

void main(void) {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    vec3 position = vec3(modelViewMatrix * vec4(position, 1));
    distance = dot(position, position);
}
