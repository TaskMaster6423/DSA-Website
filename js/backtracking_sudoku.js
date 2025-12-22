// --- Base Boards (Templates) ---
const BASE_BOARDS = {
    easy: [
        [5,3,0,0,7,0,0,0,0],
        [6,0,0,1,9,5,0,0,0],
        [0,9,8,0,0,0,0,6,0],
        [8,0,0,0,6,0,0,0,3],
        [4,0,0,8,0,3,0,0,1],
        [7,0,0,0,2,0,0,0,6],
        [0,6,0,0,0,0,2,8,0],
        [0,0,0,4,1,9,0,0,5],
        [0,0,0,0,8,0,0,7,9]
    ],
    medium: [
        [0,0,0,2,6,0,7,0,1],
        [6,8,0,0,7,0,0,9,0],
        [1,9,0,0,0,4,5,0,0],
        [8,2,0,1,0,0,0,4,0],
        [0,0,4,6,0,2,9,0,0],
        [0,5,0,0,0,3,0,2,8],
        [0,0,9,3,0,0,0,7,4],
        [0,4,0,0,5,0,0,3,6],
        [7,0,3,0,1,8,0,0,0]
    ],
    hard: [
        [0,2,0,6,0,8,0,0,0],
        [5,8,0,0,0,9,7,0,0],
        [0,0,0,0,4,0,0,0,0],
        [3,7,0,0,0,0,5,0,0],
        [6,0,0,0,0,0,0,0,4],
        [0,0,8,0,0,0,0,1,3],
        [0,0,0,0,2,0,0,0,0],
        [0,0,9,8,0,0,0,3,6],
        [0,0,0,3,0,6,0,9,0]
    ]
};

// --- State ---
let initialBoard = [];
let currentBoard = [];
let animations = [];
let currentStep = 0;
let isRunning = false;
let isFinished = false;
let timer = null;
let speed = 20;

// DOM
const gridContainer = document.getElementById('sudokuGrid');
const logBox = document.getElementById('logBox');
const speedInput = document.getElementById('speedRange');
const speedVal = document.getElementById('speedVal');
const diffSelect = document.getElementById('diffSelect');

// --- Init ---
window.onload = () => {
    loadNewBoard();
};

speedInput.addEventListener('input', (e) => {
    speed = parseInt(e.target.value);
    speedVal.innerText = speed + "ms";
    if (isRunning && !isFinished) {
        clearInterval(timer);
        timer = setInterval(animateStep, speed);
    }
});

// --- Randomization Logic ---
function loadNewBoard() {
    pauseSearch();
    const diff = diffSelect.value;
    
    // 1. Get Base Template
    let board = JSON.parse(JSON.stringify(BASE_BOARDS[diff]));
    
    // 2. Apply Random Transformations (Preserves Validity)
    board = shuffleNumbers(board);
    board = shuffleRows(board);
    board = shuffleCols(board);
    if(Math.random() > 0.5) board = transpose(board);

    initialBoard = JSON.parse(JSON.stringify(board));
    currentBoard = JSON.parse(JSON.stringify(board));
    
    renderBoard();
    resetState();
    logBox.innerText = `New ${diff} board loaded.`;
}

// 1. Shuffle Numbers (Map 1->9 to random 1->9)
function shuffleNumbers(board) {
    let map = [1,2,3,4,5,6,7,8,9];
    // Fisher-Yates Shuffle
    for (let i = map.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [map[i], map[j]] = [map[j], map[i]];
    }
    // Apply mapping (0 stays 0)
    for(let r=0; r<9; r++) {
        for(let c=0; c<9; c++) {
            if(board[r][c] !== 0) {
                board[r][c] = map[board[r][c] - 1];
            }
        }
    }
    return board;
}

// 2. Shuffle Rows (Only within 3-row bands)
function shuffleRows(board) {
    // Shuffle Band 0 (Rows 0-2)
    shuffleBand(board, 0);
    // Shuffle Band 1 (Rows 3-5)
    shuffleBand(board, 3);
    // Shuffle Band 2 (Rows 6-8)
    shuffleBand(board, 6);
    return board;
}

