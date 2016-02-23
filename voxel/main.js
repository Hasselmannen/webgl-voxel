// Shaders
var shaders = {
    pre       : { src : "shaders/pre",      },
    deferred  : { src : "shaders/deferred"  },
    shadowmap : { src : "shaders/shadowmap" },
    ssao      : { src : "shaders/ssao"      },
    blur      : { src : "shaders/blur"      }
};

// Render matrices
var modelViewMatrix           = mat4.create();
var projectionMatrix          = mat4.create();
var shadowMapProjectionMatrix = mat4.create();

var shadowMapModelViewMatrices = new Array();

var lightPos = [8, 8, 8];
var viewSpaceLightPos = new Array();

var godRayIntensity = 15;

var camera = new Camera([8, 8, 19], [0, 0, -1]);

var chunks = new Array();

// Textures
var normalTexture;
var cubeTexture;
var depthMap;
var noiseTexture; // Noise for SSAO

var sceneFarPlane = 100;
var shadowMapFarPlane = 100;
var shadowMapSize = 512;

var targetFPS = 60;
var targetDelta = 1000/targetFPS;

var moveSpeed = 0.1;
var rotateSpeed = 0.05;

// SSAO Stuff
var numSSAOSamples = 64;
var hemisphereArray;

// GLOBAL TOGGLES
var enableShadows = true;
var enableMainLight = true;

var colours = {
    'white' : [1, 1, 1],
    'black' : [0, 0, 0],

    'red'     : [1, 0, 0],
    'green'   : [0, 1, 0],
    'blue'    : [0, 0, 1],
    'yellow'  : [1, 1, 0],
    'magenta' : [1, 0, 1],
    'cyan'    : [0, 1, 1],

    'orange'         : [      1, 127/255,       0],
    'indigo'         : [ 75/255,       0, 130/255],
    'violet'         : [127/255,       0,       1],
    'purple'         : [128/255,       0, 128/255],
    'pink'           : [      1, 192/255, 203/255],
    'cornflowerblue' : [100/255, 149/255, 237/255]
};

// LIGHTS
var maxLights = 8;
var nrLights = 0;

var lights             = (new Array(maxLights)).fill(0).map(function(v, i) { return [1+2*i, 9, 7]; });
var lightDirs          = (new Array(maxLights)).fill(0).map(function()     { return [0, -1, 1];    });
var viewSpaceLights    = (new Array(maxLights)).fill(0).map(function()     { return new Array(3);  });
var viewSpaceLightDirs = (new Array(maxLights)).fill(0).map(function()     { return new Array(3);  });
var lightInnerAngles   = (new Array(maxLights)).fill(Math.cos(20 * Math.PI / 180));
var lightOuterAngles   = (new Array(maxLights)).fill(Math.cos(30 * Math.PI / 180));

var lightColours = [
    colours.red,
    colours.orange,
    colours.yellow,
    colours.green,

    colours.green,
    colours.blue,
    colours.indigo,
    colours.violet
];

function initShader(shader, attributes, uniforms) {
    var program = linkProgram(shader.vs, shader.fs);
    gl.useProgram(program);

    program.attributes = {};
    program.uniforms = {};

    for (val of attributes) {
        program.attributes[val] = gl.getAttribLocation(program, val);
        gl.enableVertexAttribArray(program.attributes[val]);
    }

    for (val of uniforms) {
        program.uniforms[val] = gl.getUniformLocation(program, val);
    }

    return program;
}

function reloadShader(shader) {
    gl.deleteProgram(shader.program);
    return initShader(shader, Object.keys(shader.program.attributes), Object.keys(shader.program.uniforms));
}

function initShaders() {
    shaders.pre.program = initShader(
        shaders.pre,
        ["position", "normal", "tangent", "bitangent", "texCoordIn"],
        ["projectionMatrix", "modelViewMatrix", "normalTexture", "diffuseTexture", "depthMap"]
    );
    shaders.shadowmap.program = initShader(
        shaders.shadowmap,
        ["position"],
        ["projectionMatrix", "modelViewMatrix"]
    );
    shaders.deferred.program = initShader(
        shaders.deferred,
        ["position"],
        ["normalDepthTexture", "diffuseTexture", "viewSpaceLightPos", "invProjectionMatrix",
         "shadowMap", "invModelViewMatrix", "ssaoTexture", "godRayIntensity", "viewSpaceLightPositions",
         "lightColours", "nrLights", "viewSpaceLightDirs", "lightInnerAngles", "lightOuterAngles"]

    );
    shaders.ssao.program = initShader(
        shaders.ssao,
        ["position"],
        ["normalDepthTexture", "invProjectionMatrix", "projectionMatrix", "noiseTexture", "hemisphere"]
    );
    shaders.blur.program = initShader(
        shaders.blur,
        ["position"],
        ["texture", "sampleStep"]
    );
}

