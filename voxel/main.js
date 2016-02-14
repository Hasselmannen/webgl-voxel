// Shaders
var shaders = {
    pre       : { src : "shaders/pre",      },
    deferred  : { src : "shaders/deferred"  },
    shadowmap : { src : "shaders/shadowmap" },
    ssao      : { src : "shaders/ssao"      },
    blurH     : { src : "shaders/blur-h"    },
    blurV     : { src : "shaders/blur-v"    }
};

// Render matrices
var modelViewMatrix = mat4.create();
var projectionMatrix = mat4.create();
var shadowMapProjectionMatrix = mat4.create();
var shadowMapModelViewMatrices = new Array();

var lightPos = [8, 8, 8];
var viewSpaceLightPos = new Array();

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
        ["normalDepthTexture", "diffuseTexture", "viewSpaceLightPos", "invProjectionMatrix", "shadowMap", "invModelViewMatrix", "ssaoTexture"]
    );
    shaders.ssao.program = initShader(
        shaders.ssao,
        ["position"],
        ["normalDepthTexture", "invProjectionMatrix", "projectionMatrix", "noiseTexture", "hemisphere"]
    );
    shaders.blurH.program = initShader(
        shaders.blurH,
        ["position"],
        ["texture", "sampleResX"]
    );
    shaders.blurV.program = initShader(
        shaders.blurV,
        ["position"],
        ["texture", "sampleResY"]
    );
}

function setPreUniforms() {
    var p = shaders.pre.program;
    gl.uniformMatrix4fv(p.uniforms["projectionMatrix"], false, projectionMatrix);
    gl.uniformMatrix4fv(p.uniforms["modelViewMatrix"], false, modelViewMatrix);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, cubeTexture);
    gl.uniform1i(p.uniforms["diffuseTexture"], 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, normalTexture);
    gl.uniform1i(p.uniforms["normalTexture"], 1);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, depthMap);
    gl.uniform1i(p.uniforms["depthMap"], 2);
    gl.activeTexture(gl.TEXTURE0);
}
function setDeferredUniforms() {
    var p = shaders.deferred.program;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, shaders.pre.textureNormalDepth);
    gl.uniform1i(p.uniforms["normalDepthTexture"], 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, shaders.pre.textureDiffuse);
    gl.uniform1i(p.uniforms["diffuseTexture"], 1);
    gl.uniform3fv(p.uniforms["viewSpaceLightPos"], viewSpaceLightPos);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, shaders.shadowmap.texture);
    gl.uniform1i(p.uniforms["shadowMap"], 2);
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, shaders.ssao.textureBlurred);
    gl.uniform1i(p.uniforms["ssaoTexture"], 3);

    var invProjectionMatrix = mat4.create();
    mat4.inverse(projectionMatrix, invProjectionMatrix);
    gl.uniformMatrix4fv(p.uniforms["invProjectionMatrix"], false, invProjectionMatrix);
    gl.activeTexture(gl.TEXTURE0);

    var invModelViewMatrix = mat4.create();
    mat4.inverse(modelViewMatrix, invModelViewMatrix);
    gl.uniformMatrix4fv(p.uniforms["invModelViewMatrix"], false, invModelViewMatrix);
}
function setShadowMapUniforms(face) {
    var p = shaders.shadowmap.program;
    gl.uniformMatrix4fv(p.uniforms["projectionMatrix"], false, shadowMapProjectionMatrix);
    gl.uniformMatrix4fv(p.uniforms["modelViewMatrix"], false, shadowMapModelViewMatrices[face]);
}
function setSSAOUniforms() {
    var p = shaders.ssao.program;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, shaders.pre.textureNormalDepth);
    gl.uniform1i(p.uniforms["normalDepthTexture"], 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, noiseTexture);
    gl.uniform1i(p.uniforms["noiseTexture"], 1);

    gl.uniform3fv(p.uniforms["hemisphere"], hemisphereArray);
    gl.uniformMatrix4fv(p.uniforms["projectionMatrix"], false, projectionMatrix);

    var invProjectionMatrix = mat4.create();
    mat4.inverse(projectionMatrix, invProjectionMatrix);
    gl.uniformMatrix4fv(p.uniforms["invProjectionMatrix"], false, invProjectionMatrix);
    gl.activeTexture(gl.TEXTURE0);
}
// p should be the program with which to blur (i.e. shaders.blurH.program or shaders.blurV.program)
function setBlurUniforms(p, texture, sampleResX, sampleResY) {
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(p.uniforms["texture"], 0);
    gl.uniform1f(p.uniforms["sampleResX"], sampleResX);
    gl.uniform1f(p.uniforms["sampleResY"], sampleResY);
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
    shaders.blurH.texture = createTexture(width, height, gl.NEAREST, gl.CLAMP_TO_EDGE, gl.RGBA, gl.UNSIGNED_BYTE);
    shaders.blurH.framebuffer = createFramebuffer(shaders.blurH.texture);
    shaders.blurV.texture = createTexture(width, height, gl.NEAREST, gl.CLAMP_TO_EDGE, gl.RGBA, gl.UNSIGNED_BYTE);
    shaders.blurV.framebuffer = createFramebuffer(shaders.blurV.texture);

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
            chunk.SetActive(i, 6, j, true); // Floor
            chunk.SetActive(i, 10, j, true); // Ceiling
            chunk.SetActive(i, j, 6, true); // Far wall
        }
    }
    chunk.CreateMesh();
    chunks.push(chunk);
}

