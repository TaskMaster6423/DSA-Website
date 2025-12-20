// --- State Variables ---
let dataArray = [];
let isRunning = false;
let isSorted = false;
let timer = null;
let speed = 1000;

// Algorithm pointers
let i = 0; // Current sorted boundary
let j = 0; // Scanner
let minIndex = 0; // Index of smallest value found
let state = 'INIT_PASS'; // States: INIT_PASS, SCAN, SWAP_CHECK, SWAP_ANIM, CLEANUP

// Visual Constants
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
    // Transition matches speed
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
        minIndex = 0;
        state = 'INIT_PASS';
    }

    const rawData = document.getElementById('arrayInput').value;
    dataArray = rawData.split(',').map(item => {
        let val = item.trim();
        return isNaN(val) ? val : parseFloat(val);
    }).filter(item => item !== "");
    
    renderDOMClean();

    if(reset) logBox.innerText = "Status: Data loaded. Ready.";
}

function renderDOMClean() {
    container.innerHTML = '';
    let maxVal = Math.max(...dataArray.filter(v => typeof v === 'number'), 100);

    dataArray.forEach((val, index) => {
        const bar = document.createElement('div');
        bar.className = 'array-bar';
        bar.id = `bar-${index}`;
        
        let hPercent = 50;
        if(typeof val === 'number') {
            hPercent = (val / maxVal) * 100;
            if(hPercent < 15) hPercent = 15;
        }
        bar.style.height = `${hPercent}%`;

        // Mark sorted
        if (index < i) {
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
    if (i >= dataArray.length - 1) {
        finishSort();
        return;
    }

    // --- STATE: INIT_PASS (Start looking for min) ---
    if (state === 'INIT_PASS') {
        minIndex = i;
        j = i + 1;
        
        // Highlight current minimum candidate (initially i)
        document.getElementById(`bar-${minIndex}`).classList.add('min-val');
        
        logBox.innerHTML = `Pass ${i+1}: Current min set to <b>${dataArray[minIndex]}</b> at index ${minIndex}. Scanning rest...`;
        
        state = 'SCAN';
    }

    // --- STATE: SCAN (Loop through j) ---
    else if (state === 'SCAN') {
        if (j < dataArray.length) {
            const scanBar = document.getElementById(`bar-${j}`);
            
            // Clean prev scan highlight
            if(j > i + 1) document.getElementById(`bar-${j-1}`).classList.remove('scanning');
            
            scanBar.classList.add('scanning');

            let valJ = dataArray[j];
            let valMin = dataArray[minIndex];

            logBox.innerHTML = `Scanning index ${j} (${valJ})... `;

            // Compare
            let isSmaller = (typeof valJ==='number' && typeof valMin==='number') 
                            ? valJ < valMin 
                            : String(valJ).localeCompare(String(valMin)) < 0;

            if (isSmaller) {
                logBox.innerHTML += `<b>${valJ}</b> is smaller! Updating min.`;
                
                // Update Min Visuals
                document.getElementById(`bar-${minIndex}`).classList.remove('min-val'); // Remove old min
                minIndex = j;
                document.getElementById(`bar-${minIndex}`).classList.add('min-val');    // New min
            }

            j++; // Move to next
        } else {
            // End of loop
            // Remove last scan highlight
            document.getElementById(`bar-${dataArray.length-1}`).classList.remove('scanning');
            state = 'SWAP_CHECK';
        }
    }

    // --- STATE: SWAP CHECK (Should we swap?) ---
    else if (state === 'SWAP_CHECK') {
        if (minIndex !== i) {
            logBox.innerHTML = `Found smallest: <b>${dataArray[minIndex]}</b>. Swapping with index ${i}.`;
            state = 'SWAP_ANIM';
        } else {
            logBox.innerHTML = `Position ${i} is already the smallest. No swap needed.`;
            state = 'CLEANUP'; // Just mark sorted
        }
    }

    // --- STATE: SWAP ANIMATION ---
    else if (state === 'SWAP_ANIM') {
        const barI = document.getElementById(`bar-${i}`);
        const barMin = document.getElementById(`bar-${minIndex}`);

        // Distance calc
        const dist = (minIndex - i) * TOTAL_WIDTH;

        // Animate
        // I moves Right (+)
        // Min moves Left (-)
        barI.style.transform = `translateX(${dist}px)`;
        barMin.style.transform = `translateX(-${dist}px)`;
        
        state = 'CLEANUP';
    }

    // --- STATE: CLEANUP / FINALIZE ---
    else if (state === 'CLEANUP') {
        if (minIndex !== i) {
            // Swap Data
            let temp = dataArray[i];
            dataArray[i] = dataArray[minIndex];
            dataArray[minIndex] = temp;
        }

        // Increment Outer Loop
        i++;
        
        // Re-render clean
        renderDOMClean();

        // Check if done instantly?
        if (i >= dataArray.length - 1) {
            // If we are at the last element, it's sorted by default
            finishSort();
            return;
        }
        
        state = 'INIT_PASS';
    }
}

function finishSort() {
    pauseSort();
    i = dataArray.length; // Ensure logic knows it's done
    renderDOMClean(); // Will mark all sorted based on i
    
    // Explicitly add sorted class to everything
    const bars = document.querySelectorAll('.array-bar');
    bars.forEach(b => b.classList.add('sorted'));
    
    logBox.innerText = "Status: Selection Sort Complete!";
    isSorted = true;
}

// --- Controls ---
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