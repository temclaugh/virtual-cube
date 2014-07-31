var PI = Math.PI;
var STICKER_SIZE = .85;
var ROTATION_FRAMES = 8;

var COLORS = {
    "white": {index: 0, value: 0xffffff, rotation: [0, PI/2, 0], adjustment: {x: -.5, y: 0, z: 0}},
    "yellow": {index: 1, value: 0xffff00, rotation: [0, PI/2, 0], adjustment: {x: .5, y: 0, z: 0}},
    "green": {index: 2, value: 0x00ff00, rotation: [PI/2, 0, 0], adjustment: {x: 0, y: -.5, z: 0}},
    "blue": {index: 3, value: 0x0000ff, rotation: [PI/2, 0, 0], adjustment: {x: 0, y: .5, z: 0}},
    "orange": {index: 4, value: 0xff8c00, rotation: [0, 0, PI/2], adjustment: {x: 0, y: 0, z: -.5}},
    "red": {index: 5, value: 0xff0000, rotation: [0, 0, PI/2], adjustment: {x: 0, y: 0, z: .5}},
}

var cube = {
    cubies: null,
    stickers: [],
    faces: {left: [], right: [], down: [], up: [], back: [], front: []},
    rotatingFace: null,
    animationQueue: [],
    frame: 0,
    dim: null,

    init: function (scene) {
        var n = 2;
        this.dim = n;
        this.scene = scene;

        function makeStickers (x, y, z) {

            var stickers = new Array(6);

            function newSticker (color) {
                var colorValue = COLORS[color].value;
                var mesh = new THREE.MeshBasicMaterial({color: colorValue, side: THREE.DoubleSide});
                var sticker = new THREE.Mesh(new THREE.PlaneGeometry(STICKER_SIZE, STICKER_SIZE), mesh);
                sticker.position.x = (x + COLORS[color].adjustment.x) - (cube.dim - 1)/2;
                sticker.position.y = (y + COLORS[color].adjustment.y) - (cube.dim - 1)/2;
                sticker.position.z = (z + COLORS[color].adjustment.z) - (cube.dim - 1)/2;
                sticker.rotation.x = COLORS[color].rotation[0];
                sticker.rotation.y = COLORS[color].rotation[1];
                sticker.rotation.z = COLORS[color].rotation[2];
                stickers[COLORS[color].index] = sticker;
                scene.add(sticker);
                cube.stickers.push(sticker);

            }
            for (var i = 0; i < 6; ++i) {
                stickers[i] = null;
            }

            if (x == 0) {
                newSticker("white");
                cube.faces.left.push(stickers);
            } else if (x == cube.dim - 1) {
                newSticker("yellow");
                cube.faces.right.push(stickers);
            }
            if (y == 0) {
                newSticker("green");
                cube.faces.down.push(stickers);
            } else if (y == cube.dim - 1) {
                newSticker("blue");
                cube.faces.up.push(stickers);
            }
            if (z == 0) {
                newSticker("orange");
                cube.faces.back.push(stickers);
            } else if (z == cube.dim - 1) {
                newSticker("red");
                cube.faces.front.push(stickers);
            }
            return stickers;
        }

        this.cubies = new Array(n);

        // initialize cubies
        for (var i = 0; i < n; ++i) {
            this.cubies[i] = new Array(n);
            for (var j = 0; j < n; ++j) {
                this.cubies[i][j] = new Array(n);
                for (var k = 0; k < n; ++k) {
                    this.cubies[i][j][k] = null;
                }
            }
        }

        // corners
        for (var i = 0; i < 8; ++i) {
            var x = (n-1) * ((i>>2) & 1);
            var y = (n-1) * ((i>>1) & 1);
            var z = (n-1) * (i & 1);
            this.cubies[x][y][z] = makeStickers(x, y, z);
        }

        // edges
        for (var i = 0; i < 4; ++i) {
            var coord1 = (n-1) * ((i>>1) & 1);
            var coord2 = (n-1) * (i & 1);
            for (var j = 1; j < n-1; ++j) {
                this.cubies[j][coord1][coord2] = makeStickers(j, coord1, coord2);
                this.cubies[coord1][j][coord2] = makeStickers(coord1, j, coord2);
                this.cubies[coord1][coord2][j] = makeStickers(coord1, coord2, j);
            }
        }

        // centers
        for (var i = 0; i < n; i += n-1) {
            for (var j = 1; j < n-1; ++j) {
                for (var k = 1; k < n-1; ++k) {
                    this.cubies[i][j][k] = makeStickers(i, j, k);
                    this.cubies[j][i][k] = makeStickers(j, i, k);
                    this.cubies[k][j][i] = makeStickers(k, j, i);
                }
            }
        }
        // write method to determine faces that a cubie touches based on its coordinates

        this.backFace = this.orangeFace;
        this.topFace = this.blueFace;
        this.downFace = this.greenFace;
        this.leftFace = this.whiteFace;
        this.rightFace = this.yellowFace;
    },

    rotate: function (animationEvent) {
        var direction = animationEvent.direction;
        var axis = animationEvent.axis;
        var frame = animationEvent.frame;
        var angle = direction * (PI/2) / ROTATION_FRAMES;
        var d1 = animationEvent.d1;
        var d2 = animationEvent.d2;
        for (var i = 0; i < this.stickers.length; ++i) {
            var sticker = this.stickers[i];
            var coord1 = sticker.position[d1];
            var coord2 = sticker.position[d2];
            sticker.position[d1] = coord1 * Math.cos(angle) - coord2 * Math.sin(angle); 
            sticker.position[d2] = coord1 * Math.sin(angle) + coord2 * Math.cos(angle);

            rotationMatrix = new THREE.Matrix4();
            rotationMatrix.makeRotationAxis(axis.normalize(), -angle);
            rotationMatrix.multiply(sticker.matrix);
            sticker.matrix = rotationMatrix;
            sticker.rotation.setFromRotationMatrix(sticker.matrix);
        }
    }
};

