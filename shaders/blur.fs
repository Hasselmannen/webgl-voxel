precision highp float;

uniform sampler2D texture;
uniform vec2 sampleStep;

varying vec2 texCoord;

void main(void) {
    vec3 color = 0.122581 * texture2D(texture, texCoord - vec2(2.0) * sampleStep).rgb +
                 0.233062 * texture2D(texture, texCoord - vec2(1.0) * sampleStep).rgb +
                 0.288713 * texture2D(texture, texCoord).rgb +
                 0.233062 * texture2D(texture, texCoord + vec2(1.0) * sampleStep).rgb +
                 0.122581 * texture2D(texture, texCoord + vec2(2.0) * sampleStep).rgb;

    gl_FragColor = vec4(color, 1);
}