function drawPre() {
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);

    mat4.perspective(45, gl.viewportWidth / gl.viewportHeight, 0.1, sceneFarPlane, projectionMatrix);

    modelViewMatrix = camera.viewMatrix();

    mat4.multiplyVec3(modelViewMatrix, lightPos, viewSpaceLightPos);

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
    shadowMapModelViewMatrices[0] = mat4.lookAt(lightPos, [lightPos[0] + 1, lightPos[1], lightPos[2]], [0, -1,  0]);
    shadowMapModelViewMatrices[1] = mat4.lookAt(lightPos, [lightPos[0] - 1, lightPos[1], lightPos[2]], [0, -1,  0]);
    shadowMapModelViewMatrices[2] = mat4.lookAt(lightPos, [lightPos[0], lightPos[1] + 1, lightPos[2]], [0,  0,  1]);
    shadowMapModelViewMatrices[3] = mat4.lookAt(lightPos, [lightPos[0], lightPos[1] - 1, lightPos[2]], [0,  0, -1]);
    shadowMapModelViewMatrices[4] = mat4.lookAt(lightPos, [lightPos[0], lightPos[1], lightPos[2] + 1], [0, -1,  0]);
    shadowMapModelViewMatrices[5] = mat4.lookAt(lightPos, [lightPos[0], lightPos[1], lightPos[2] - 1], [0, -1,  0]);

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
    //gl.viewport(0, 0, gl.viewportWidth/2, gl.viewportHeight/2);

    var p = shaders.blurH.program;
    gl.bindFramebuffer(gl.FRAMEBUFFER, shaders.blurH.framebuffer);
    gl.useProgram(p);
    setBlurUniforms(p, texture, gl.viewportWidth, gl.viewportHeight);
    drawFullscreenQuad(p);

    p = shaders.blurV.program;
    gl.bindFramebuffer(gl.FRAMEBUFFER, shaders.blurV.framebuffer);
    gl.useProgram(p);
    setBlurUniforms(p, shaders.blurH.texture, gl.viewportWidth, gl.viewportWidth);
    drawFullscreenQuad(p);

    return shaders.blurV.texture;
}

function drawSSAO() {
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.bindFramebuffer(gl.FRAMEBUFFER, shaders.ssao.framebuffer);
    gl.useProgram(shaders.ssao.program);
    setSSAOUniforms();
    drawFullscreenQuad(shaders.ssao.program);

    shaders.ssao.textureBlurred = blur(shaders.ssao.texture);
}

function drawDeferred() {
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.useProgram(shaders.deferred.program);
    setDeferredUniforms();
    drawFullscreenQuad(shaders.deferred.program);
}

function render() {
    drawPre();
    drawShadowMap();
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
