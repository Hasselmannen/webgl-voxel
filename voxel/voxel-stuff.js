function Block() {
    this._isActive = false;
    this._type = 0;
}
Block.prototype.IsActive = function() { return this._isActive; };
Block.prototype.SetActive = function(isActive) { this._isActive = isActive; };
Block.HALF_SIZE = 1;
Block.VERTICES = [
    // Front face
    -0.5, -0.5,  0.5,
    0.5, -0.5,  0.5,
    0.5,  0.5,  0.5,
    -0.5,  0.5,  0.5,

    // Back face
    -0.5, -0.5, -0.5,
    -0.5,  0.5, -0.5,
    0.5,  0.5, -0.5,
    0.5, -0.5, -0.5,

    // Top face
    -0.5,  0.5, -0.5,
    -0.5,  0.5,  0.5,
    0.5,  0.5,  0.5,
    0.5,  0.5, -0.5,

    // Bottom face
    -0.5, -0.5, -0.5,
    0.5, -0.5, -0.5,
    0.5, -0.5,  0.5,
    -0.5, -0.5,  0.5,

    // Right face
    0.5, -0.5, -0.5,
    0.5,  0.5, -0.5,
    0.5,  0.5,  0.5,
    0.5, -0.5,  0.5,

    // Left face
    -0.5, -0.5, -0.5,
    -0.5, -0.5,  0.5,
    -0.5,  0.5,  0.5,
    -0.5,  0.5, -0.5
];
Block.VERTEX_COUNT = 24;
Block.VERTEX_SIZE = 3;
Block.INDICES = [
    0, 1, 2,      0, 2, 3,    // Front face
    4, 5, 6,      4, 6, 7,    // Back face
    8, 9, 10,     8, 10, 11,  // Top face
    12, 13, 14,   12, 14, 15, // Bottom face
    16, 17, 18,   16, 18, 19, // Right face
    20, 21, 22,   20, 22, 23  // Left face
];
Block.INDEX_COUNT = 36;
Block.INDEX_SIZE = 1;
Block.NORMALS = [
    // Front face
    0.0,  0.0,  1.0,
    0.0,  0.0,  1.0,
    0.0,  0.0,  1.0,
    0.0,  0.0,  1.0,

    // Back face
    0.0,  0.0, -1.0,
    0.0,  0.0, -1.0,
    0.0,  0.0, -1.0,
    0.0,  0.0, -1.0,

    // Top face
    0.0,  1.0,  0.0,
    0.0,  1.0,  0.0,
    0.0,  1.0,  0.0,
    0.0,  1.0,  0.0,

    // Bottom face
    0.0, -1.0,  0.0,
    0.0, -1.0,  0.0,
    0.0, -1.0,  0.0,
    0.0, -1.0,  0.0,

    // Right face
    1.0,  0.0,  0.0,
    1.0,  0.0,  0.0,
    1.0,  0.0,  0.0,
    1.0,  0.0,  0.0,

    // Left face
    -1.0,  0.0,  0.0,
    -1.0,  0.0,  0.0,
    -1.0,  0.0,  0.0,
    -1.0,  0.0,  0.0,
];
Block.NORMAL_COUNT = 24;
Block.NORMAL_SIZE = 3;

function Chunk() {
    this._blocks = new Array(Chunk.SIZE);
    this._mesh = {};
    this._mesh.vertices = new Array();
    this._mesh.indices = new Array();
    this._mesh.normals = new Array();
    this._mesh.textureCoords = new Array();
    this._positionBuffer = gl.createBuffer();
    this._indexBuffer = gl.createBuffer();
    this._normalBuffer = gl.createBuffer();
    this._textureCoordBuffer = gl.createBuffer();
    
    for (var x = 0; x < Chunk.SIZE; x++) {
        this._blocks[x] = new Array(Chunk.SIZE);
        for (var y = 0; y < Chunk.SIZE; y++) {
            this._blocks[x][y] = new Array(Chunk.SIZE);
            for (var z = 0; z < Chunk.SIZE; z++) {
                this._blocks[x][y][z] = new Block();
            }
        }
    }
}
Chunk.prototype.CreateMesh = function() {
    var createdVoxels = 0;
    for (var x = 0; x < Chunk.SIZE; x++) {
        for (var y = 0; y < Chunk.SIZE; y++) {
            for (var z = 0; z < Chunk.SIZE; z++) {
                if (this._blocks[x][y][z].IsActive() === true) {
                    for (var i = 0; i < Block.VERTEX_COUNT*Block.VERTEX_SIZE; i+=3) {
                        this._mesh.vertices.push(Block.VERTICES[i] + x);
                        this._mesh.vertices.push(Block.VERTICES[i+1] + y);
                        this._mesh.vertices.push(Block.VERTICES[i+2] + z);
                    }
                    this._mesh.indices = this._mesh.indices.concat(Block.INDICES.map(function(n) { return n + createdVoxels * Block.VERTEX_COUNT; }));
                    this._mesh.normals = this._mesh.normals.concat(Block.NORMALS);
                    createdVoxels++;
                }
            }
        }
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, this._positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this._mesh.vertices), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, this._normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this._mesh.normals), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this._mesh.indices), gl.STATIC_DRAW);
};
Chunk.prototype.CreateCube = function(x, y, z) {
    
};
Chunk.prototype.Update = function(delta) {};
Chunk.prototype.SetPositions = function(shader) {
    gl.bindBuffer(gl.ARRAY_BUFFER, this._positionBuffer);
    gl.vertexAttribPointer(shader.attributes["position"], Block.VERTEX_SIZE, gl.FLOAT, false, 0, 0);
};
Chunk.prototype.SetNormals = function(shader) {
    gl.bindBuffer(gl.ARRAY_BUFFER, this._normalBuffer);
    gl.vertexAttribPointer(shader.attributes["normal"], Block.NORMAL_SIZE, gl.FLOAT, false, 0, 0);
};
Chunk.prototype.Render = function(shader) {
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._indexBuffer);
    gl.drawElements(gl.TRIANGLES, this._mesh.indices.length/Block.INDEX_SIZE, gl.UNSIGNED_SHORT, 0);
};
Chunk.SIZE = 16;