function shuffleBand(board, startRow) {
    let rows = [0, 1, 2];
    // Shuffle indices
    for (let i = rows.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [rows[i], rows[j]] = [rows[j], rows[i]];
    }
    
    // Create new block
    let newBlock = [];
    newBlock.push([...board[startRow + rows[0]]]);
    newBlock.push([...board[startRow + rows[1]]]);
    newBlock.push([...board[startRow + rows[2]]]);
    
    // Replace
    board[startRow] = newBlock[0];
    board[startRow+1] = newBlock[1];
    board[startRow+2] = newBlock[2];
}

// 3. Shuffle Columns (Only within 3-col bands)
// Easier to transpose -> shuffle rows -> transpose back
function shuffleCols(board) {
    board = transpose(board);
    board = shuffleRows(board);
    return transpose(board);
}

// 4. Transpose (Swap Rows and Cols)
function transpose(board) {
    let newBoard = Array.from({length: 9}, () => Array(9).fill(0));
    for(let r=0; r<9; r++) {
        for(let c=0; c<9; c++) {
            newBoard[c][r] = board[r][c];
        }
    }
    return newBoard;
}

// --- Rendering ---
function renderBoard() {
    gridContainer.innerHTML = '';
    for(let r=0; r<9; r++) {
        for(let c=0; c<9; c++) {
            const val = initialBoard[r][c];
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.id = `cell-${r}-${c}`;
            
            if(val !== 0) {
                cell.innerText = val;
                cell.classList.add('fixed');
            }
            gridContainer.appendChild(cell);
        }
    }
}

function resetBoard() {
    // Just resets state, keeps current random board
    pauseSearch();
    renderBoard(); 
    resetState();
    logBox.innerText = "Board Reset.";
}

function resetState() {
    isFinished = false;
    currentStep = 0;
    animations = [];
}

// --- Backtracking Solver ---
function solve() {
    let boardCopy = JSON.parse(JSON.stringify(initialBoard));
    solveUtil(boardCopy);
}

function solveUtil(grid) {
    let empty = findEmpty(grid);
    if (!empty) {
        animations.push({ type: 'FINISHED', found: true });
        return true;
    }

    let [row, col] = empty;

    for (let num = 1; num <= 9; num++) {
        animations.push({ type: 'TRY', r: row, c: col, val: num });

        if (isValid(grid, row, col, num)) {
            grid[row][col] = num;
            animations.push({ type: 'VALID', r: row, c: col });

            if (solveUtil(grid)) return true;

            grid[row][col] = 0;
            animations.push({ type: 'BACKTRACK', r: row, c: col });
        }
    }
    return false;
}

function findEmpty(grid) {
    for(let r=0; r<9; r++) {
        for(let c=0; c<9; c++) {
            if(grid[r][c] === 0) return [r, c];
        }
    }
    return null;
}

function isValid(grid, row, col, num) {
    for(let x=0; x<9; x++) if(grid[row][x] === num) return false;
    for(let x=0; x<9; x++) if(grid[x][col] === num) return false;
    let startRow = row - row % 3;
    let startCol = col - col % 3;
    for(let i=0; i<3; i++) {
        for(let j=0; j<3; j++) {
            if(grid[i+startRow][j+startCol] === num) return false;
        }
    }
    return true;
}

// --- Animation Loop ---
function animateStep() {
    if (currentStep >= animations.length) {
        pauseSearch();
        return;
    }

    const action = animations[currentStep];
    const cell = document.getElementById(`cell-${action.r}-${action.c}`);

    if (action.type === 'TRY') {
        cell.innerText = action.val;
        cell.classList.remove('safe', 'backtrack');
        cell.classList.add('try');
    }
    else if (action.type === 'VALID') {
        cell.classList.remove('try');
        cell.classList.add('safe');
    }
    else if (action.type === 'BACKTRACK') {
        cell.innerText = '';
        cell.classList.remove('try', 'safe');
        cell.classList.add('backtrack');
    }
    else if (action.type === 'FINISHED') {
        isFinished = true;
        pauseSearch();
        logBox.innerText = "Sudoku Solved!";
        logBox.style.color = "#a6e3a1";
        return;
    }

    currentStep++;
}

// --- Controls ---
function initSearch() {
    if (isRunning) return;
    if (isFinished) resetBoard();
    
    if (currentStep === 0) {
        animations = [];
        solve();
    }
    
    isRunning = true;
    timer = setInterval(animateStep, speed);
    logBox.innerText = "Solving...";
    logBox.style.color = "var(--text)";
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
        solve();
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