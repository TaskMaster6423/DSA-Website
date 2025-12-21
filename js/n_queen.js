// --- Configuration ---
let N = 4;
let board = []; 
let animations = [];
let currentStep = 0;
let isRunning = false;
let isFinished = false;
let timer = null;
let speed = 200;

// DOM Elements
const boardContainer = document.getElementById('boardContainer');
const logBox = document.getElementById('logBox');
const speedInput = document.getElementById('speedRange');
const speedVal = document.getElementById('speedVal');
const sizeInput = document.getElementById('sizeInput');

// --- Initialization ---
window.onload = () => {
    initBoard();
};

// Handle Text Box Input for N
sizeInput.addEventListener('change', (e) => {
    let val = parseInt(e.target.value);
    
    // Safety Clamps
    if (isNaN(val) || val < 4) val = 4;
    if (val > 14) {
        alert("Warning: N > 14 may crash the browser due to high computation.");
        val = 14; 
    }
    
    N = val;
    e.target.value = val; // Reflect corrected value
    resetBoard();
});

speedInput.addEventListener('input', (e) => {
    speed = parseInt(e.target.value);
    speedVal.innerText = speed + "ms";
    if (isRunning && !isFinished) {
        clearInterval(timer);
        timer = setInterval(animateStep, speed);
    }
});

function initBoard() {
    // Dynamic cell size based on N to fit screen
    let cellSize = 60;
    if(N > 8) cellSize = 40;
    if(N > 12) cellSize = 30;

    boardContainer.style.gridTemplateColumns = `repeat(${N}, ${cellSize}px)`;
    boardContainer.innerHTML = '';
    
    // Create logical board filled with 0
    board = Array.from({ length: N }, () => Array(N).fill(0));

    // Create DOM board
    for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
            const cell = document.createElement('div');
            cell.className = `cell ${(r + c) % 2 === 0 ? 'white' : 'black'}`;
            cell.id = `cell-${r}-${c}`;
            cell.style.width = `${cellSize}px`;
            cell.style.height = `${cellSize}px`;
            
            // Adjust font size for queens based on cell size
            cell.style.fontSize = `${cellSize * 0.7}px`;

            const span = document.createElement('span');
            cell.appendChild(span);
            
            boardContainer.appendChild(cell);
        }
    }
}

function resetBoard() {
    pauseSearch();
    isFinished = false;
    currentStep = 0;
    animations = [];
    initBoard();
    logBox.innerText = `Board Reset. Size: ${N}x${N}.`;
    logBox.style.color = "var(--text)";
}

// --- N-Queens Algorithm ---
function runNQueens() {
    let solutionFound = solve(0);
    if (solutionFound) {
        animations.push({ type: 'FINISHED', found: true });
    } else {
        animations.push({ type: 'FINISHED', found: false });
    }
}

function solve(col) {
    if (col >= N) return true;

    for (let i = 0; i < N; i++) {
        animations.push({ type: 'CHECK', r: i, c: col });

        if (isSafe(i, col)) {
            board[i][col] = 1;
            animations.push({ type: 'PLACE', r: i, c: col });

            if (solve(col + 1)) return true;

            board[i][col] = 0;
            animations.push({ type: 'REMOVE', r: i, c: col });
        } else {
            animations.push({ type: 'ATTACK', r: i, c: col });
        }
    }
    return false;
}

function isSafe(row, col) {
    // Check row
    for (let i = 0; i < col; i++) {
        if (board[row][i]) return false;
    }
    // Check upper diagonal
    for (let i = row, j = col; i >= 0 && j >= 0; i--, j--) {
        if (board[i][j]) return false;
    }
    // Check lower diagonal
    for (let i = row, j = col; j >= 0 && i < N; i++, j--) {
        if (board[i][j]) return false;
    }
    return true;
}

// --- Animation Loop ---
function animateStep() {
    if (currentStep >= animations.length) {
        pauseSearch();
        return;
    }
    
    // Efficiency: Only clear highlights if speed is somewhat slow. 
    // At max speed (1ms), clearing DOM constantly is heavy.
    // We clear current highlights from specific classes
    if(speed > 10) clearHighlights();

    const action = animations[currentStep];
    const cell = document.getElementById(`cell-${action.r}-${action.c}`);
    
    // Safety check if user changed size mid-animation
    if(!cell) { pauseSearch(); return; }

    if (action.type === 'CHECK') {
        if(speed > 5) { // Skip visual check at super speeds
            // Manually remove previous 'current' to avoid loop lag
            const prev = document.querySelector('.current');
            if(prev) prev.classList.remove('current');
            cell.classList.add('current');
        }
    }
    else if (action.type === 'PLACE') {
        cell.querySelector('span').innerText = "♛";
        cell.classList.add('queen', 'safe');
        logBox.innerHTML = `Placed at [${action.r}, ${action.c}]`;
    }
    else if (action.type === 'ATTACK') {
        if(speed > 10) {
            cell.classList.add('attack');
            setTimeout(() => cell.classList.remove('attack'), speed * 0.8);
        }
    }
    else if (action.type === 'REMOVE') {
        cell.querySelector('span').innerText = "";
        cell.classList.remove('queen', 'safe');
    }
    else if (action.type === 'FINISHED') {
        isFinished = true;
        pauseSearch();
        clearHighlights(); // Cleanup at end
        if(action.found) {
            logBox.innerText = "Solution Found!";
            logBox.style.color = "#a6e3a1";
        } else {
            logBox.innerText = "No Solution Exists.";
            logBox.style.color = "#f38ba8";
        }
        return;
    }
    
    currentStep++;
}

function clearHighlights() {
    const currents = document.querySelectorAll('.current');
    currents.forEach(c => c.classList.remove('current'));
    
    const attacks = document.querySelectorAll('.attack');
    attacks.forEach(c => c.classList.remove('attack'));
}

// --- Controls ---
function initSearch() {
    if (isRunning) return;
    if (isFinished) { resetBoard(); }
    
    if (currentStep === 0) {
        // Reset board logical state for fresh run
        board = Array.from({ length: N }, () => Array(N).fill(0));
        animations = [];
        runNQueens();
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
        board = Array.from({ length: N }, () => Array(N).fill(0));
        animations = [];
        runNQueens();
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