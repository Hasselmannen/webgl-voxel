var gl;
var ext = new Object();
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
    ext.mrt = gl.getExtension('WEBGL_draw_buffers');
    if (!ext.mrt) {
        alert("Could not initialize WEBGL_draw_buffers!");
    }
    ext.floatTex = gl.getExtension("OES_texture_float");
    if (!ext.floatTex) {
        alert("no OES_texture_float");
    }
    ext.linearFloatTex = gl.getExtension("OES_texture_float_linear");
    if (!ext.linearFloatTex) {
        alert("no OES_texture_float_linear");
    }
    ext.depthTex = gl.getExtension("WEBGL_depth_texture");
    if (!ext.depthTex) {
        console.log("no depth textures");
    }

}

function linkProgram(vsCode, fsCode) { 
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

function createLoadTexture(src, filtering, wrapping, mipmap, defaultColour) {
    var texture = createTexture(1, 1, filtering, wrapping, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(defaultColour))
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

function createTexture(width, height, filtering, wrapping, components, format, data) {
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filtering);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filtering);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrapping);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrapping);
    gl.texImage2D(gl.TEXTURE_2D, 0, components, width, height, 0, components, format, data);
    return texture;
}

function createCubeMapFramebuffers(texture, width, height) {
// Different framebuffers for every face, it is much faster:
// http://jsperf.com/webgl-cubemap-fbo-change-face-test
    var framebuffers = new Array(6);
    var depthBuffer = gl.createRenderbuffer();
    
    gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height);

    for (var i = 0; i < 6; i++) {
        framebuffers[i] = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffers[i]);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, texture, 0);

        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthBuffer);
    }

    return framebuffers;
}

function createCubeMapTexture(width, height, filtering, wrapping, components, format) {
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, filtering);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, filtering);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, wrapping);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, wrapping);

    for (var i = 0; i < 6; i++) {
        gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, 0, components, width, height, 0, components, format, null);
    }

    return texture;
}

function createFramebuffer(texture) {
    var framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    return framebuffer;
}

function createMrtFramebuffer(textures, depthTexture) {
    var framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);

    if (depthTexture != null) {
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, depthTexture, 0);
    }
    var attachments = new Array(textures.length);
    for (var i = 0; i < textures.length; i++) {
        gl.framebufferTexture2D(gl.FRAMEBUFFER, ext.mrt.COLOR_ATTACHMENT0_WEBGL+i, gl.TEXTURE_2D, textures[i], 0);
        attachments[i] = ext.mrt.COLOR_ATTACHMENT0_WEBGL + i;
    }
    ext.mrt.drawBuffersWEBGL(attachments);

    return framebuffer;
}
