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
    gl.enableVertexAttribArray(shader.vertexPositionAttribute);
    gl.vertexAttribPointer(shader.vertexPositionAttribute, 2, gl.FLOAT, false, 0, 0);

    // Draw 6 vertices => 2 triangles:
    gl.drawArrays(gl.TRIANGLES, 0, 6);
}