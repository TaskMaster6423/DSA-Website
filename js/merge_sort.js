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
let startX = 20; // Will be calculated dynamically

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
        generateMergeSortSteps([...dataArray]); 
        logBox.innerText = `Status: Ready. Generated ${animations.length} merge steps.`;
    }
}

function renderBars(arr) {
    container.innerHTML = '';
    let maxVal = Math.max(...arr, 100);
    const n = arr.length;
    
    // --- CENTERING CALCULATION ---
    const totalWidth = n * BAR_WIDTH + (n - 1) * GAP;
    const containerWidth = container.clientWidth;
    startX = (containerWidth - totalWidth) / 2;
    if(startX < 20) startX = 20;

    arr.forEach((val, index) => {
        const bar = document.createElement('div');
        bar.className = 'array-bar';
        bar.id = `bar-init-${index}`;
        
        // Absolute Position
        const leftPos = startX + index * (BAR_WIDTH + GAP);
        bar.style.left = `${leftPos}px`;
        
        // Track current logical index
        bar.dataset.xIndex = index;
        
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

// --- 2. Merge Sort Logic (Record Steps) ---
function generateMergeSortSteps(arr) {
    animations = [];
    mergeSortHelper(arr, 0, arr.length - 1);
    animations.push({ type: 'ALL_SORTED' });
}

function mergeSortHelper(arr, l, r) {
    if(l >= r) return;
    const m = Math.floor((l + r) / 2);
    mergeSortHelper(arr, l, m);
    mergeSortHelper(arr, m + 1, r);
    merge(arr, l, m, r);
}

function merge(arr, l, m, r) {
    // We need to capture the values that are being merged
    let leftSlice = arr.slice(l, m + 1);
    let rightSlice = arr.slice(m + 1, r + 1);
    
    let sortedBlock = [];
    let i = 0, j = 0;

    // Standard Merge Logic to find sorted order
    while(i < leftSlice.length && j < rightSlice.length) {
        if(leftSlice[i] <= rightSlice[j]) sortedBlock.push(leftSlice[i++]);
        else sortedBlock.push(rightSlice[j++]);
    }
    while(i < leftSlice.length) sortedBlock.push(leftSlice[i++]);
    while(j < rightSlice.length) sortedBlock.push(rightSlice[j++]);

    // Update main array in memory
    for(let k = 0; k < sortedBlock.length; k++) {
        arr[l + k] = sortedBlock[k];
    }

    // Record Animation: We merge the range [l, r] into the values in sortedBlock
    animations.push({ type: 'MERGE_GROUP', l, r, sortedValues: sortedBlock });
}


// --- 3. Animation Replay Logic (Lift & Drop) ---
function stepLogic() {
    if (currentStep >= animations.length) {
        finishSort();
        return;
    }

    const action = animations[currentStep];
    const bars = Array.from(document.querySelectorAll('.array-bar'));

    if (action.type === 'MERGE_GROUP') {
        const { l, r, sortedValues } = action;
        logBox.innerHTML = `Step ${currentStep+1}: Merging indices ${l} through ${r}.`;

        // 1. Identify bars currently at indices [l...r]
        let barsInRange = [];
        for(let idx = l; idx <= r; idx++) {
            const bar = bars.find(b => parseInt(b.dataset.xIndex) === idx);
            if(bar) barsInRange.push(bar);
        }

        // 2. Lift Up
        barsInRange.forEach(b => {
            b.style.transform = `translateY(-120px)`; 
            b.classList.add('merging');
        });

        // 3. Move X Positions
        // We match bars to sortedValues.
        // Simple logic: sort the DOM elements by their innerText numerical value 
        // to determine which one corresponds to the smallest, second smallest, etc.
        // This handles moving the physical bar to its new slot.
        barsInRange.sort((a, b) => parseFloat(a.innerText) - parseFloat(b.innerText));

        setTimeout(() => {
            barsInRange.forEach((bar, idx) => {
                const newIndex = l + idx;
                const newLeft = startX + newIndex * (BAR_WIDTH + GAP);
                
                bar.style.left = `${newLeft}px`;
                bar.dataset.xIndex = newIndex; // Update tracker
            });
        }, speed * 0.4); // Wait partway through lift

        // 4. Drop Down
        setTimeout(() => {
            barsInRange.forEach(b => {
                b.style.transform = `translateY(0px)`;
                b.classList.remove('merging');
            });
        }, speed * 0.8);
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
        b.classList.remove('merging');
        b.classList.add('sorted');
    });
    logBox.innerText = "Status: Merge Sort Complete!";
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