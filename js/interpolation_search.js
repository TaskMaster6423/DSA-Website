// --- State Variables ---
let dataArray = [];
let target = 0;
let isRunning = false;
let isFound = false;
let timer = null;
let speed = 1500; // Slower default because logs are heavy

// Pointers
let low = 0;
let high = 0;
let pos = -1; // Probe position

// --- DOM Elements ---
const container = document.getElementById('arrayContainer');
const logBox = document.getElementById('logBox');
const speedInput = document.getElementById('speedRange');
const speedVal = document.getElementById('speedVal');

// --- Initialization ---
window.onload = () => {
    parseAndRenderData(false);
};

// --- Speed Control ---
speedInput.addEventListener('input', (e) => {
    speed = parseInt(e.target.value);
    speedVal.innerText = (speed/1000).toFixed(1) + "s delay";
    if(isRunning && !isFound) {
        clearInterval(timer);
        timer = setInterval(stepLogic, speed);
    }
});

// --- 1. Parse Input, SORT, Render ---
function parseAndRenderData(resetPointers = true) {
    if(resetPointers) {
       pauseSearch();
       isFound = false;
    }
    
    const rawData = document.getElementById('arrayInput').value;
    // Interpolation Search REQUIRES numbers. Filter out non-numbers.
    let tempArr = rawData.split(',')
        .map(item => parseFloat(item.trim()))
        .filter(item => !isNaN(item));
    
    // Sort Numerically
    dataArray = tempArr.sort((a, b) => a - b);
    
    // Update input to reflect sorted data
    document.getElementById('arrayInput').value = dataArray.join(', ');

    if(resetPointers) {
         low = 0;
         high = dataArray.length - 1;
         pos = -1; 
    }

    // Clear Container
    container.innerHTML = ''; 

    dataArray.forEach((val, index) => {
        const box = document.createElement('div');
        box.className = 'array-item';
        box.id = `item-${index}`;
        box.innerText = val;
        
        const indexLabel = document.createElement('span');
        indexLabel.className = 'index-label';
        indexLabel.innerText = index;
        box.appendChild(indexLabel);

        container.appendChild(box);
    });

    if(resetPointers) {
        logBox.innerHTML = "Status: Data Sorted Numerically. Ready.<br>Formula: pos = lo + ((x - arr[lo]) * (hi - lo) / (arr[hi] - arr[lo]))";
        logBox.style.color = "var(--text)";
        updateVisuals();
    }
}

document.getElementById('arrayInput').addEventListener('change', () => parseAndRenderData(true));

// --- 2. Start / Resume ---
function initSearch() {
    if (isRunning) return;
    if (isFound || low > high) {
        resetVisualization();
        return;
    }

    const tInput = document.getElementById('targetInput').value;
    if(tInput === "") {
        alert("Please enter a numeric target.");
        return;
    }
    target = parseFloat(tInput);
    
    // Ensure freshness
    if(pos === -1) parseAndRenderData(true);

    isRunning = true;
    logBox.innerText = "Status: Interpolation Search started...";
    
    stepLogic(); // Immediate first step
    timer = setInterval(stepLogic, speed);
}

// --- 3. Pause ---
function pauseSearch() {
    isRunning = false;
    clearInterval(timer);
    logBox.innerHTML += "<br>Status: Paused.";
}

// --- 4. Step Logic (Core Algorithm) ---
function stepLogic() {
    // 4a. Base Conditions
    if (low <= high && target >= dataArray[low] && target <= dataArray[high]) {
        
        // 4b. Calculate Position (The "Interpolation" Formula)
        // Avoid division by zero if all elements are same
        let denominator = dataArray[high] - dataArray[low];
        
        if (denominator === 0) {
            // If all elements are same, pos is low
            pos = low;
        } else {
            // Formula
            let fraction = (target - dataArray[low]) * (high - low) / denominator;
            pos = low + Math.floor(fraction);
        }

        // Visuals: Mark current scope and calculated pos
        updateVisuals();

        // Logging the Math
        logBox.innerHTML = `Range: [${low}, ${high}]. Values: [${dataArray[low]}...${dataArray[high]}]<br>`;
        logBox.innerHTML += `Formula: ${low} + ((${target}-${dataArray[low]}) * (${high}-${low}) / (${dataArray[high]}-${dataArray[low]}))<br>`;
        logBox.innerHTML += `Calculated Position (pos): <b>${pos}</b>. Value at pos: <b>${dataArray[pos]}</b>`;

        // 4c. Check Match
        if (dataArray[pos] === target) {
            // FOUND
            pauseSearch();
            isFound = true;
            document.getElementById(`item-${pos}`).classList.add('found');
            logBox.innerHTML += `<br><span style="color: var(--success)">SUCCESS: Found at Index ${pos}!</span>`;
        } 
        else if (dataArray[pos] < target) {
            // Target is higher, move Low up
            logBox.innerHTML += `<br>Value ${dataArray[pos]} < Target ${target}. Go Right.`;
            low = pos + 1;
        } 
        else {
            // Target is lower, move High down
            logBox.innerHTML += `<br>Value ${dataArray[pos]} > Target ${target}. Go Left.`;
            high = pos - 1;
        }

    } else {
        // Target not found (Loop condition failed)
        pauseSearch();
        updateVisuals(); 
        logBox.innerHTML = `Status: Finished. Target <b>${target}</b> not found.`;
        logBox.style.color = "var(--danger)";
    }
}

// --- 5. Visual Updater ---
function updateVisuals() {
    for (let i = 0; i < dataArray.length; i++) {
        const itemEl = document.getElementById(`item-${i}`);
        
        // Clear old states
        itemEl.classList.remove('in-range', 'probe', 'discarded', 'low-marker', 'high-marker');

        // Discarded vs Range
        if (i < low || i > high) {
            itemEl.classList.add('discarded');
        } else {
            itemEl.classList.add('in-range');
        }

        // Pointers
        if (i === low) itemEl.classList.add('low-marker');
        if (i === high) itemEl.classList.add('high-marker');

        // Probe Position
        if (i === pos && isRunning) {
             itemEl.classList.remove('in-range');
             itemEl.classList.add('probe');
        }
    }
}

// --- 6. Step Button ---
function stepForward() {
    pauseSearch();
    const tInput = document.getElementById('targetInput').value;
    if(!tInput) { alert("Enter Target"); return; }
    target = parseFloat(tInput);

    if(pos === -1) parseAndRenderData(true);

    if (isFound || (low > high && pos !== -1)) {
        alert("Search finished. Please Reset.");
        return;
    }
    stepLogic();
}

// --- 7. Reset ---
function resetVisualization() {
    pauseSearch();
    parseAndRenderData(true);
}

// --- 8. Tabs ---
function openTab(lang) {
    document.querySelectorAll('.code-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(lang).classList.add('active');
    
    const buttons = document.querySelectorAll('.tab-btn');
    const langMap = {'c':0, 'cpp':1, 'java':2, 'python':3};
    buttons[langMap[lang]].classList.add('active');
}