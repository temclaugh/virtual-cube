var playing = false;
var scrambling = false;


var PI = Math.PI;
var STICKER_SIZE = .85;
var ROTATION_FRAMES = 6;
var CUBE_DISTANCE = 1.8;

var COLORS = {
    "white": {index: 0, value: 0xffffff, rotation: [0, PI/2, 0], adjustment: {x: -.5, y: 0, z: 0}},
    "yellow": {index: 1, value: 0xffff00, rotation: [0, PI/2, 0], adjustment: {x: .5, y: 0, z: 0}},
    "green": {index: 2, value: 0x00ff00, rotation: [PI/2, 0, 0], adjustment: {x: 0, y: -.5, z: 0}},
    "blue": {index: 3, value: 0x0000ff, rotation: [PI/2, 0, 0], adjustment: {x: 0, y: .5, z: 0}},
    "orange": {index: 4, value: 0xff8c00, rotation: [0, 0, PI/2], adjustment: {x: 0, y: 0, z: -.5}},
    "red": {index: 5, value: 0xff0000, rotation: [0, 0, PI/2], adjustment: {x: 0, y: 0, z: .5}},
}

var TURNS = {
    UP: new THREE.Vector3(0, 1, 0),
    DOWN: new THREE.Vector3(0, 1, 0),
    LEFT: new THREE.Vector3(1, 0, 0),
    RIGHT: new THREE.Vector3(1, 0, 0),
    BACK: new THREE.Vector3(0, 0, -1),
    FRONT: new THREE.Vector3(0, 0, -1),
}

var charCodes = {
    E: 69, // left
    D: 68, // left
    I: 73, // right
    K: 75, // right
    F: 70, // up
    J: 74, // up
    G: 71, // front
    H: 72, // front
    S: 83, // down
    L: 76, // down
    W: 87, // back
    O: 79, // back
    T: 84,
    Y: 89,
    P: 80,
    Q: 81,
    B: 66,
    N: 78,
    A: 65,
    U: 85,
    M: 77,
    R: 82,
    V: 86,
    SEMI: 59,
    SEMI_2: 186,
    SPACE: 32,
}

var OPPOSITES = {
    'L': ['L', 'R'],
    'R': ['L', 'R'],
    'U': ['U', 'D'],
    'D': ['U', 'D'],
    'F': ['F', 'B'],
    'B': ['F', 'B'],
}
