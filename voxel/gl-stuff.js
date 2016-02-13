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

function getShader(gl, id) {
    var shaderScript = document.getElementById(id);
    if (!shaderScript) {
        return null;
    }

    var str = "";
    var k = shaderScript.firstChild;
    while (k) {
        if (k.nodeType == 3) {
            str += k.textContent;
        }
        k = k.nextSibling;
    }

    var shader;
    if (shaderScript.type == "x-shader/x-fragment") {
        shader = gl.createShader(gl.FRAGMENT_SHADER);
    } else if (shaderScript.type == "x-shader/x-vertex") {
        shader = gl.createShader(gl.VERTEX_SHADER);
    } else {
        return null;
    }

    gl.shaderSource(shader, str);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert(gl.getShaderInfoLog(shader));
        return null;
    }

    return shader;
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