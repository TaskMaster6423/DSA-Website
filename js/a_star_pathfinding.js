// --- Configuration ---
const ROWS = 20;
const COLS = 40;
let grid = []; // 2D Array of Node Objects
let startNode = { r: 5, c: 5 };
let endNode = { r: 14, c: 34 };

// --- Mouse Interaction State ---
let isMouseDown = false;
let isDrawingWall = true; // True = drawing, False = erasing

// --- Animation State ---
let animations = [];
let currentStep = 0;
let isRunning = false;
let isFinished = false;
let timer = null;
let speed = 10;

// DOM Elements
const gridContainer = document.getElementById('gridContainer');
const logBox = document.getElementById('logBox');
const speedInput = document.getElementById('speedRange');
const speedVal = document.getElementById('speedVal');

// --- Initialization ---
window.onload = () => {
    initGrid();
};

// Global Mouse Up to stop drawing even if mouse leaves grid
document.addEventListener('mouseup', () => {
    isMouseDown = false;
});

speedInput.addEventListener('input', (e) => {
    speed = parseInt(e.target.value);
    speedVal.innerText = speed + "ms";
    if (isRunning && !isFinished) {
        clearInterval(timer);
        timer = setInterval(animateStep, speed);
    }
});

function initGrid() {
    gridContainer.style.gridTemplateColumns = `repeat(${COLS}, 25px)`;
    gridContainer.innerHTML = '';
    grid = [];

    for (let r = 0; r < ROWS; r++) {
        let row = [];
        for (let c = 0; c < COLS; c++) {
            const node = {
                r, c,
                isWall: false,
                f: Infinity, g: Infinity, h: 0,
                parent: null
            };
            row.push(node);

            // Create DOM Cell
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.id = `cell-${r}-${c}`;
            
            // --- NEW MOUSE EVENTS FOR DRAGGING ---
            cell.addEventListener('mousedown', (e) => handleMouseDown(e, r, c));
            cell.addEventListener('mouseenter', () => handleMouseEnter(r, c));

            if (r === startNode.r && c === startNode.c) cell.classList.add('start');
            if (r === endNode.r && c === endNode.c) cell.classList.add('end');

            gridContainer.appendChild(cell);
        }
        grid.push(row);
    }
}

// --- Drawing Logic ---
function handleMouseDown(e, r, c) {
    if (isRunning) return; // Prevent editing while running
    e.preventDefault(); // Prevent text selection
    
    isMouseDown = true;
    
    // Determine intent: If clicking a wall, we erase. If clicking empty, we draw.
    // However, don't overwrite Start/End
    if ((r === startNode.r && c === startNode.c) || (r === endNode.r && c === endNode.c)) {
        return; 
    }

    const cell = grid[r][c];
    isDrawingWall = !cell.isWall; // If it's a wall, we want to NOT draw walls (erase)
    
    applyWallState(r, c, isDrawingWall);
}

function handleMouseEnter(r, c) {
    if (!isMouseDown || isRunning) return;
    applyWallState(r, c, isDrawingWall);
}

function applyWallState(r, c, state) {
    // Protect Start/End
    if ((r === startNode.r && c === startNode.c) || (r === endNode.r && c === endNode.c)) return;

    const node = grid[r][c];
    const cell = document.getElementById(`cell-${r}-${c}`);
    
    if (state) {
        node.isWall = true;
        cell.classList.add('wall');
    } else {
        node.isWall = false;
        cell.classList.remove('wall');
    }
}

function clearWalls() {
    if (isRunning) return;
    resetGrid();
    for(let r=0; r<ROWS; r++) {
        for(let c=0; c<COLS; c++) {
            grid[r][c].isWall = false;
            document.getElementById(`cell-${r}-${c}`).classList.remove('wall');
        }
    }
}

function generateMaze() {
    clearWalls();
    for(let r=0; r<ROWS; r++) {
        for(let c=0; c<COLS; c++) {
            if(Math.random() < 0.3) {
                 if ((r === startNode.r && c === startNode.c) || (r === endNode.r && c === endNode.c)) continue;
                 grid[r][c].isWall = true;
                 document.getElementById(`cell-${r}-${c}`).classList.add('wall');
            }
        }
    }
}

function resetGrid() {
    pauseSearch();
    isFinished = false;
    currentStep = 0;
    animations = [];
    
    // Reset A* specific data, keep walls
    for(let r=0; r<ROWS; r++) {
        for(let c=0; c<COLS; c++) {
            grid[r][c].f = Infinity;
            grid[r][c].g = Infinity;
            grid[r][c].h = 0;
            grid[r][c].parent = null;
            
            const cell = document.getElementById(`cell-${r}-${c}`);
            cell.classList.remove('open', 'closed', 'path');
        }
    }
    logBox.innerText = "Grid Reset. Ready.";
    logBox.style.color = "var(--text)";
}