// p is the program, textures is an array of textures
// to bind of the format [["texName", texVar, gl.TEX_TYPE]]
function setTextureUniforms(p, textures) {
    textures.forEach(function(e, i) {
        gl.activeTexture(gl.TEXTURE0 + i);
        gl.bindTexture(e[2], e[1]);
        gl.uniform1i(p.uniforms[e[0]], i);
    });
    gl.activeTexture(gl.TEXTURE0);
}

function setPreUniforms() {
    var p = shaders.pre.program;
    gl.uniformMatrix4fv(p.uniforms["projectionMatrix"], false, projectionMatrix);
    gl.uniformMatrix4fv(p.uniforms["modelViewMatrix"],  false, modelViewMatrix);

    var textures = [
        ["diffuseTexture", cubeTexture,   gl.TEXTURE_2D],
        ["normalTexture",  normalTexture, gl.TEXTURE_2D],
        ["depthMap",       depthMap,      gl.TEXTURE_2D]
    ];
    setTextureUniforms(p, textures);
}
function setDeferredUniforms() {
    var p = shaders.deferred.program;

    var textures = [
        ["normalDepthTexture", shaders.pre.textureNormalDepth, gl.TEXTURE_2D],
        ["diffuseTexture",     shaders.pre.textureDiffuse,     gl.TEXTURE_2D],
        ["shadowMap",          shaders.shadowmap.texture,      gl.TEXTURE_CUBE_MAP],
        ["ssaoTexture",        shaders.ssao.textureBlurred,    gl.TEXTURE_2D]
    ];
    setTextureUniforms(p, textures);

    gl.uniform3fv(p.uniforms["viewSpaceLightPos"], viewSpaceLightPos);

    var invProjectionMatrix = mat4.create();
    mat4.inverse(projectionMatrix, invProjectionMatrix);
    gl.uniformMatrix4fv(p.uniforms["invProjectionMatrix"], false, invProjectionMatrix);
    gl.activeTexture(gl.TEXTURE0);

    var invModelViewMatrix = mat4.create();
    mat4.inverse(modelViewMatrix, invModelViewMatrix);
    gl.uniformMatrix4fv(p.uniforms["invModelViewMatrix"], false, invModelViewMatrix);

    gl.uniform1f(p.uniforms["godRayIntensity"], godRayIntensity);

    gl.uniform1i(p.uniforms["nrLights"], nrLights);
    gl.uniform3fv(p.uniforms["lightColours"],               lightColours.reduce(function(x, y) { return x.concat(y); }));
    gl.uniform3fv(p.uniforms["viewSpaceLightPositions"], viewSpaceLights.reduce(function(x, y) { return x.concat(y); }));
    gl.uniform3fv(p.uniforms["viewSpaceLightDirs"],   viewSpaceLightDirs.reduce(function(x, y) { return x.concat(y); }));
    gl.uniform1fv(p.uniforms["lightOuterAngles"], lightOuterAngles);
    gl.uniform1fv(p.uniforms["lightInnerAngles"], lightInnerAngles);

}
function setShadowMapUniforms(face) {
    var p = shaders.shadowmap.program;
    gl.uniformMatrix4fv(p.uniforms["projectionMatrix"], false, shadowMapProjectionMatrix);
    gl.uniformMatrix4fv(p.uniforms["modelViewMatrix"],  false, shadowMapModelViewMatrices[face]);
}
function setSSAOUniforms() {
    var p = shaders.ssao.program;

    var textures = [
        ["normalDepthTexture", shaders.pre.textureNormalDepth, gl.TEXTURE_2D],
        ["noiseTexture",       noiseTexture,                   gl.TEXTURE_2D]
    ];
    setTextureUniforms(p, textures);

    gl.uniform3fv(p.uniforms["hemisphere"], hemisphereArray);
    gl.uniformMatrix4fv(p.uniforms["projectionMatrix"], false, projectionMatrix);

    var invProjectionMatrix = mat4.create();
    mat4.inverse(projectionMatrix, invProjectionMatrix);
    gl.uniformMatrix4fv(p.uniforms["invProjectionMatrix"], false, invProjectionMatrix);
    gl.activeTexture(gl.TEXTURE0);
}
// p should be the program with which to blur (i.e. shaders.blurH.program or shaders.blurV.program)
function setBlurUniforms(p, texture, sampleStep) {
    setTextureUniforms(p, [["texture", texture, gl.TEXTURE_2D]]);
    gl.uniform2fv(p.uniforms["sampleStep"], sampleStep);
}

