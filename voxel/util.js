// This file currently requires a WebGL context
// initiated as with variable name "gl"

var fullscreenQuadVertices = [
     1.0,  1.0,
    -1.0,  1.0,
    -1.0, -1.0,

    -1.0, -1.0,
     1.0, -1.0,
     1.0,  1.0
];

function drawFullscreenQuad(shader) {

    var fullscreenQuadVertexBuffer = gl.createBuffer();

    var screenQuadVBO = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, fullscreenQuadVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(fullscreenQuadVertices), gl.STATIC_DRAW);

    gl.enableVertexAttribArray(shader.attributes["position"]);
    gl.vertexAttribPointer(shader.attributes["position"], 2, gl.FLOAT, false, 0, 0);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
}

var keysDown = new Array();
var keysPressed = new Array();
var keysPressedLast = new Array();
document.onkeydown = function(e) {
    // Make more beautiful checks
    if (keysDown.indexOf(e.keyCode) === -1) {
        keysDown.push(e.keyCode);
    }
    if (keysPressed.indexOf(e.keyCode) === -1 && keysPressedLast.indexOf(e.keyCode) === -1) {
        keysPressed.push(e.keyCode);
    }
}
document.onkeyup = function(e) {
    var index = keysDown.indexOf(e.keyCode);
    if (index > -1) {
        keysDown.splice(index, 1);
    }

    index = keysPressedLast.indexOf(e.keyCode);
    if (index > -1) {
        keysPressedLast.splice(index, 1);
    }
}

function isKeyPressed(key) {
    var index = keysPressed.indexOf(key);

    if (index > -1) {
        keysPressed.splice(index, 1);
        keysPressedLast.push(key);
        return true;
    }
    return false;
}
function isKeyDown(key) {
    return keysDown.indexOf(key) > -1;
}

// Frame time statistics (SkipIfZeroCommon library javascript port)
function frameTimeStats(numSamples, outputElement) {
    this._samples = new Array(numSamples);
    this._maxNumSamples = numSamples;
    this._currentSamples = 0;
    this._output = outputElement;
}
frameTimeStats.prototype.addSample = function(sampleInMillis) {
    if (this._maxNumSamples == this._currentSamples) {
        for (var i = 0; i < this._maxNumSamples - 1; i++) {
            this._samples[i] = this._samples[i + 1];
        }
        this._samples[this._maxNumSamples - 1] = sampleInMillis;
    }
    else {
        this._samples[this._currentSamples++] = sampleInMillis;
    }

    var avg = this._samples.reduce(function(a, b) { return a + b; }) / this._currentSamples;
    var min = this._samples.reduce(function(a, b) { return Math.min(a, b); });
    var max = this._samples.reduce(function(a, b) { return Math.max(a, b); });

    var varianceSum = this._samples.reduce(function(a, b) { return a + Math.pow(b - avg, 2); });
    var standardDeviation = Math.sqrt(varianceSum / this._currentSamples);

    this._output.innerHTML = "Last " + this._currentSamples + " frames (ms): " +
        "Avg: " + avg.toFixed(1) +
        ", SD: " + standardDeviation.toFixed(1) +
        ", Min: " + min.toFixed(1) +
        ", Max: " + max.toFixed(1);
}

// Renderer information
function rendererInfo(outputElement) {
    this._output = outputElement;
    this._ext = gl.getExtension("WEBGL_debug_renderer_info");
}
rendererInfo.prototype.display = function() {
    if (this._ext != null) {
        this._output.innerHTML = "Renderer info: " + gl.getParameter(this._ext.UNMASKED_RENDERER_WEBGL);
    }
    else {
        this._output.innerHTML = "ERROR: Cannot display renderer info (WEBGL_debug_renderer_info not supported)."
    }
}

function createArray(length, f) {
    return (new Array(length)).fill(null).map(f ? f : function() { return null; });
}

function createMultiDimArray(cols, rows, f) {
    return createArray(cols, function() { return createArray(rows, f); });
}

function concatArrays(arrays) {
    return arrays.reduce(function(x, y) { return x.concat(y); });
}
