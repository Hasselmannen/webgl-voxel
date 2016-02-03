precision highp float;

varying float distance;

void main(void) {
    gl_FragColor = vec4(vec3(distance), 1);
}