function initFramebuffers(width, height) {

    normalTexture = createLoadTexture(cubeTextureData.normalMap, gl.LINEAR, gl.CLAMP_TO_EDGE, true, [0, 0, 255, 255]);
    cubeTexture   = createLoadTexture(cubeTextureData.data,      gl.LINEAR, gl.CLAMP_TO_EDGE, true, [0, 0, 255, 255]);
    depthMap      = createLoadTexture(cubeTextureData.depthMap,  gl.LINEAR, gl.CLAMP_TO_EDGE, true, [0, 0, 255, 255]);

    // PRE SHADER
    shaders.pre.textureDiffuse     = createTexture(width, height, gl.LINEAR,  gl.CLAMP_TO_EDGE, gl.RGBA, gl.FLOAT);
    shaders.pre.textureNormalDepth = createTexture(width, height, gl.NEAREST, gl.CLAMP_TO_EDGE, gl.RGBA, gl.FLOAT);
    shaders.pre.textureDepth       = createTexture(width, height, gl.NEAREST, gl.CLAMP_TO_EDGE, gl.DEPTH_COMPONENT, gl.UNSIGNED_SHORT);
    shaders.pre.framebuffer = createMrtFramebuffer([shaders.pre.textureDiffuse,
                                                    shaders.pre.textureNormalDepth],
                                                    shaders.pre.textureDepth);

    // SHADOW MAP STUFF
    shaders.shadowmap.texture = createCubeMapTexture(shadowMapSize, shadowMapSize, gl.NEAREST, gl.CLAMP_TO_EDGE, gl.RGBA, gl.FLOAT);
    shaders.shadowmap.framebuffers = createCubeMapFramebuffers(shaders.shadowmap.texture, shadowMapSize, shadowMapSize);

    // SSAO
    shaders.ssao.texture = createTexture(width, height, gl.NEAREST, gl.CLAMP_TO_EDGE, gl.RGBA, gl.UNSIGNED_BYTE);
    shaders.ssao.framebuffer = createFramebuffer(shaders.ssao.texture);

    // BLUR
    shaders.blur.texture1 = createTexture(width, height, gl.NEAREST, gl.CLAMP_TO_EDGE, gl.RGBA, gl.UNSIGNED_BYTE);
    shaders.blur.texture2 = createTexture(width, height, gl.NEAREST, gl.CLAMP_TO_EDGE, gl.RGBA, gl.UNSIGNED_BYTE);
    shaders.blur.framebuffer1 = createFramebuffer(shaders.blur.texture1);
    shaders.blur.framebuffer2 = createFramebuffer(shaders.blur.texture2);

    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindRenderbuffer(gl.RENDERBUFFER, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

function handleInput(delta) {
    if (isKeyDown(38) || isKeyDown(87)) { // UP / W
        camera.move([0, 0, moveSpeed * delta]);
    }
    if (isKeyDown(37) || isKeyDown(65)) { // LEFT / A
        camera.rotate([0, rotateSpeed * delta, 0]);
    }
    if (isKeyDown(40) || isKeyDown(83)) { // DOWN / S
        camera.move([0, 0, -moveSpeed * delta]);
    }
    if (isKeyDown(39) || isKeyDown(68)) { // RIGHT / D
        camera.rotate([0, -rotateSpeed * delta, 0]);
    }
    if (isKeyDown(81)) { // Q
        camera.move([-moveSpeed * delta, 0, 0]);
    }
    if (isKeyDown(69)) { // E
        camera.move([moveSpeed * delta, 0, 0]);
    }
}

function setupScene() {
    var chunk = new Chunk();
    chunk.SetActive(7, 8, 7, true);
    chunk.SetActive(7, 9, 7, true);
    chunk.SetActive(7, 9, 8, true);
    chunk.SetActive(8, 9, 7, true);

    chunk.SetActive(9, 8, 9, true);
    chunk.SetActive(9, 7, 8, true);
    chunk.SetActive(9, 7, 9, true);
    chunk.SetActive(8, 7, 9, true);

    chunk.SetActive(1, 7, 8, true);
    chunk.SetActive(1, 8, 8, true);
    chunk.SetActive(1, 9, 8, true);

    chunk.SetActive(3, 7, 8, true);
    chunk.SetActive(3, 8, 8, true);
    chunk.SetActive(3, 9, 8, true);

    chunk.SetActive(5, 7, 8, true);
    chunk.SetActive(5, 8, 8, true);
    chunk.SetActive(5, 9, 8, true);

    for (var i = 0; i < Chunk.SIZE; i++) {
        for (var j = 0; j < Chunk.SIZE; j++) {
            chunk.SetActive(i,  6, j, true); // Floor
            chunk.SetActive(i, 10, j, true); // Ceiling
            chunk.SetActive(i,  j, 6, true); // Far wall
        }
    }
    chunk.CreateMesh();
    chunks.push(chunk);
}

function drawPre() {
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);

    mat4.perspective(45, gl.viewportWidth / gl.viewportHeight, 0.1, sceneFarPlane, projectionMatrix);

    modelViewMatrix = camera.viewMatrix();

    gl.bindFramebuffer(gl.FRAMEBUFFER, shaders.pre.framebuffer);
    gl.enable(gl.DEPTH_TEST);
    gl.clearColor(0, 0, 0, 100.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.useProgram(shaders.pre.program);
    setPreUniforms();

    for (var i = 0; i < chunks.length; i++) {
        chunks[i].SetPositions (shaders.pre.program);
        chunks[i].SetNormals   (shaders.pre.program);
        chunks[i].SetTangents  (shaders.pre.program);
        chunks[i].SetBitangents(shaders.pre.program);
        chunks[i].SetTexCoords (shaders.pre.program);
        chunks[i].Render       (shaders.pre.program);
    }
}

function drawShadowMap() {
    mat4.perspective(90, 1, 0.1, shadowMapFarPlane, shadowMapProjectionMatrix);
    shadowMapModelViewMatrices[0] = mat4.lookAt(lightPos, vec3.add([ 1, 0, 0], lightPos), [0, -1,  0]);
    shadowMapModelViewMatrices[1] = mat4.lookAt(lightPos, vec3.add([-1, 0, 0], lightPos), [0, -1,  0]);
    shadowMapModelViewMatrices[2] = mat4.lookAt(lightPos, vec3.add([ 0, 1, 0], lightPos), [0,  0,  1]);
    shadowMapModelViewMatrices[3] = mat4.lookAt(lightPos, vec3.add([ 0,-1, 0], lightPos), [0,  0, -1]);
    shadowMapModelViewMatrices[4] = mat4.lookAt(lightPos, vec3.add([ 0, 0, 1], lightPos), [0, -1,  0]);
    shadowMapModelViewMatrices[5] = mat4.lookAt(lightPos, vec3.add([ 0, 0,-1], lightPos), [0, -1,  0]);

    gl.clearColor(shadowMapFarPlane, shadowMapFarPlane, shadowMapFarPlane, shadowMapFarPlane);
    gl.viewport(0, 0, shadowMapSize, shadowMapSize);
    for (var i = 0; i < 6; i++) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, shaders.shadowmap.framebuffers[i]);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.enable(gl.DEPTH_TEST);

        gl.useProgram(shaders.shadowmap.program);
        setShadowMapUniforms(i);

        for (var j = 0; j < chunks.length; j++) {
            chunks[j].SetPositions(shaders.shadowmap.program);
            chunks[j].Render(shaders.shadowmap.program);
        }
    }
}

