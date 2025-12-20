// --- State Variables ---
let dataArray = [];
let target = "";
let isRunning = false;
let isFound = false;
let timer = null;
let speed = 1000; // ms defaults slower for binary search to see steps

// Pointers for Binary Search
let lowIndex = 0;
let highIndex = 0;
let midIndex = 0;

// --- DOM Elements ---
const container = document.getElementById('arrayContainer');
const logBox = document.getElementById('logBox');
const speedInput = document.getElementById('speedRange');
const speedVal = document.getElementById('speedVal');

// --- Initialization on load ---
window.onload = () => {
    // Initial render without starting search
    parseAndRenderData(false);
};

// --- Speed Control Listener ---
speedInput.addEventListener('input', (e) => {
    speed = parseInt(e.target.value);
    speedVal.innerText = (speed/1000).toFixed(1) + "s delay";
    // If running, restart timer with new speed
    if(isRunning && !isFound) {
        clearInterval(timer);
        timer = setInterval(stepLogic, speed);
    }
});

// --- Helper: Custom Sort for Mixed Data ---
// Attempts numeric sort, falls back to string sort if non-numbers exist
function mixedSort(a, b) {
    const numA = parseFloat(a);
    const numB = parseFloat(b);
    
    // If both are valid numbers, compare numerically
    if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB;
    }
    
    // Otherwise, fallback to standard string comparison
    // Use localeCompare for better string sorting (e.g., "Apple" before "banana")
    return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}


// --- 1. Parse Input, SORT, and Render Array ---
// resetPointers: bool - true if we are starting a fresh search
function parseAndRenderData(resetPointers = true) {
    if(resetPointers) {
       pauseSearch();
       isFound = false;
    }
    
    const rawData = document.getElementById('arrayInput').value;
    // Split by comma, trim whitespace, filter empty
    let unsortedArray = rawData.split(',').map(item => item.trim()).filter(item => item !== "");
    
    // *** CRITICAL STEP FOR BINARY SEARCH: SORT THE DATA ***
    // Using custom mixed sort handler
    dataArray = unsortedArray.sort(mixedSort);
    
    // Update input box to show sorted data to user
    document.getElementById('arrayInput').value = dataArray.join(', ');

    if(resetPointers) {
         lowIndex = 0;
         highIndex = dataArray.length - 1;
         // Reset mid to start index so visualization doesn't look weird before starting
         midIndex = -1; 
    }

    // Clear existing container
    container.innerHTML = ''; 

    // Generate DOM elements for boxes
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
        logBox.innerHTML = "Status: Data Sorted. Ready to Binary Search.<br>Click 'Start'.";
        logBox.style.color = "var(--text)";
        // Initial visual update to show full range active
        updateVisuals();
    }
}

// Listen for input changes to re-render immediately
document.getElementById('arrayInput').addEventListener('change', () => parseAndRenderData(true));


// --- 2. Start / Resume Logic ---
function initSearch() {
    if (isRunning) return; // Already running
    if (isFound || lowIndex > highIndex) {
        resetVisualization(); // Restart if finished
        return;
    }

    target = document.getElementById('targetInput').value.trim();
    if(!target) {
        alert("Please enter a target value to search for.");
        return;
    }
    
    // Ensure data is fresh and sorted before starting
    if(midIndex === -1) {
         parseAndRenderData(true);
    }


    isRunning = true;
    logBox.innerText = "Status: Binary Searching started...";
    
    // Start the Interval
    stepLogic(); // Run one step immediately
    timer = setInterval(stepLogic, speed);
}

// --- 3. Pause Logic ---
function pauseSearch() {
    isRunning = false;
    clearInterval(timer);
    logBox.innerHTML += "<br>Status: Paused.";
}

