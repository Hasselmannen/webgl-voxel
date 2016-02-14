function Camera(position, forward) {
    this._position = [position[0], position[1], position[2]];
    this._forward = [forward[0], forward[1], forward[2]];
    this._up = [0, 1, 0];
};
Camera.prototype.viewMatrix = function() {
    return mat4.lookAt(this._position,
                      [this._position[0] + this._forward[0],
                       this._position[1] + this._forward[1],
                       this._position[2] + this._forward[2]],
                       this._up);
}
Camera.prototype.move = function(movement) {
    var right = [];
    vec3.cross(this._forward, this._up, right);
    
    this._position = [
        this._position[0] + right[0] * movement[0] +
                    this._up[0]      * movement[1] +
                    this._forward[0] * movement[2],
        this._position[1] + right[1] * movement[0] +
                    this._up[1]      * movement[1] +
                    this._forward[1] * movement[2],
        this._position[2] + right[2] * movement[0] +
                    this._up[2]      * movement[1] +
                    this._forward[2] * movement[2]
    ];
}
Camera.prototype.rotate = function(rotation) {
    var rotMatrix = mat4.create();
    mat4.identity(rotMatrix);
    mat4.rotateY(rotMatrix, rotation[1]);
    mat4.multiplyVec3(rotMatrix, this._forward);
}