var view = {
    rotatingFace: null,
    animationQueue: [],
    frame: 0,
    angle: 0,

    init: function (scene) {
        this.scene = scene;
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.z = cube.dim * 1.2;
        this.camera.position.y = cube.dim * 1.2;
        this.camera.lookAt(this.scene.position);

    },

};

window.onkeydown = function(event) {
    console.log(event.keyCode);
    switch (event.keyCode) {
        case 84: // t
        case 89: // y
            cube.animationQueue.push({axis: new THREE.Vector3(1,0,0), direction: 1, frame: 1, d1: "z", d2: "y"});
            var temp = cube.faces.front;
            cube.faces.front = cube.faces.down;
            cube.faces.down = cube.faces.back;
            cube.faces.back = cube.faces.up;
            cube.faces.up = temp;
            break;
        case 80: // p
            cube.animationQueue.push({axis: new THREE.Vector3(0,0,-1), direction: -1, frame: 1, d1: "x", d2: "y"});
            var temp = cube.faces.up;
            cube.faces.up = cube.faces.left;
            cube.faces.left = cube.faces.down;
            cube.faces.down = cube.faces.right;
            cube.faces.right = temp;
            break;
        case 81: // q
            cube.animationQueue.push({axis: new THREE.Vector3(0,0,-1), direction: 1, frame: 1, d1: "x", d2: "y"});
            var temp = cube.faces.up;
            cube.faces.up = cube.faces.right;
            cube.faces.right = cube.faces.down;
            cube.faces.down = cube.faces.left;
            cube.faces.left = temp;
            break;
        case 66: // b
        case 78: // n
            cube.animationQueue.push({axis: new THREE.Vector3(1,0,0), direction: -1, frame: 1, d1: "z", d2: "y"});
            var temp = cube.faces.front;
            cube.faces.front = cube.faces.top;
            cube.faces.top = cube.faces.back;
            cube.faces.back = cube.faces.down;
            cube.faces.front = temp;
            console.log(cube.faces.front);
            break;
        case 65:  // a
            cube.animationQueue.push({axis: new THREE.Vector3(0,1,0), direction: -1, frame: 1, d1: "x", d2: "z"});
            var temp = cube.faces.front;
            cube.faces.front = cube.faces.left;
            cube.faces.left = cube.faces.back;
            cube.faces.back = cube.faces.right;
            cube.faces.right = temp;
            break;
        case 59:  // ;
            cube.animationQueue.push({axis: new THREE.Vector3(0,1,0), direction: 1, frame: 1, d1: "x", d2: "z"});
            var temp = cube.faces.front;
            cube.faces.front = cube.faces.right;
            cube.faces.right = cube.faces.back;
            cube.faces.back = cube.faces.left;
            cube.faces.left = temp;
            break;
    }
}

window.onload = function () {
    var scene = new THREE.Scene();
    var renderer = new THREE.WebGLRenderer();
    renderer.setSize(.95*window.innerWidth, .95*window.innerHeight);
    document.body.appendChild(renderer.domElement);

    var render = function () { 
        renderer.render(scene, view.camera); 
        requestAnimationFrame(render);
        var rotatingObjects = [cube, view];
        for (var i in rotatingObjects) {
            var rotatingObject = rotatingObjects[i];
            if (rotatingObject.animationQueue.length != 0) {
                var animationEvent;
                if (rotatingObject.animationQueue[0].frame == ROTATION_FRAMES) {
                    animationEvent = rotatingObject.animationQueue.shift();
                    if (animationEvent == null) {
                        return;
                    }
                } else {
                    animationEvent = rotatingObject.animationQueue[0];
                }
                rotatingObject.rotate(animationEvent);
                ++animationEvent.frame;

            }
        }
    } 
    cube.init(scene);
    view.init(scene);
    render();
}
