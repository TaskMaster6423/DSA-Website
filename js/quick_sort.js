// --- State Variables ---
let dataArray = [];
let isRunning = false;
let isSorted = false;
let timer = null;
let speed = 800;

// Animation Queue
let animations = []; 
let currentStep = 0;

// Visual Constants
const BAR_WIDTH = 45;
const GAP = 10;
// startX will be calculated dynamically

// DOM
const container = document.getElementById('arrayContainer');
const logBox = document.getElementById('logBox');
const speedInput = document.getElementById('speedRange');
const speedVal = document.getElementById('speedVal');

// --- Init ---
window.onload = () => parseAndRender();
window.onresize = () => parseAndRender(false); // Re-center on resize

speedInput.addEventListener('input', (e) => {
    speed = parseInt(e.target.value);
    speedVal.innerText = (speed/1000).toFixed(1) + "s";
    
    // Sync CSS transition to be slightly faster than step interval
    const bars = document.querySelectorAll('.array-bar');
    const transitionTime = (speed * 0.8) / 1000;
    bars.forEach(b => b.style.transition = `left ${transitionTime}s ease-in-out, background-color 0.2s`);

    if(isRunning && !isSorted) {
        clearInterval(timer);
        timer = setInterval(stepLogic, speed);
    }
});

// --- 1. Parse & Render ---
function parseAndRender(reset = true) {
    if(reset) {
        pauseSort();
        isSorted = false;
        currentStep = 0;
        animations = [];
    }

    const rawData = document.getElementById('arrayInput').value;
    dataArray = rawData.split(',').map(item => {
        let val = item.trim();
        return isNaN(val) ? 0 : parseFloat(val);
    }).filter(item => item !== "");
    
    renderBars(dataArray);

    if(reset) {
        // Run logic on copy
        generateQuickSortSteps([...dataArray]); 
        logBox.innerText = `Status: Ready. Generated ${animations.length} steps.`;
    }
}

function renderBars(arr) {
    container.innerHTML = '';
    let maxVal = Math.max(...arr, 100);
    const n = arr.length;
    
    // --- CENTERING CALCULATION ---
    const totalWidth = n * BAR_WIDTH + (n - 1) * GAP;
    const containerWidth = container.clientWidth;
    
    let startX = (containerWidth - totalWidth) / 2;
    if(startX < 20) startX = 20;

    arr.forEach((val, index) => {
        const bar = document.createElement('div');
        bar.className = 'array-bar';
        bar.id = `bar-init-${index}`;
        
        // --- ABSOLUTE POSITIONING ---
        const leftPos = startX + index * (BAR_WIDTH + GAP);
        bar.style.left = `${leftPos}px`;
        
        // Store current index in dataset for tracking
        bar.dataset.currentIndex = index; 
        
        // Height
        let hPercent = 50;
        if(val > 0) {
            hPercent = (val / maxVal) * 100;
            if(hPercent < 10) hPercent = 10;
        }
        bar.style.height = `${hPercent}%`;

        const label = document.createElement('span');
        label.innerText = val;
        bar.appendChild(label);
        container.appendChild(bar);
    });
}

// --- 2. Quick Sort Logic (Record Steps) ---
function generateQuickSortSteps(arr) {
    animations = [];
    quickSortHelper(arr, 0, arr.length - 1);
    animations.push({ type: 'ALL_SORTED' });
}

function quickSortHelper(arr, low, high) {
    if (low < high) {
        let pi = partition(arr, low, high);
        
        quickSortHelper(arr, low, pi - 1);
        quickSortHelper(arr, pi + 1, high);
    } else if (low === high) {
        // Single element is implicitly sorted
        animations.push({ type: 'SORTED_BAR', index: low });
    }
}