function generateSSAOhemisphere() {
    hemisphereArray = new Array();
    for (var i = 0; i < numSSAOSamples; i++) {
        var hemisphere = [
            Math.random() * 2 - 1,
            Math.random() * 2 - 1,
            Math.random()
        ];
        vec3.normalize(hemisphere);
        vec3.scale(hemisphere, Math.random());

        var scale = i / numSSAOSamples;
        scale = (1 - scale * scale) * 0.1 + scale * scale; // Lerp
        vec3.scale(hemisphere, scale);
        hemisphereArray = hemisphereArray.concat(hemisphere);
    }
}
function generateSSAONoiseTexture() {
    var texSize = 4;
    var noiseArray = new Array();
    for (var i = 0; i < texSize * texSize * 3; i += 3) {
        var noise = [
            Math.random() * 2 - 1,
            Math.random() * 2 - 1,
            0
        ];
        vec3.normalize(noise);
        noiseArray = noiseArray.concat(noise);
    }
    noiseTexture = createTexture(
        texSize, texSize, gl.NEAREST, gl.REPEAT,
        gl.RGB, gl.FLOAT, new Float32Array(noiseArray)
    );
}

function blur(texture) {
    var pixelSize = [1/gl.viewportWidth, 1/gl.viewportHeight];

    var p = shaders.blur.program;
    gl.bindFramebuffer(gl.FRAMEBUFFER, shaders.blur.framebuffer1);
    gl.useProgram(p);
    setBlurUniforms(p, texture, [pixelSize[0], 0]);
    drawFullscreenQuad(p);

    gl.bindFramebuffer(gl.FRAMEBUFFER, shaders.blur.framebuffer2);
    gl.useProgram(p);
    setBlurUniforms(p, shaders.blur.texture1, [0, pixelSize[1]]);
    drawFullscreenQuad(p);

    return shaders.blur.texture2;
}

