// --- State Variables ---
let dataArray = [];
let isRunning = false;
let isSorted = false;
let timer = null;
let speed = 1000;

// Algorithm pointers
let i = 0; // Outer loop
let j = 0; // Inner loop
let n = 0;
let state = 'COMPARE'; // States: COMPARE, SWAP_ANIM, CLEANUP

// Visual Constants
// Need to match CSS width + gap
const BAR_WIDTH = 50; 
const GAP_WIDTH = 10;
const TOTAL_WIDTH = BAR_WIDTH + GAP_WIDTH;

// DOM
const container = document.getElementById('arrayContainer');
const logBox = document.getElementById('logBox');
const speedInput = document.getElementById('speedRange');
const speedVal = document.getElementById('speedVal');

// --- Init ---
window.onload = () => parseAndRender();

speedInput.addEventListener('input', (e) => {
    speed = parseInt(e.target.value);
    speedVal.innerText = (speed/1000).toFixed(1) + "s";
    updateTransitionSpeed();
    if(isRunning && !isSorted) {
        clearInterval(timer);
        timer = setInterval(stepLogic, speed);
    }
});

function updateTransitionSpeed() {
    // Animation duration is roughly 60% of the full step cycle
    const animTime = (speed * 0.6) / 1000;
    const bars = document.querySelectorAll('.array-bar');
    bars.forEach(b => {
        b.style.transition = `transform ${animTime}s ease-in-out, background-color 0.2s`;
    });
}

// --- 1. Parse & Render ---
function parseAndRender(reset = true) {
    if(reset) {
        pauseSort();
        isSorted = false;
        i = 0;
        j = 0;
        state = 'COMPARE';
    }

    const rawData = document.getElementById('arrayInput').value;
    dataArray = rawData.split(',').map(item => {
        let val = item.trim();
        return isNaN(val) ? val : parseFloat(val);
    }).filter(item => item !== "");
    n = dataArray.length;
    
    renderDOMClean(); // Initial draw

    if(reset) logBox.innerText = "Status: Data loaded. Ready.";
}

// Helper to draw the array clean (no transforms)
function renderDOMClean() {
    container.innerHTML = '';
    let maxVal = Math.max(...dataArray.filter(v => typeof v === 'number'), 100);

    dataArray.forEach((val, index) => {
        const bar = document.createElement('div');
        bar.className = 'array-bar';
        bar.id = `bar-${index}`;
        
        // Height
        let hPercent = 50;
        if(typeof val === 'number') {
            hPercent = (val / maxVal) * 100;
            if(hPercent < 15) hPercent = 15;
        }
        bar.style.height = `${hPercent}%`;

        // Check if sorted
        // In Bubble Sort, elements from (n-i) to end are sorted
        if (i > 0 && index >= n - i) {
            bar.classList.add('sorted');
        }

        const label = document.createElement('span');
        label.innerText = val;
        bar.appendChild(label);
        container.appendChild(bar);
    });
    updateTransitionSpeed();
}

document.getElementById('arrayInput').addEventListener('change', () => parseAndRender(true));

// --- 2. Controls ---
function initSort() {
    if (isRunning) return;
    if (isSorted) { resetVisualization(); return; }
    isRunning = true;
    timer = setInterval(stepLogic, speed);
}

function pauseSort() {
    isRunning = false;
    clearInterval(timer);
}

// --- 3. Step Logic ---
function stepLogic() {
    // Outer loop check
    if (i >= n - 1) {
        finishSort();
        return;
    }

    const bar1 = document.getElementById(`bar-${j}`);
    const bar2 = document.getElementById(`bar-${j+1}`);

    // --- STATE: COMPARE ---
    if (state === 'COMPARE') {
        // Highlight
        bar1.classList.add('compare');
        bar2.classList.add('compare');

        let val1 = dataArray[j];
        let val2 = dataArray[j+1];

        logBox.innerHTML = `Comparing [${j}] and [${j+1}]: <b>${val1}</b> vs <b>${val2}</b>`;

        // Check Swap
        let shouldSwap = (typeof val1==='number' && typeof val2==='number') 
                         ? val1 > val2 
                         : String(val1).localeCompare(String(val2)) > 0;

        if (shouldSwap) {
            state = 'SWAP_ANIM';
            // We wait for next tick to animate so user sees the yellow compare state briefly?
            // Or we can transition immediately. Let's wait one tick usually, 
            // but for smooth flow, let's trigger animation setup in next interval cycle
            // OR do it now if we want "Compare then Swap" in discrete steps.
            // Let's do: Yellow shows up now. Next tick -> Red + Move.
        } else {
            // No swap needed, move to next index immediately next tick
            state = 'NEXT_INDEX'; 
        }
    }

    // --- STATE: SWAP ANIMATION ---
    else if (state === 'SWAP_ANIM') {
        // Change color to swap
        bar1.classList.remove('compare');
        bar2.classList.remove('compare');
        bar1.classList.add('swap');
        bar2.classList.add('swap');

        // ANIMATION: Slide them
        // Bar1 (Left) moves Right (+)
        // Bar2 (Right) moves Left (-)
        bar1.style.transform = `translateX(${TOTAL_WIDTH}px)`;
        bar2.style.transform = `translateX(-${TOTAL_WIDTH}px)`;

        logBox.innerHTML += `<br>Swapping...`;
        
        state = 'CLEANUP'; // Next tick, we finalize data
    }

    // --- STATE: CLEANUP / FINALIZE SWAP ---
    else if (state === 'CLEANUP') {
        // Actually swap data
        let temp = dataArray[j];
        dataArray[j] = dataArray[j+1];
        dataArray[j+1] = temp;

        // Re-render clean to reset transforms
        renderDOMClean();

        // Move counters
        j++;
        checkLoopBounds();
        
        state = 'COMPARE';
    }

    // --- STATE: NEXT_INDEX (No Swap) ---
    else if (state === 'NEXT_INDEX') {
        // Just cleanup colors from compare
        bar1.classList.remove('compare');
        bar2.classList.remove('compare');
        
        j++;
        checkLoopBounds();
        
        state = 'COMPARE';
    }
}

// Helper to handle j resetting and i incrementing
function checkLoopBounds() {
    if (j >= n - i - 1) {
        // Inner loop finished
        // Mark the last element checked as sorted
        document.getElementById(`bar-${n - i - 1}`).classList.add('sorted');
        
        j = 0;
        i++;
        
        // If only 1 element left (i = n-1), mark it sorted too
        if(i >= n - 1) {
             document.getElementById(`bar-0`).classList.add('sorted');
        }
    }
}

function finishSort() {
    pauseSort();
    renderDOMClean();
    // Mark all sorted
    const bars = document.querySelectorAll('.array-bar');
    bars.forEach(b => b.classList.add('sorted'));
    logBox.innerText = "Status: Sorting Complete!";
    isSorted = true;
}

// --- Controls & Tabs ---
function stepForward() {
    pauseSort();
    if(isSorted) return;
    stepLogic();
}

function resetVisualization() {
    pauseSort();
    parseAndRender(true);
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