// State Variables
let dataArray = [];
let target = "";
let currentIndex = 0;
let isRunning = false;
let isFound = false;
let timer = null;
let speed = 800; // ms

// DOM Elements
const container = document.getElementById('arrayContainer');
const logBox = document.getElementById('logBox');
const speedInput = document.getElementById('speedRange');
const speedVal = document.getElementById('speedVal');

// Initialize on load
window.onload = () => {
    parseAndRender();
};

// Speed Control Listener
speedInput.addEventListener('input', (e) => {
    speed = parseInt(e.target.value);
    speedVal.innerText = (1000/speed).toFixed(1) + "x";
    // If running, restart timer with new speed
    if(isRunning && !isFound) {
        clearInterval(timer);
        timer = setInterval(stepLogic, speed);
    }
});

// 1. Parse Input and Render Array
function parseAndRender() {
    // Stop any ongoing animation
    pauseSearch();
    currentIndex = 0;
    isFound = false;
    
    const rawData = document.getElementById('arrayInput').value;
    // Split by comma, trim whitespace
    dataArray = rawData.split(',').map(item => item.trim()).filter(item => item !== "");
    
    container.innerHTML = ''; // Clear existing

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

    logBox.innerText = "Status: Data loaded. Click 'Start' to visualize.";
    logBox.style.color = "var(--primary)";
}

// Listen for input changes to re-render immediately
document.getElementById('arrayInput').addEventListener('change', parseAndRender);

// 2. Start / Resume Logic
function initSearch() {
    if (isRunning) return; // Already running
    if (isFound || currentIndex >= dataArray.length) {
        resetVisualization(); // Restart if finished
        return;
    }

    target = document.getElementById('targetInput').value.trim();
    if(!target) {
        alert("Please enter a target value to search for.");
        return;
    }

    isRunning = true;
    logBox.innerText = "Status: Searching started...";
    
    // Start the Interval
    timer = setInterval(stepLogic, speed);
}

// 3. Pause Logic
function pauseSearch() {
    isRunning = false;
    clearInterval(timer);
    logBox.innerText = "Status: Paused.";
}

// 4. Step Logic (The Core Algorithm)
function stepLogic() {
    // Check bounds
    if (currentIndex >= dataArray.length) {
        pauseSearch();
        logBox.innerText = `Status: Element '${target}' not found in the array.`;
        logBox.style.color = "var(--danger)";
        return;
    }

    const currentVal = dataArray[currentIndex];
    const itemElement = document.getElementById(`item-${currentIndex}`);
    
    // Visual Update: Mark Current
    // Remove 'active' from previous if exists (manual cleanup mainly)
    if(currentIndex > 0) {
            document.getElementById(`item-${currentIndex-1}`).classList.remove('active');
            document.getElementById(`item-${currentIndex-1}`).classList.add('visited');
    }
    
    itemElement.classList.add('active');

    // Log the comparison
    logBox.innerHTML = `Step ${currentIndex + 1}: Compare <b>'${currentVal}'</b> with Target <b>'${target}'</b>...`;

    // Logic Check
    if (currentVal === target) {
        // FOUND!
        pauseSearch();
        isFound = true;
        itemElement.classList.remove('active');
        itemElement.classList.add('found');
        logBox.innerHTML = `SUCCESS: Match found at Index <b>${currentIndex}</b>!`;
        logBox.style.color = "var(--success)";
    } else {
        // NOT FOUND, PREPARE FOR NEXT
        currentIndex++;
    }
}

// 5. Manual Step Button
function stepForward() {
    pauseSearch(); // Ensure auto-play is off
    target = document.getElementById('targetInput').value.trim();
    
    if (isFound || currentIndex >= dataArray.length) {
        alert("Search finished. Please Reset.");
        return;
    }
    stepLogic();
}

// 6. Reset
function resetVisualization() {
    pauseSearch();
    currentIndex = 0;
    isFound = false;
    parseAndRender(); // Re-draw clean board
}

// 7. Tab Switching for Code
function openTab(lang) {
    // Hide all content
    document.querySelectorAll('.code-content').forEach(el => el.classList.remove('active'));
    // Deactivate all buttons
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    
    // Show selected
    document.getElementById(lang).classList.add('active');
    
    // Activate button
    const buttons = document.querySelectorAll('.tab-btn');
    if(lang === 'c') buttons[0].classList.add('active');
    if(lang === 'cpp') buttons[1].classList.add('active');
    if(lang === 'java') buttons[2].classList.add('active');
    if(lang === 'python') buttons[3].classList.add('active');
}