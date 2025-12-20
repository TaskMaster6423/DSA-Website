// --- State Variables ---
let dataArray = [];
let isRunning = false;
let isSorted = false;
let timer = null;
let speed = 1000;

// Algorithm State
let i = 1; 
let j = 0;
let keyVal = null;
let state = 'SELECT'; // SELECT, COMPARE, SHIFT, PLACE, CLEANUP

// Visual Constants
const BAR_WIDTH = 50; 
const BAR_GAP = 10;
const TOTAL_ITEM_WIDTH = BAR_WIDTH + BAR_GAP;

// DOM Elements
const container = document.getElementById('arrayContainer');
const logBox = document.getElementById('logBox');
const speedInput = document.getElementById('speedRange');
const speedVal = document.getElementById('speedVal');

// --- Init ---
window.onload = () => parseAndRender();

speedInput.addEventListener('input', (e) => {
    speed = parseInt(e.target.value);
    speedVal.innerText = (speed/1000).toFixed(1) + "s";
    // Sync CSS transition speed to be slightly faster than the step interval
    // so animations finish before next step.
    updateTransitionSpeed();
    
    if(isRunning && !isSorted) {
        clearInterval(timer);
        timer = setInterval(stepLogic, speed);
    }
});

function updateTransitionSpeed() {
    const bars = document.querySelectorAll('.array-bar');
    // Animation takes 60% of the step time
    const animTime = (speed * 0.6) / 1000; 
    bars.forEach(b => {
        b.style.transition = `transform ${animTime}s ease-in-out, background-color 0.2s`;
    });
}

