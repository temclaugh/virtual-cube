
var cube = {
    cubies: null,
    stickers: [],
    faces: {left: [], right: [], down: [], up: [], back: [], front: []},
    rotatingFace: null,
    animationQueue: [],
    frame: 0,
    dim: null,

    init: function (scene) {
        var n = 5;
        this.dim = n;
        this.scene = scene;

        function makeStickers (x, y, z) {

            var stickers = [];

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
                stickers.push(sticker);
                scene.add(sticker);
                cube.stickers.push(sticker);

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

    // rotate: function (animationEvent) {
    //     var direction = animationEvent.direction;
    //     var axis = animationEvent.axis;
    //     var frame = animationEvent.frame;
    //     var angle = direction * (PI/2) / ROTATION_FRAMES;
    //     var d1 = animationEvent.d1;
    //     var d2 = animationEvent.d2;
    //     for (var i = 0; i < this.stickers.length; ++i) {
    //         var sticker = this.stickers[i];
    //         var coord1 = sticker.position[d1];
    //         var coord2 = sticker.position[d2];
    //         sticker.position[d1] = coord1 * Math.cos(angle) - coord2 * Math.sin(angle);
    //         sticker.position[d2] = coord1 * Math.sin(angle) + coord2 * Math.cos(angle);

    //         rotationMatrix = new THREE.Matrix4();
    //         rotationMatrix.makeRotationAxis(axis.normalize(), -angle);
    //         rotationMatrix.multiply(sticker.matrix);
    //         sticker.matrix = rotationMatrix;
    //         sticker.rotation.setFromRotationMatrix(sticker.matrix);
    //     }
    // }
    rotate: function (animationEvent) {
        var turn = animationEvent.turn;
        var axis = turn;
        var direction = animationEvent.direction;
        var depth = animationEvent.depth;
        var xMin = 0, xMax = cube.dim;
        var yMin = 0, yMax = cube.dim;
        var zMin = 0, zMax = cube.dim;
        var frame = animationEvent.frame;
        if (frame == ROTATION_FRAMES) {
            var movedStickers = [];
        }
        var d1, d2;
        if (axis.x) {
            d1 = 'z';
            d2 = 'y';
            if (turn == TURNS.LEFT) {
                xMin = 0;
                xMax = depth;
            } else {
                xMin = cube.dim - depth;
                xMax = cube.dim;
            }
        } else if (axis.y) {
            d1 = 'x';
            d2 = 'z';
            if (turn == TURNS.DOWN) {
                yMin = 0;
                yMax = depth;
            } else {
                yMin = cube.dim - depth;
                yMax = cube.dim; 
            }
        }
        else {
            d1 = 'x';
            d2 = 'y';
            if (turn == TURNS.BACK) {
                zMin = 0;
                zMax = depth;
            } else {
                zMin = cube.dim - depth;
                zMax = cube.dim; 
            }
        }
        var angle = direction * (PI/2) / ROTATION_FRAMES;
        for (var x = xMin; x < xMax; ++x) {
            for (var y = yMin; y < yMax; ++y) {
                for (var z = zMin; z < zMax; ++z) {
                    var cubie = cube.cubies[x][y][z];
                    if (cubie === null) {
                        continue;
                    }
                    for (var i = 0; i < cubie.length; ++i) {
                        var sticker = cubie[i];
                        var coord1 = sticker.position[d1];
                        var coord2 = sticker.position[d2];
                        sticker.position[d1] = coord1 * Math.cos(angle) - coord2 * Math.sin(angle);
                        sticker.position[d2] = coord1 * Math.sin(angle) + coord2 * Math.cos(angle);

                        rotationMatrix = new THREE.Matrix4();
                        rotationMatrix.makeRotationAxis(axis.normalize(), -angle);
                        rotationMatrix.multiply(sticker.matrix);
                        sticker.matrix = rotationMatrix;
                        sticker.rotation.setFromRotationMatrix(sticker.matrix);
                        if (frame == ROTATION_FRAMES) {
                            movedStickers.push(sticker);
                        }
                    }
                    if (frame == ROTATION_FRAMES) {
                        cube.cubies[x][y][z] = [];
                    }
                }
            }
        }
        if (frame == ROTATION_FRAMES) {
            for (var i = 0; i < movedStickers.length; ++i) {
                function getCoord (coord) {
                    if (coord <= 0) {
                        return 0;
                    } else if (coord >= cube.dim - 1) {
                        return cube.dim - 1;
                    } else {
                        return Math.round(coord);
                    }
                }
                var x = getCoord(movedStickers[i].position.x + (cube.dim - 1)/2);
                var y = getCoord(movedStickers[i].position.y + (cube.dim - 1)/2);
                var z = getCoord(movedStickers[i].position.z + (cube.dim - 1)/2);
                cube.cubies[x][y][z].push(movedStickers[i]);
            }
        }
    },
    scramble: function () {
        var turnCount = 10 * this.dim;
        var turns = [TURNS.UP, TURNS.DOWN, TURNS.LEFT, TURNS.RIGHT, TURNS.BACK, TURNS.FRONT];
        var prevTurn = -1;
        var nextTurn = -1;
        for (var i = 0; i < turnCount; ++i) {
            while (prevTurn === nextTurn) {
                nextTurn = Math.floor(Math.random() * 6);
            }
            prevTurn = nextTurn;
            turn = turns[nextTurn];
            depth = Math.floor(Math.random() * (this.dim - 1)) + 1;
            console.log(depth);
            direction = [-1, 1][Math.floor(Math.random() * 2)];
            cube.animationQueue.push({frame: 1, turn: turn, depth: depth, direction: direction});
        }    
    },
};

window.onkeydown = function (event) {
    if (scrambling) {
        return;
    }
    var turn, depth, direction;
    switch (event.keyCode) {
        case charCodes.T:
        case charCodes.Y:
            turn = TURNS.LEFT;
            frame = 1;
            depth = cube.dim;
            direction = 1;
            break;
        case charCodes.P:
            turn = TURNS.FRONT;
            depth = cube.dim;
            direction = -1;
            break;
        case charCodes.Q:
            turn = TURNS.BACK;
            depth = cube.dim;
            direction = 1;
            break;
        case charCodes.B:
        case charCodes.N:
            turn = TURNS.RIGHT;
            depth = cube.dim;
            direction = -1;
            break;
        case charCodes.A:
            turn = TURNS.UP;
            depth = cube.dim;
            direction = -1;
            break;
        case charCodes.SEMI:
        case charCodes.SEMI_2:
            turn = TURNS.DOWN;
            depth = cube.dim;
            direction = 1;
            break;
        case charCodes.E:
            turn = TURNS.LEFT;
            depth = 1;
            direction = 1;
            break;
        case charCodes.D:
            turn = TURNS.LEFT;
            depth = 1;
            direction = -1;
            break;
        case charCodes.I:
            turn = TURNS.RIGHT;
            depth = 1;
            direction = 1;
            break;
        case charCodes.K:
            turn = TURNS.RIGHT;
            depth = 1;
            direction = -1;
            break;
        case charCodes.J:
            turn = TURNS.UP;
            depth = 1;
            direction = 1;
            break;
        case charCodes.F:
            turn = TURNS.UP;
            depth = 1;
            direction = -1;
            break;
        case charCodes.G:
            turn = TURNS.FRONT;
            depth = 1;
            direction = 1;
            break;
        case charCodes.H:
            turn = TURNS.FRONT;
            depth = 1;
            direction = -1;
            break;
        case charCodes.S:
            turn = TURNS.DOWN;
            depth = 1;
            direction = -1;
            break;
        case charCodes.L:
            turn = TURNS.DOWN;
            depth = 1;
            direction = 1;
            break;
        case charCodes.W:
            turn = TURNS.BACK;
            depth = 1;
            direction = 1;
            break;
        case charCodes.O:
            turn = TURNS.BACK;
            depth = 1;
            direction = -1;
            break;
        case charCodes.U:
            turn = TURNS.RIGHT;
            depth = 2;
            direction = 1;
            break;
        case charCodes.M:
            turn = TURNS.RIGHT;
            depth = 2;
            direction = -1;
            break;
        case charCodes.R:
            turn = TURNS.LEFT;
            depth = 2;
            direction = 1;
            break;
        case charCodes.V:
            turn = TURNS.LEFT;
            depth = 2;
            direction = -1;
            break;
        case charCodes.SPACE:
            scrambling = true;
            cube.scramble();
            playing = true;
            return;
        default:
            return;
    }
    if (!playing) {
        return;
    }
    cube.animationQueue.push({frame: 1, turn: turn, depth: depth, direction: direction});
}

window.onload = function () {
    var scene = new THREE.Scene();
    var renderer = new THREE.WebGLRenderer();
    renderer.setSize(.95*window.innerWidth, .95*window.innerHeight);
    cube.init(scene);
    var camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000); 
    camera.position.z = cube.dim * CUBE_DISTANCE;
    camera.position.y = cube.dim * CUBE_DISTANCE;
    camera.lookAt({x: 0, y: 0, z: 0});
    document.body.appendChild(renderer.domElement);

    var render = function () {
        renderer.render(scene, camera);
        requestAnimationFrame(render);
        if (cube.animationQueue.length > 0) {
            var animationEvent;
            if (cube.animationQueue[0].frame == ROTATION_FRAMES) {
                animationEvent = cube.animationQueue.shift();
                if (animationEvent == null) {
                    return;
                }
            } else {
                animationEvent = cube.animationQueue[0];
            }
            cube.rotate(animationEvent);
            ++animationEvent.frame;
        } else {
            scrambling = false;
        }
    }
    render();
}
