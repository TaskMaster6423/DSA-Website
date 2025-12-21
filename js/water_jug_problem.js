// --- Configuration ---
let capA, capB, target;
let solutionPath = []; // Array of States {a, b, action}
let currentStep = 0;
let isRunning = false;
let isFinished = false;
let timer = null;
let speed = 1000;

// DOM Elements
const waterA = document.getElementById('waterA');
const waterB = document.getElementById('waterB');
const valA = document.getElementById('valA');
const valB = document.getElementById('valB');
const maxA = document.getElementById('maxA');
const maxB = document.getElementById('maxB');
const actionArrow = document.getElementById('actionArrow');
const logBox = document.getElementById('logBox');
const speedInput = document.getElementById('speedRange');
const speedVal = document.getElementById('speedVal');

// --- Init ---
speedInput.addEventListener('input', (e) => {
    speed = parseInt(e.target.value);
    speedVal.innerText = (speed/1000).toFixed(1) + "s";
    // Adjust CSS transition to match speed
    waterA.style.transition = `height ${speed/1000}s ease-in-out`;
    waterB.style.transition = `height ${speed/1000}s ease-in-out`;
    
    if (isRunning && !isFinished) {
        clearInterval(timer);
        timer = setInterval(animateStep, speed);
    }
});

// --- Solver Logic (BFS) ---
function runSolver() {
    capA = parseInt(document.getElementById('capA').value);
    capB = parseInt(document.getElementById('capB').value);
    target = parseInt(document.getElementById('target').value);

    // Reset Visuals
    maxA.innerText = capA;
    maxB.innerText = capB;
    
    if(target > Math.max(capA, capB)) {
        logBox.innerText = "Target cannot be greater than the largest jug.";
        logBox.style.color = "var(--error)";
        return;
    }
    
    if(target % gcd(capA, capB) !== 0) {
        logBox.innerText = `No solution possible (Target must be divisible by GCD(${capA}, ${capB}) = ${gcd(capA, capB)}).`;
        logBox.style.color = "var(--error)";
        return;
    }

    // BFS
    let queue = [];
    let visited = new Set();
    
    // Initial State
    let initialState = { a: 0, b: 0, path: [] };
    queue.push(initialState);
    visited.add("0,0");

    solutionPath = [];

    while(queue.length > 0) {
        let curr = queue.shift();
        let { a, b, path } = curr;

        if (a === target || b === target) {
            solutionPath = path;
            solutionPath.push({ a, b, action: "Solved!" });
            return true;
        }

        // Generate Next States
        let nextStates = [
            { a: capA, b: b, action: "Fill A" },
            { a: a, b: capB, action: "Fill B" },
            { a: 0, b: b, action: "Empty A" },
            { a: a, b: 0, action: "Empty B" },
            // Pour A -> B
            { 
                a: a - Math.min(a, capB - b), 
                b: b + Math.min(a, capB - b), 
                action: "Pour A -> B" 
            },
            // Pour B -> A
            { 
                a: a + Math.min(b, capA - a), 
                b: b - Math.min(b, capA - a), 
                action: "Pour B -> A" 
            }
        ];

        for(let next of nextStates) {
            let key = `${next.a},${next.b}`;
            if (!visited.has(key)) {
                visited.add(key);
                let newPath = [...path, { a: next.a, b: next.b, action: next.action }];
                queue.push({ a: next.a, b: next.b, path: newPath });
            }
        }
    }
    
    logBox.innerText = "No solution found within search limits.";
    return false;
}

function gcd(a, b) {
    return b === 0 ? a : gcd(b, a % b);
}

// --- Animation ---
function animateStep() {
    if (currentStep >= solutionPath.length) {
        isFinished = true;
        pauseViz();
        logBox.innerText = `Goal Reached! Found ${target}L.`;
        logBox.style.color = "var(--success)";
        return;
    }

    const state = solutionPath[currentStep];
    
    // Update Water Levels (Visual Height %)
    // Max visual height corresponds to Capacity
    // If CapA=4 and current=2, height is 50%? 
    // Usually Jugs are drawn relative to their max capacity size, but for simplicity here
    // we assume the DIV size is fixed, so % fill is (current / capacity).
    
    let pctA = (state.a / capA) * 100;
    let pctB = (state.b / capB) * 100;
    
    waterA.style.height = `${pctA}%`;
    waterB.style.height = `${pctB}%`;
    
    valA.innerText = state.a;
    valB.innerText = state.b;
    
    // Log Action
    logBox.innerText = `Step ${currentStep+1}: ${state.action}`;
    
    // Arrow Logic
    if (state.action.includes("Pour A -> B")) {
        actionArrow.innerText = "➜";
        actionArrow.style.opacity = 1;
    } else if (state.action.includes("Pour B -> A")) {
        actionArrow.innerText = "⬅";
        actionArrow.style.opacity = 1;
    } else {
        actionArrow.style.opacity = 0;
    }

    currentStep++;
}

// --- Controls ---
function initSearch() {
    if (isRunning) return;
    if (isFinished) resetViz();
    
    if (currentStep === 0) {
        if(runSolver()) {
            isRunning = true;
            timer = setInterval(animateStep, speed);
            logBox.innerText = "Solving...";
            logBox.style.color = "var(--text)";
        }
    } else {
        // Resume
        isRunning = true;
        timer = setInterval(animateStep, speed);
    }
}

function pauseViz() {
    isRunning = false;
    clearInterval(timer);
}

function stepForward() {
    pauseViz();
    if(isFinished) return;
    
    if (currentStep === 0) {
        if(!runSolver()) return;
    }
    animateStep();
}

function resetViz() {
    pauseViz();
    currentStep = 0;
    isFinished = false;
    solutionPath = [];
    waterA.style.height = '0%';
    waterB.style.height = '0%';
    valA.innerText = '0';
    valB.innerText = '0';
    actionArrow.style.opacity = 0;
    logBox.innerText = "Reset. Ready to solve.";
    logBox.style.color = "var(--text)";
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