// --- 4. Step Logic (The Core Binary Search Algorithm) ---
function stepLogic() {
    // 4a. Check Termination Condition (Not Found)
    if (lowIndex > highIndex) {
        pauseSearch();
        updateVisuals(); // Final update to show everything discarded
        logBox.innerHTML = `Status: Finished. Target <b>'${target}'</b> not found in the dataset.`;
        logBox.style.color = "var(--danger)";
        return;
    }

    // 4b. Calculate Midpoint
    // Using Math.floor for integer division simulation
    midIndex = Math.floor((lowIndex + highIndex) / 2);
    const midVal = dataArray[midIndex];

    // 4c. Update Visuals BEFORE comparison to show what we are looking at
    updateVisuals();

    // 4d. Log the current state
    let logMsg = `Range: [Index ${lowIndex} to ${highIndex}]. \n`;
    logMsg += `Midpoint calculated at Index <b>${midIndex}</b> with value <b>'${midVal}'</b>. \n`;
    logMsg += `Comparing <b>'${midVal}'</b> with Target <b>'${target}'</b>...`;
    logBox.innerHTML = logMsg;
    logBox.style.color = "var(--text)";


    // 4e. Comparison Logic
    // Using the same mixed sort logic for comparison consistency
    const comparisonResult = mixedSort(midVal, target);

    if (comparisonResult === 0) {
        // === FOUND ===
        pauseSearch();
        isFound = true;
        // Mark found visually
        document.getElementById(`item-${midIndex}`).classList.add('found');
        logBox.innerHTML += `<br><span style="color: var(--success)">SUCCESS: Match found at Index <b>${midIndex}</b>!</span>`;
        
    } else if (comparisonResult < 0) {
        // === Target is Larger (Look Right) ===
        logBox.innerHTML += `<br>Target is LARGER. Discarding left half. Moving Low pointer to index ${midIndex + 1}.`;
        lowIndex = midIndex + 1;
    } else {
        // === Target is Smaller (Look Left) ===
        logBox.innerHTML += `<br>Target is SMALLER. Discarding right half. Moving High pointer to index ${midIndex - 1}.`;
        highIndex = midIndex - 1;
    }
}

// --- 5. Helper function to update CSS classes based on pointer states ---
function updateVisuals() {
    for (let i = 0; i < dataArray.length; i++) {
        const itemEl = document.getElementById(`item-${i}`);
        // Reset classes first
        itemEl.classList.remove('active-range', 'midpoint', 'discarded', 'low-marker', 'high-marker');

        // Determine state based on indices
        if (i < lowIndex || i > highIndex) {
            itemEl.classList.add('discarded');
        } else {
            itemEl.classList.add('in-range');
        }

        // Add markers
        if (i === lowIndex) itemEl.classList.add('low-marker');
        if (i === highIndex) itemEl.classList.add('high-marker');

        // Highlight midpoint only if search is active
        if (i === midIndex && isRunning) {
             itemEl.classList.remove('in-range'); // Midpoint style overrides range style
             itemEl.classList.add('midpoint');
        }
    }
}


// --- 6. Manual Step Button ---
function stepForward() {
    pauseSearch(); // Ensure auto-play is off
    target = document.getElementById('targetInput').value.trim();
    
    // Initialize if hasn't started
    if(midIndex === -1) {
         parseAndRenderData(true);
         target = document.getElementById('targetInput').value.trim(); // get target again just in case
    }

    if (isFound || lowIndex > highIndex) {
        alert("Search finished. Please Reset.");
        return;
    }
    
    if(!target) {
         alert("Please enter a target.");
         return;
    }

    stepLogic();
}

// --- 7. Reset ---
function resetVisualization() {
    pauseSearch();
    parseAndRenderData(true); // Re-parse, re-sort, re-render, reset pointers
}

// --- 8. Tab Switching for Code ---
function openTab(lang) {
    document.querySelectorAll('.code-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    
    document.getElementById(lang).classList.add('active');
    
    // Activate button based on index association (simple way)
    const buttons = document.querySelectorAll('.tab-btn');
    const langMap = {'c':0, 'cpp':1, 'java':2, 'python':3};
    buttons[langMap[lang]].classList.add('active');
}