// --- A* Algorithm ---
function runAStar() {
    let openSet = [];
    let closedSet = new Set();
    
    let start = grid[startNode.r][startNode.c];
    let end = grid[endNode.r][endNode.c];
    
    start.g = 0;
    start.f = heuristic(start, end);
    openSet.push(start);
    
    while (openSet.length > 0) {
        // Simple priority queue logic
        let lowestIndex = 0;
        for(let i=1; i<openSet.length; i++) {
            if (openSet[i].f < openSet[lowestIndex].f) lowestIndex = i;
        }
        let current = openSet[lowestIndex];
        
        // Remove from Open
        openSet.splice(lowestIndex, 1);
        
        // Animation: Closed
        if(current !== start && current !== end) {
            animations.push({ type: 'CLOSED', r: current.r, c: current.c });
        }

        // Check Goal
        if (current === end) {
            let temp = current;
            let path = [];
            while(temp.parent) {
                path.push(temp.parent);
                temp = temp.parent;
            }
            // Reverse for animation
            for(let i=path.length-1; i>=0; i--) {
                if(path[i] !== start) {
                    animations.push({ type: 'PATH', r: path[i].r, c: path[i].c });
                }
            }
            animations.push({ type: 'FINISHED', found: true });
            return;
        }
        
        closedSet.add(current);
        
        let neighbors = getNeighbors(current);
        for(let neighbor of neighbors) {
            if (closedSet.has(neighbor) || neighbor.isWall) continue;
            
            let tempG = current.g + 1;
            let newPath = false;
            
            if (openSet.includes(neighbor)) {
                if (tempG < neighbor.g) {
                    neighbor.g = tempG;
                    newPath = true;
                }
            } else {
                neighbor.g = tempG;
                newPath = true;
                openSet.push(neighbor);
                if(neighbor !== end) {
                    animations.push({ type: 'OPEN', r: neighbor.r, c: neighbor.c });
                }
            }
            
            if (newPath) {
                neighbor.h = heuristic(neighbor, end);
                neighbor.f = neighbor.g + neighbor.h;
                neighbor.parent = current;
            }
        }
    }
    
    animations.push({ type: 'FINISHED', found: false });
}

function getNeighbors(node) {
    let res = [];
    let {r, c} = node;
    if(r > 0) res.push(grid[r-1][c]);
    if(r < ROWS-1) res.push(grid[r+1][c]);
    if(c > 0) res.push(grid[r][c-1]);
    if(c < COLS-1) res.push(grid[r][c+1]);
    return res;
}

function heuristic(a, b) {
    return Math.abs(a.r - b.r) + Math.abs(a.c - b.c);
}

// --- Animation Loop ---
function animateStep() {
    if (currentStep >= animations.length) {
        pauseSearch();
        return;
    }
    
    const action = animations[currentStep];
    const cell = document.getElementById(`cell-${action.r}-${action.c}`);
    
    if (action.type === 'OPEN') {
        cell.classList.remove('closed');
        cell.classList.add('open');
    }
    else if (action.type === 'CLOSED') {
        cell.classList.remove('open');
        cell.classList.add('closed');
    }
    else if (action.type === 'PATH') {
        cell.classList.remove('open', 'closed');
        cell.classList.add('path');
    }
    else if (action.type === 'FINISHED') {
        isFinished = true;
        pauseSearch();
        logBox.innerText = action.found ? "Path Found!" : "No Path Possible.";
        logBox.style.color = action.found ? "var(--start)" : "var(--end)";
        return;
    }
    
    currentStep++;
}

// --- Controls ---
function initSearch() {
    if (isRunning) return;
    if (isFinished) { resetGrid(); } 
    
    if (currentStep === 0) {
        animations = [];
        runAStar();
    }
    
    isRunning = true;
    timer = setInterval(animateStep, speed);
    logBox.innerText = "Searching...";
}

function pauseSearch() {
    isRunning = false;
    clearInterval(timer);
}

function stepForward() {
    pauseSearch();
    if (isFinished) return;
    if (currentStep === 0) {
        animations = [];
        runAStar();
    }
    animateStep();
}

function openTab(lang) {
    document.querySelectorAll('.code-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(lang).classList.add('active');
    const tabs = document.querySelectorAll('.tab-btn');
    if(lang==='c') tabs[0].classList.add('active');
    if(lang==='cpp') tabs[1].classList.add('active');
    if(lang==='java') tabs[2].classList.add('active');
    if(lang==='python') tabs[3].classList.add('active');
}