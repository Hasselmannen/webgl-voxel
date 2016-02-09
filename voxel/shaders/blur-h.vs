precision highp float;

attribute vec2 position;

varying vec2 texCoord;

const vec2 scale = vec2(0.5, 0.5);

void main(void) {
    texCoord = position * scale + scale;
    gl_Position = vec4(position, 0, 1);
}
