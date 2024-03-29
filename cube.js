var renderer, scene, camera;
var startTime;

// states
var playing = false;
var scrambling = false;
var waiting = false;
var replaying = false;
var resetCanvas = false;

var currentSolve;
var solves = [];

var cube = {
    init: function (scene, dim) {
        this.cubies =  null;
        this.stickers =  [];
        this.faces =  {left: [], right: [], down: [], up: [], back: [], front: []};
        this.rotatingFace =  null;
        this.animationQueue = [];
        this.frame =  0;

        var n = dim;
        this.dim = n;
        this.scene = scene;

        function makeStickers (x, y, z) {

            var stickers = [];

            function newSticker (color) {
                var frontColor = COLORS[color].value;
                var backColor = COLORS[color].darkValue;
                var frontGeometry = new THREE.PlaneGeometry(STICKER_SIZE, STICKER_SIZE);
                var backGeometry = new THREE.PlaneGeometry(STICKER_SIZE, STICKER_SIZE);
                backGeometry.applyMatrix(new THREE.Matrix4().makeRotationY(Math.PI));
                var frontMaterial = new THREE.MeshBasicMaterial({color: frontColor});
                var backMaterial = new THREE.MeshBasicMaterial({color: backColor});
                var frontMesh = new THREE.Mesh(frontGeometry, frontMaterial);
                var backMesh = new THREE.Mesh(backGeometry, backMaterial);
                //var sticker = new THREE.Mesh(new THREE.PlaneGeometry(STICKER_SIZE, STICKER_SIZE), mesh);
                var sticker = new THREE.Object3D();
                sticker.add(frontMesh);
                sticker.add(backMesh);
                sticker.position.x = (x + COLORS[color].adjustment.x) - (cube.dim - 1)/2;
                sticker.position.y = (y + COLORS[color].adjustment.y) - (cube.dim - 1)/2;
                sticker.position.z = (z + COLORS[color].adjustment.z) - (cube.dim - 1)/2;
                sticker.rotation.x = COLORS[color].rotation[0];
                sticker.rotation.y = COLORS[color].rotation[1];
                sticker.rotation.z = COLORS[color].rotation[2];
                sticker["colorIndex"] = COLORS[color].index;
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
        var faces = ['U', 'D', 'L', 'R', 'B', 'F'];
        var prevRoll = -1;
        var nextRoll = -1;
        for (var i = 0; i < turnCount; ++i) {
            while (prevRoll === nextRoll) {
                nextRoll = Math.floor(Math.random() * 6);
            }
            prevRoll = nextRoll;
            var turn = turns[nextRoll];
            var depth = Math.floor(Math.random() * (this.dim - 1)) + 1;
            var direction = [-1, 1][Math.floor(Math.random() * 2)];
            var face = faces[nextRoll];
            var move = {frame: 1, turn: turn, depth: depth, direction: direction, face: face};
            var time = new Date();
            currentSolve.moves.push({move: move, time: time});
            cube.animationQueue.push(move);
        }    
    },
    isSolved: function () {
        var faces = [[], [], [], [], [], []];
        for (var i = 0; i < cube.stickers.length; ++i) {
            var sticker = cube.stickers[i];
            var xPosition = Math.round(sticker.position.x * 10)/10;
            var yPosition = Math.round(sticker.position.y * 10)/10;
            var zPosition = Math.round(sticker.position.z * 10)/10;
            var colorIndex = sticker.colorIndex;
            var bound = cube.dim / 2;
            if (xPosition == -1 * bound) {
                faces[0].push(colorIndex);
            } else if (xPosition == bound) {
                faces[1].push(colorIndex); 
            } else if (yPosition == -1 * bound) {
                faces[2].push(colorIndex); 
            } else if (yPosition == bound) {
                faces[3].push(colorIndex); 
            } else if (zPosition == -1 * bound) {
                faces[4].push(colorIndex); 
            } else if (zPosition == bound) {
                faces[5].push(colorIndex); 
            }
        
        }
        function isUniform(lst) {
            if (lst.length != cube.dim * cube.dim) {
                return false;
            }
            var val = lst[0];
            for (var i = 1; i < lst.length; ++i) {
                if (lst[i] != val) {
                    return false;
                }
            }
            return true;
        }
        for (var i = 0; i < 6; ++i) {
            if (!isUniform(faces[i])) {
                return false;
            }
        } 
        solves.push(currentSolve);
        return true;
    }
};

var solve = function (n) {
    this.dim = n;
    this.moves = [];
}

function replay(n) {
    replaying = true;
    $('#game-info').text('Replay').css('color', 'red');
    var solve = solves[n];
    var moves = solve.moves;
    var earliestTime = moves[0].time;
    var replayMoves = function (moves, prevTime) {
        if (moves.length == 0) {
            $('#game-info').text('Press space to scramble.').css('color', 'white');
            replaying = false;
            return;
        }
        moves[0].move.frame = 1;
        cube.animationQueue.push(moves[0].move);
        var delay = moves[0].time - prevTime;
        setTimeout(function () {
            replayMoves(moves.slice(1), moves[0].time);
        }, delay);

    }
    replayMoves(moves, 0);
}

window.onkeydown = function (event) {
    if (scrambling || replaying) {
        return;
    }
    var turn, depth, direction, face;
    switch (event.keyCode) {
        case charCodes.T:
        case charCodes.Y:
            turn = TURNS.LEFT;
            frame = 1;
            depth = cube.dim;
            direction = 1;
            face = 'L';
            break;
        case charCodes.P:
            turn = TURNS.FRONT;
            depth = cube.dim;
            direction = -1;
            face = 'F';
            break;
        case charCodes.Q:
            turn = TURNS.BACK;
            depth = cube.dim;
            direction = 1;
            face = 'B';
            break;
        case charCodes.B:
        case charCodes.N:
            turn = TURNS.RIGHT;
            depth = cube.dim;
            direction = -1;
            face = 'R';
            break;
        case charCodes.A:
            turn = TURNS.UP;
            depth = cube.dim;
            direction = -1;
            face = 'U';
            break;
        case charCodes.SEMI:
        case charCodes.SEMI_2:
            turn = TURNS.DOWN;
            depth = cube.dim;
            direction = 1;
            face = 'D';
            break;
        case charCodes.E:
            turn = TURNS.LEFT
            depth = 1;
            direction = 1;
            face = 'L';
            break;
        case charCodes.D:
            turn = TURNS.LEFT;
            depth = 1;
            direction = -1;
            face = 'L';
            break;
        case charCodes.I:
            turn = TURNS.RIGHT;
            depth = 1;
            direction = 1;
            face = 'R';
            break;
        case charCodes.K:
            turn = TURNS.RIGHT;
            depth = 1;
            direction = -1;
            face = 'R';
            break;
        case charCodes.J:
            turn = TURNS.UP;
            depth = 1;
            direction = 1;
            face = 'U';
            break;
        case charCodes.F:
            turn = TURNS.UP;
            depth = 1;
            direction = -1;
            face = 'U';
            break;
        case charCodes.G:
            turn = TURNS.FRONT;
            depth = 1;
            direction = 1;
            face = 'F';
            break;
        case charCodes.H:
            turn = TURNS.FRONT;
            depth = 1;
            direction = -1;
            face = 'F';
            break;
        case charCodes.S:
            turn = TURNS.DOWN;
            depth = 1;
            direction = -1;
            face = 'D';
            break;
        case charCodes.L:
            turn = TURNS.DOWN;
            depth = 1;
            direction = 1;
            face = 'D';
            break;
        case charCodes.W:
            turn = TURNS.BACK;
            depth = 1;
            direction = 1;
            face = 'B';
            break;
        case charCodes.O:
            turn = TURNS.BACK;
            depth = 1;
            direction = -1;
            face = 'B';
            break;
        case charCodes.U:
            turn = TURNS.RIGHT;
            depth = 2;
            direction = 1;
            face = 'R';
            break;
        case charCodes.M:
            turn = TURNS.RIGHT;
            depth = 2;
            direction = -1;
            face = 'R';
            break;
        case charCodes.R:
            turn = TURNS.LEFT;
            depth = 2;
            direction = 1;
            face = 'L';
            break;
        case charCodes.V:
            turn = TURNS.LEFT;
            depth = 2;
            direction = -1;
            face = 'L';
            break;
        case charCodes.SPACE:
            if (playing || scrambling || waiting) {
                return;
            }
            scrambling = true;
            cube.scramble();
            $("#game-info").text("");
            return;
        case charCodes.ESCAPE:
            playing = false;
            waiting = false;
            initCanvas(cube.dim);
        default:
            return;
    }
    if (!playing && depth != cube.dim) {
        return;
    }
    var move = {frame: 1, turn: turn, depth: depth, direction: direction, face: face};
    var time = new Date(); 
    currentSolve.moves.push({move: move, time: time});
    cube.animationQueue.push(move);
}

function runTimer() {
    if (!playing) {
        $("#game-info").text("Press space to scramble.").css('color', 'white');
        return;
    }
    var currentSeconds = (Math.floor((new Date() - startTime) / 10) / 100).toFixed(2) + '';
    $("#game-info").text(currentSeconds);
    setTimeout(runTimer, 10);
}

function countDown(t) {
    if (!waiting) {
        $("#game-info").text("").css('color', 'white');
        return;
    }
    if (t == 0) {
        waiting = false;
        playing = true;
        startTime = new Date();
        $("#game-info").text("").css('color', 'white');
        runTimer();
        return;
    }
    $("#game-info").text(String(t));
    setTimeout(function () { countDown(t-1) }, 1000);
}

$(document).ready(function () {
    $("td").click(function (x) {
        var dim = parseInt(x.target.attributes.name.value);
        if (cube.dim == dim) {
            return;
        }
        if (activeRotations.length != 0) {
            return;
        }
        playing = false;
        waiting = false;
        scrambling = false;
        resetCanvas = true;
        initCanvas(dim)
        currentSolve = new solve(dim);
    });
    initCanvas(3);
    currentSolve = new solve(3);
    render(renderer, scene, camera);
});

var activeRotations = [];

function render() {
    renderer.render(scene, camera);
    requestAnimationFrame(render);

    // collect rotations
    if (cube.animationQueue.length > 0) {
        if (activeRotations.length == 0) {
            activeRotations.push(cube.animationQueue[0]);
            cube.animationQueue.shift();
            if (cube.animationQueue.length > 0) {
                if (OPPOSITES[cube.animationQueue[0].face].indexOf(activeRotations[0].face) >= 0) {
                    activeRotations.push(cube.animationQueue[0]);
                    cube.animationQueue.shift();
                } 
            }
        } else if (activeRotations.length == 1) {
            if (OPPOSITES[cube.animationQueue[0].face].indexOf(activeRotations[0].face) >= 0) {
                activeRotations.push(cube.animationQueue[0]);
                cube.animationQueue.shift();
            }
        }
    } else if (scrambling) {
        scrambling = false;
        waiting = true;
        $("#game-info").css('color', 'red');
        countDown(INSPECTION_TIME);
    }

    // render rotations
    if (activeRotations.length > 0) {
        for (var i = 0; i < activeRotations.length; ++i) {
            cube.rotate(activeRotations[i]);
            ++activeRotations[i].frame;
        }
        var prevLength = activeRotations.length;
        activeRotations = activeRotations.filter(function (x) { 
            return x.frame <= ROTATION_FRAMES; 
        });
        // check if solved
        if (prevLength > activeRotations.length && playing && cube.isSolved()) {
            playing = false;
            var solveTime = $("#game-info").text();
            var solveIndex = solves.length - 1;
            var solveClass = 'solve-' + solveIndex;
            var solveClassSelector = '.' + solveClass;
            var html = '<tr><td class="' + solveClass + '">' + solveTime + '</td></tr>';
            $("#solve-times").find('tbody').append(html);
            $(solveClassSelector).click(function () { replay(solveIndex); });
            $(solveClassSelector).hover(function () {
                $(this).text("Replay");      
            }, function () {
                $(this).text('' + solveTime); 
            });
        }
    }
}

function initCanvas(n) {
    $("canvas").remove();
    scene = new THREE.Scene();
    renderer = new THREE.WebGLRenderer();
    
    // initialize DOM elements
    var cubeContainerHeight = document.getElementById('cube-container').clientHeight;
    var cubeContainerWidth = document.getElementById('cube-container').clientWidth;
    cubeWidth = 400;
    cubeDiv = document.getElementById('cube');
    cubeDiv.style.height = cubeWidth + 'px';
    cubeDiv.style.width = cubeWidth + 'px';
    cubeDiv.style.bottom = (cubeContainerHeight - cubeWidth)/2 + "px";
    cubeDiv.style.left = (cubeContainerWidth - cubeWidth)/2 + "px";
    renderer.setSize(cubeWidth, cubeWidth);

    // initialize cube
    cube.init(scene, n);
    
    camera = new THREE.PerspectiveCamera(60, .5, 1, 1000);
    camera.position.z = cube.dim * CUBE_DISTANCE;
    camera.position.y = cube.dim * CUBE_DISTANCE;
    camera.lookAt({x: 0, y: 0, z: 0});
    camera.lookAt({x: 0, y: cube.dim / 2, z: -cube.dim});
    cubeDiv.appendChild(renderer.domElement);
    renderer.domElement.height = cubeWidth;
    $("#game-info").text("Press space to scramble.");

}
