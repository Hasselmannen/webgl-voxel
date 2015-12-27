function Block() {
    this._isActive = false;
    this._type = 0;
}
Block.prototype.IsActive = function() { return this._isActive; };
Block.prototype.SetActive = function(isActive) { this._isActive = isActive; };
Block.HALF_SIZE = 0.5;
Block.VERTICES = [
    // Front face
    -Block.HALF_SIZE, -Block.HALF_SIZE,  Block.HALF_SIZE,
     Block.HALF_SIZE, -Block.HALF_SIZE,  Block.HALF_SIZE,
     Block.HALF_SIZE,  Block.HALF_SIZE,  Block.HALF_SIZE,
    -Block.HALF_SIZE,  Block.HALF_SIZE,  Block.HALF_SIZE,

    // Back face
     Block.HALF_SIZE, -Block.HALF_SIZE, -Block.HALF_SIZE,
    -Block.HALF_SIZE, -Block.HALF_SIZE, -Block.HALF_SIZE,
    -Block.HALF_SIZE,  Block.HALF_SIZE, -Block.HALF_SIZE,
     Block.HALF_SIZE,  Block.HALF_SIZE, -Block.HALF_SIZE,

    // Top face
    -Block.HALF_SIZE,  Block.HALF_SIZE,  Block.HALF_SIZE,
     Block.HALF_SIZE,  Block.HALF_SIZE,  Block.HALF_SIZE,
     Block.HALF_SIZE,  Block.HALF_SIZE, -Block.HALF_SIZE,
    -Block.HALF_SIZE,  Block.HALF_SIZE, -Block.HALF_SIZE,

    // Bottom face
     Block.HALF_SIZE, -Block.HALF_SIZE,  Block.HALF_SIZE,
    -Block.HALF_SIZE, -Block.HALF_SIZE,  Block.HALF_SIZE,
    -Block.HALF_SIZE, -Block.HALF_SIZE, -Block.HALF_SIZE,
     Block.HALF_SIZE, -Block.HALF_SIZE, -Block.HALF_SIZE,

    // Right face
     Block.HALF_SIZE, -Block.HALF_SIZE,  Block.HALF_SIZE,
     Block.HALF_SIZE, -Block.HALF_SIZE, -Block.HALF_SIZE,
     Block.HALF_SIZE,  Block.HALF_SIZE, -Block.HALF_SIZE,
     Block.HALF_SIZE,  Block.HALF_SIZE,  Block.HALF_SIZE,

    // Left face
    -Block.HALF_SIZE, -Block.HALF_SIZE, -Block.HALF_SIZE,
    -Block.HALF_SIZE, -Block.HALF_SIZE,  Block.HALF_SIZE,
    -Block.HALF_SIZE,  Block.HALF_SIZE,  Block.HALF_SIZE,
    -Block.HALF_SIZE,  Block.HALF_SIZE, -Block.HALF_SIZE
];
Block.VERTEX_COUNT = 24;
Block.VERTEX_SIZE = 3;
Block.INDICES = [
     0,  1,  2,    0,  2,  3, // Front face
     4,  5,  6,    4,  6,  7, // Back face
     8,  9, 10,    8, 10, 11, // Top face
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
Block.TEX_COORDS = [
    0, 0, // Front
    1, 0,
    1, 1,
    0, 1,
    
    0, 0, // Back
    1, 0,
    1, 1,
    0, 1,
    
    0, 0, // Top
    1, 0,
    1, 1,
    0, 1,
    
    0, 0, // Bottom
    1, 0,
    1, 1,
    0, 1,
    
    0, 0, // Right
    1, 0,
    1, 1,
    0, 1,
    
    0, 0, // Left
    1, 0,
    1, 1,
    0, 1
];
Block.TEX_COORD_COUNT = 24;
Block.TEX_COORD_SIZE = 2;
Block.TANGENT_COUNT = 24;
Block.TANGENT_SIZE = 3;
Block.BITANGENT_COUNT = 24;
Block.BITANGENT_SIZE = 3;


function Chunk() {
    this._blocks = new Array(Chunk.SIZE);
    this._mesh = new Object();
    this._mesh.vertices = new Array();
    this._mesh.indices = new Array();
    this._mesh.normals = new Array();
    this._mesh.texCoords = new Array();
    this._mesh.tangents = new Array();
    this._mesh.bitangents = new Array();
    
    this._positionBuffer = gl.createBuffer();
    this._indexBuffer = gl.createBuffer();
    this._normalBuffer = gl.createBuffer();
    this._texCoordBuffer = gl.createBuffer();
    this._tangentBuffer = gl.createBuffer();
    this._bitangentBuffer = gl.createBuffer();
    
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
                    this._mesh.texCoords = this._mesh.texCoords.concat(Block.TEX_COORDS);
                    createdVoxels++;
                }
            }
        }
    }
    
    for (var i = 0; i < createdVoxels * Block.NORMAL_COUNT * Block.NORMAL_SIZE; i++) {
        this._mesh.tangents[i] = 0;
        this._mesh.bitangents[i] = 0;
    }
    
    for (var i = 0; i < this._mesh.indices.length; i += 3) {
        var i0 = this._mesh.indices[i];
        var i1 = this._mesh.indices[i+1];
        var i2 = this._mesh.indices[i+2];
        
        var v0 = [this._mesh.vertices[i0*3], this._mesh.vertices[i0*3+1], this._mesh.vertices[i0*3+2]];
        var v1 = [this._mesh.vertices[i1*3], this._mesh.vertices[i1*3+1], this._mesh.vertices[i1*3+2]];
        var v2 = [this._mesh.vertices[i2*3], this._mesh.vertices[i2*3+1], this._mesh.vertices[i2*3+2]];
        
        var uv0 = [this._mesh.texCoords[i0*2], this._mesh.texCoords[i0*2+1]];
        var uv1 = [this._mesh.texCoords[i1*2], this._mesh.texCoords[i1*2+1]];
        var uv2 = [this._mesh.texCoords[i2*2], this._mesh.texCoords[i2*2+1]];
        
        var deltaPos1 = [v1[0] - v0[0], v1[1] - v0[1], v1[2] - v0[2]];
        var deltaPos2 = [v2[0] - v0[0], v2[1] - v0[1], v2[2] - v0[2]];
        
        var deltaUV1 = [uv1[0] - uv0[0], uv1[1] - uv0[1]];
        var deltaUV2 = [uv2[0] - uv0[0], uv2[1] - uv0[1]];
        
        var r = Math.max(Math.min(1.0 / (deltaUV1[0] * deltaUV2[1] - deltaUV1[1] * deltaUV2[0]),1),-1);
        
        var tangent = [(deltaPos1[0] * deltaUV2[1] - deltaPos2[0] * deltaUV1[1]) * r,
                       (deltaPos1[1] * deltaUV2[1] - deltaPos2[1] * deltaUV1[1]) * r,
                       (deltaPos1[2] * deltaUV2[1] - deltaPos2[2] * deltaUV1[1]) * r];
        var bitangent = [(deltaPos2[0] * deltaUV1[0] - deltaPos1[0] * deltaUV2[0]) * r,
                         (deltaPos2[1] * deltaUV1[0] - deltaPos1[1] * deltaUV2[0]) * r,
                         (deltaPos2[2] * deltaUV1[0] - deltaPos1[2] * deltaUV2[0]) * r];

        this._mesh.tangents[i0*3+0] = tangent[0];
        this._mesh.tangents[i0*3+1] = tangent[1];
        this._mesh.tangents[i0*3+2] = tangent[2];
        this._mesh.tangents[i1*3+0] = tangent[0];
        this._mesh.tangents[i1*3+1] = tangent[1];
        this._mesh.tangents[i1*3+2] = tangent[2];
        this._mesh.tangents[i2*3+0] = tangent[0];
        this._mesh.tangents[i2*3+1] = tangent[1];
        this._mesh.tangents[i2*3+2] = tangent[2];

        this._mesh.bitangents[i0*3+0] = bitangent[0];
        this._mesh.bitangents[i0*3+1] = bitangent[1];
        this._mesh.bitangents[i0*3+2] = bitangent[2];
        this._mesh.bitangents[i1*3+0] = bitangent[0];
        this._mesh.bitangents[i1*3+1] = bitangent[1];
        this._mesh.bitangents[i1*3+2] = bitangent[2];
        this._mesh.bitangents[i2*3+0] = bitangent[0];
        this._mesh.bitangents[i2*3+1] = bitangent[1];
        this._mesh.bitangents[i2*3+2] = bitangent[2];
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, this._positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this._mesh.vertices), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, this._normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this._mesh.normals), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, this._texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this._mesh.texCoords), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, this._tangentBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this._mesh.tangents), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, this._bitangentBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this._mesh.bitangents), gl.STATIC_DRAW);
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
Chunk.prototype.SetTexCoords = function(shader) {
    gl.bindBuffer(gl.ARRAY_BUFFER, this._texCoordBuffer);
    gl.vertexAttribPointer(shader.attributes["texCoordIn"], Block.TEX_COORD_SIZE, gl.FLOAT, false, 0, 0);
}
Chunk.prototype.SetTangents = function(shader) {
    gl.bindBuffer(gl.ARRAY_BUFFER, this._tangentBuffer);
    gl.vertexAttribPointer(shader.attributes["tangent"], Block.TANGENT_SIZE, gl.FLOAT, false, 0, 0);
}
Chunk.prototype.SetBitangents = function(shader) {
    gl.bindBuffer(gl.ARRAY_BUFFER, this._bitangentBuffer);
    gl.vertexAttribPointer(shader.attributes["bitangent"], Block.BITANGENT_SIZE, gl.FLOAT, false, 0, 0);
}
Chunk.prototype.Render = function(shader) {
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._indexBuffer);
    gl.drawElements(gl.TRIANGLES, this._mesh.indices.length/Block.INDEX_SIZE, gl.UNSIGNED_SHORT, 0);
};
Chunk.SIZE = 16;
