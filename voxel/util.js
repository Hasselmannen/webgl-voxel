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

    // Bind:
    gl.bindBuffer(gl.ARRAY_BUFFER, fullscreenQuadVertexBuffer);
    gl.enableVertexAttribArray(shader.attributes["position"]);
    gl.vertexAttribPointer(shader.attributes["position"], 2, gl.FLOAT, false, 0, 0);

    // Draw 6 vertices => 2 triangles:
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