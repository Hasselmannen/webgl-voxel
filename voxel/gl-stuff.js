var gl;
var ext;
var mrtExt;
function initGL(canvas) {
    try {
        gl = canvas.getContext("experimental-webgl");
        gl.viewportWidth = canvas.width;
        gl.viewportHeight = canvas.height;
    } catch (e) {
    }
    if (!gl) {
        alert("Could not initialize WebGL!");
    }
    mrtExt = gl.getExtension('WEBGL_draw_buffers');
    if (!mrtExt) {
        alert("Could not initialize WEBGL_draw_buffers!");
    }
    ext = gl.getExtension("OES_texture_float");
    if (!ext) {
        alert("no OES_texture_float");
    }
    ext = gl.getExtension("OES_texture_float_linear");
    if (!ext) {
        alert("no OES_texture_float_linear");
    }
}

function linkProgram(gl, vsCode, fsCode) { 
    var program = gl.createProgram();
    var vs = gl.createShader(gl.VERTEX_SHADER);
    var fs = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(vs, vsCode);
    gl.compileShader(vs);

    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
        alert("Could not compile Vertex Shader: " + gl.getShaderInfoLog(vs));
        return null;
    }

    gl.shaderSource(fs, fsCode);
    gl.compileShader(fs);

    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
        alert("Could not compile Fragment Shader: " + gl.getShaderInfoLog(fs));
        return null;
    }

    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        alert("Could not link program.");
        return null;
    }

    return program;
}

function createLoadTexture(gl, src, filtering, wrapping, mipmap, defaultColour) {
    var texture = createTexture(gl, 1, 1, filtering, wrapping, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(defaultColour))
    var image = new Image();
    image.addEventListener('load', function() { // Closure?
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        if (mipmap) {
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mipmap ? gl.LINEAR_MIPMAP_LINEAR : filtering);
            gl.generateMipmap(gl.TEXTURE_2D);
        }
    });
    image.src = src;
    return texture;
}

function createTexture(gl, width, height, filtering, wrapping, components, format, data) {
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filtering);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filtering);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrapping);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrapping);
    gl.texImage2D(gl.TEXTURE_2D, 0, components, width, height, 0, components, format, data);
    return texture;
}