function partition(arr, low, high) {
    let pivot = arr[high];
    animations.push({ type: 'SET_PIVOT', index: high, value: pivot });
    
    let i = (low - 1);

    for (let j = low; j <= high - 1; j++) {
        animations.push({ type: 'COMPARE', idx1: j, idx2: high, val1: arr[j], val2: pivot });
        
        if (arr[j] < pivot) {
            i++;
            // Swap i and j
            animations.push({ type: 'SWAP', idx1: i, idx2: j, val1: arr[i], val2: arr[j] });
            
            let temp = arr[i];
            arr[i] = arr[j];
            arr[j] = temp;
        }
    }
    // Place pivot
    animations.push({ type: 'SWAP', idx1: i + 1, idx2: high, val1: arr[i+1], val2: arr[high] });
    
    let temp = arr[i + 1];
    arr[i + 1] = arr[high];
    arr[high] = temp;
    
    animations.push({ type: 'SORTED_BAR', index: i + 1 });
    return (i + 1);
}

// --- 3. Animation Replay Logic (Physical Movement) ---
function stepLogic() {
    if (currentStep >= animations.length) {
        finishSort();
        return;
    }

    const action = animations[currentStep];
    const bars = Array.from(document.querySelectorAll('.array-bar'));

    // Reset styles
    bars.forEach(b => b.classList.remove('compare', 'pivot', 'swap'));

    if (action.type === 'SET_PIVOT') {
        const pBar = bars.find(b => parseInt(b.dataset.currentIndex) === action.index);
        if(pBar) pBar.classList.add('pivot');
        logBox.innerHTML = `Step ${currentStep+1}: Set Pivot to <b>${action.value}</b>.`;
    }
    else if (action.type === 'COMPARE') {
        // Highlight J (idx1) and keep Pivot (idx2) highlighted
        const barJ = bars.find(b => parseInt(b.dataset.currentIndex) === action.idx1);
        const barPivot = bars.find(b => parseInt(b.dataset.currentIndex) === action.idx2);
        
        if(barJ) barJ.classList.add('compare');
        if(barPivot) barPivot.classList.add('pivot');

        logBox.innerHTML = `Step ${currentStep+1}: Comparing <b>${action.val1}</b> < Pivot (<b>${action.val2}</b>)?`;
    }
    else if (action.type === 'SWAP') {
        // Find the two DOM elements currently occupying idx1 and idx2
        const bar1 = bars.find(b => parseInt(b.dataset.currentIndex) === action.idx1);
        const bar2 = bars.find(b => parseInt(b.dataset.currentIndex) === action.idx2);
        
        if (bar1 && bar2) {
            bar1.classList.add('swap');
            bar2.classList.add('swap');

            // --- PHYSICAL SWAP LOGIC ---
            // 1. Get current 'left' style values
            const left1 = bar1.style.left;
            const left2 = bar2.style.left;
            
            // 2. Swap them
            bar1.style.left = left2;
            bar2.style.left = left1;
            
            // 3. Update their internal tracker so we find them correctly next time
            bar1.dataset.currentIndex = action.idx2;
            bar2.dataset.currentIndex = action.idx1;
            
            logBox.innerHTML = `Step ${currentStep+1}: Swapping elements.`;
        }
    }
    else if (action.type === 'SORTED_BAR') {
        const bar = bars.find(b => parseInt(b.dataset.currentIndex) === action.index);
        if(bar) bar.classList.add('sorted');
    }
    else if (action.type === 'ALL_SORTED') {
        finishSort();
        return;
    }

    currentStep++;
}

// --- 4. Controls ---
function initSort() {
    if (isRunning) return;
    if (isSorted || currentStep >= animations.length) {
        if(isSorted) resetVisualization();
        return;
    }
    isRunning = true;
    timer = setInterval(stepLogic, speed);
}

function pauseSort() {
    isRunning = false;
    clearInterval(timer);
}

function stepForward() {
    pauseSort();
    if(isSorted) return;
    stepLogic();
}

function finishSort() {
    pauseSort();
    isSorted = true;
    const bars = document.querySelectorAll('.array-bar');
    bars.forEach(b => {
        b.classList.remove('pivot', 'compare', 'swap');
        b.classList.add('sorted');
    });
    logBox.innerText = "Status: Quick Sort Complete!";
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