// --- 1. Parse & Render ---
function parseAndRender(reset = true) {
    if(reset) {
        pauseSort();
        isSorted = false;
        i = 1;
        j = 0;
        state = 'SELECT';
    }

    const rawData = document.getElementById('arrayInput').value;
    dataArray = rawData.split(',').map(item => {
        let val = item.trim();
        return isNaN(val) ? val : parseFloat(val);
    }).filter(item => item !== "");
    
    container.innerHTML = '';
    
    let maxVal = Math.max(...dataArray.filter(n => typeof n === 'number'), 100);

    dataArray.forEach((val, index) => {
        const bar = document.createElement('div');
        bar.className = 'array-bar';
        bar.id = `bar-${index}`;
        bar.style.height = typeof val === 'number' ? `${(val/maxVal)*100}%` : '50%';
        if(typeof val === 'number' && bar.style.height < '15%') bar.style.height = '15%';
        
        // Initial Sorted State (Index 0 is trivially sorted)
        if(index === 0 && dataArray.length > 0) bar.classList.add('sorted');
        
        const label = document.createElement('span');
        label.innerText = val;
        bar.appendChild(label);
        container.appendChild(bar);
    });

    updateTransitionSpeed();
    if(reset) logBox.innerText = "Status: Ready.";
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

// --- 3. Animation Logic (The Core) ---
function stepLogic() {
    if (i >= dataArray.length && state === 'SELECT') {
        finishSort();
        return;
    }

    const keyBar = document.getElementById(`bar-${i}`);
    
    // --- STATE: SELECT ---
    if (state === 'SELECT') {
        keyVal = dataArray[i];
        j = i - 1;
        
        // Lift the Key
        keyBar.classList.add('is-key');
        keyBar.style.transform = `translateY(-60px)`; // Move UP
        
        logBox.innerHTML = `Picked Key <b>${keyVal}</b>. Looking for correct spot...`;
        state = 'COMPARE';
    }

    // --- STATE: COMPARE ---
    else if (state === 'COMPARE') {
        // Find comparison target
        if (j >= 0) {
            const compareBar = document.getElementById(`bar-${j}`);
            const compareVal = dataArray[j];
            
            logBox.innerHTML = `Comparing Key <b>${keyVal}</b> vs <b>${compareVal}</b>...`;

            // Logic Check
            let shouldShift = (typeof keyVal==='number' && typeof compareVal==='number') 
                              ? compareVal > keyVal 
                              : String(compareVal).localeCompare(String(keyVal)) > 0;

            if (shouldShift) {
                state = 'SHIFT';
            } else {
                state = 'PLACE'; // Found the spot
            }
        } else {
            state = 'PLACE'; // Reached start of array
        }
    }

    // --- STATE: SHIFT ---
    else if (state === 'SHIFT') {
        // Logic: Shift j to j+1
        dataArray[j+1] = dataArray[j];
        
        const barJ = document.getElementById(`bar-${j}`);
        
        // ANIMATION: Slide bar J to the right
        // We calculate movement based on 1 slot width
        barJ.classList.add('shifting');
        barJ.style.transform = `translateX(${TOTAL_ITEM_WIDTH}px)`; 
        
        // Note: We are NOT changing IDs yet. Visually bar-j moves right.
        // Conceptually, bar-j is now occupying the space of j+1.
        
        logBox.innerHTML = `Value <b>${dataArray[j]}</b> is larger. Shifting it right.`;
        
        j--;
        state = 'COMPARE'; 
        // Note: We don't wait here because we rely on the speed interval 
        // to give time for the transition to finish.
    }

    // --- STATE: PLACE ---
    else if (state === 'PLACE') {
        // Logic: Insert Key at j+1
        dataArray[j+1] = keyVal;
        
        // ANIMATION: Move Key from original index 'i' to new index 'j+1'
        // Distance = (Target Index - Original Index) * Slot Width
        const distanceSlots = (j + 1) - i; 
        const pixelMove = distanceSlots * TOTAL_ITEM_WIDTH;
        
        // We keep Y at -60 (lifted) then drop it? 
        // Let's just move it to final X and Y=0 in one go.
        keyBar.style.transform = `translate(${pixelMove}px, 0px)`;
        
        logBox.innerHTML = `Found spot! Dropping Key <b>${keyVal}</b> at index ${j+1}.`;
        
        state = 'CLEANUP'; // Need a step to reset DOM
    }

    // --- STATE: CLEANUP ---
    else if (state === 'CLEANUP') {
        // The animations are messy now (transforms applied).
        // Best practice: Re-render the DOM in the correct sorted order 
        // so all transforms are reset to 0 for the next pass.
        
        // Save which are sorted (0 to i)
        const sortedLimit = i;
        
        // Re-render
        renderDOMClean();
        
        // Re-apply sorted classes
        for(let k=0; k<=sortedLimit; k++) {
            document.getElementById(`bar-${k}`).classList.add('sorted');
        }

        i++;
        state = 'SELECT';
    }
}

// Helper to clean DOM transforms
function renderDOMClean() {
    container.innerHTML = '';
    let maxVal = Math.max(...dataArray.filter(n => typeof n === 'number'), 100);

    dataArray.forEach((val, index) => {
        const bar = document.createElement('div');
        bar.className = 'array-bar';
        bar.id = `bar-${index}`;
        bar.style.height = typeof val === 'number' ? `${(val/maxVal)*100}%` : '50%';
        if(typeof val === 'number' && bar.style.height < '15%') bar.style.height = '15%';
        
        const label = document.createElement('span');
        label.innerText = val;
        bar.appendChild(label);
        container.appendChild(bar);
    });
    // Re-apply transition speed to new elements
    updateTransitionSpeed();
}

function finishSort() {
    pauseSort();
    renderDOMClean(); // Ensure alignment
    const bars = document.querySelectorAll('.array-bar');
    bars.forEach(b => b.classList.add('sorted'));
    logBox.innerText = "Status: Sorting Complete!";
    logBox.style.color = "var(--sorted)";
    isSorted = true;
}

// --- Tab Logic ---
function openTab(lang) {
    document.querySelectorAll('.code-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(lang).classList.add('active');
    
    // Simple index mapping
    const tabs = document.querySelectorAll('.tab-btn');
    if(lang==='c') tabs[0].classList.add('active');
    if(lang==='cpp') tabs[1].classList.add('active');
    if(lang==='java') tabs[2].classList.add('active');
    if(lang==='python') tabs[3].classList.add('active');
}

// Controls
function stepForward() {
    pauseSort();
    if(isSorted) return;
    stepLogic();
}

function resetVisualization() {
    pauseSort();
    parseAndRender(true);
}