function drawSSAO() {
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.bindFramebuffer(gl.FRAMEBUFFER, shaders.ssao.framebuffer);
    gl.useProgram(shaders.ssao.program);
    setSSAOUniforms();
    drawFullscreenQuad(shaders.ssao.program);

    shaders.ssao.textureBlurred = blur(shaders.ssao.texture);
}

function addVec(a, b) {
    return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function drawDeferred() {
    modelViewMatrix = camera.viewMatrix();

    mat4.multiplyVec3(modelViewMatrix, lightPos, viewSpaceLightPos);

    for (var i = 0; i < nrLights; i++) {
        mat4.multiplyVec3(modelViewMatrix, lights[i], viewSpaceLights[i]);
        viewSpaceLightDirs[i] = mat4.multiplyVec4(modelViewMatrix, vec3.normalize(lightDirs[i].concat(0))).slice(0, 3);
    }

    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.useProgram(shaders.deferred.program);
    setDeferredUniforms();
    drawFullscreenQuad(shaders.deferred.program);
}

function render() {
    drawPre();
    if (enableShadows && enableMainLight) {
        drawShadowMap();
    }
    drawSSAO();
    drawDeferred();
}

function webGLStart() {
    // Init everything
    var canvas = document.getElementById("canvas");
    initGL(canvas);
    initShaders();

    initFramebuffers(gl.viewportWidth, gl.viewportHeight);

    setupScene();

    generateSSAOhemisphere();
    generateSSAONoiseTexture();

    // Setup permanent stuff
    gl.cullFace(gl.BACK);
    gl.enable(gl.CULL_FACE);

    var stats1 = new frameTimeStats(10,  document.getElementById("fps-text1"));
    var stats2 = new frameTimeStats(50,  document.getElementById("fps-text2"));
    var stats3 = new frameTimeStats(100, document.getElementById("fps-text3"));

    var rendererInformation = new rendererInfo(document.getElementById("renderer-info"));

    var time = 0;

    // Start the game loop
    var last = performance.now();
    (function gameLoop(now){
        var delta = now - last;

        stats1.addSample(delta);
        stats2.addSample(delta);
        stats3.addSample(delta);

        rendererInformation.display();

        handleInput(delta/targetDelta);
        render();

        time += delta;
        lightPos[0] = 8 + Math.sin(time / 1000.0);

        last = now;

        requestAnimationFrame(gameLoop);
    })(performance.now());
}

function init() {
    loadShaders(webGLStart);
}

function loadShaders(callback) {
    var numRequests = 2 * Object.keys(shaders).length;
    var completedRequests = 0;

    for (var k in shaders) {
        ["vs", "fs"].forEach(function(ext) {
            var httpRequest = new XMLHttpRequest();
            (function(k) {
                httpRequest.onreadystatechange = function() {
                    if (httpRequest.readyState == XMLHttpRequest.DONE) {
                        if (httpRequest.status === 200) {
                            shaders[k][ext] = httpRequest.responseText;
                            if (++completedRequests >= numRequests) {
                                callback();
                            }
                        }
                        else {
                            alert(shaders[k] + "." + ext + " could not be loaded.");
                        }
                    }
                };
            })(k);
            httpRequest.open("GET", shaders[k].src + "." + ext, true);
            httpRequest.send();
        });
    }
}
init();
