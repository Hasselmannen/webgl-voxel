function Camera(position, lookDir) {
    this._position = [position[0], position[1], position[2]];
    this._lookDir = [lookDir[0], lookDir[1], lookDir[2]];
    this._up = [0, 1, 0];
};
Camera.prototype.viewMatrix = function() {
    return mat4.lookAt(this._position, [this._position[0] + this._lookDir[0], this._position[1] + this._lookDir[1], this._position[2] + this._lookDir[2]], this._up);
}
Camera.prototype.move = function(movement) {
    this._position = [this._position[0] + movement[0], this._position[1] + movement[1], this._position[2] + movement[2]];
}
Camera.prototype.rotate = function(rotation) {
    
}