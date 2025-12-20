// --- State Variables ---
let dataArray = [];
let isRunning = false;
let isSorted = false;
let timer = null;
let speed = 800;

// Animation Queue
let animations = []; 
let currentStep = 0;

// Bucket Tracker
let bucketQueues = Array.from({length: 10}, () => []);

// Visual Constants
const NODE_SIZE = 50;
const GAP = 15;
let startX = 20;

// DOM
const container = document.getElementById('arrayContainer');
const bucketsContainer = document.getElementById('bucketsContainer');
const logBox = document.getElementById('logBox');
const speedInput = document.getElementById('speedRange');
const speedVal = document.getElementById('speedVal');

// --- Init ---
window.onload = () => {
    initBucketsUI();
    parseAndRender();
};
window.onresize = () => parseAndRender(false);

speedInput.addEventListener('input', (e) => {
    speed = parseInt(e.target.value);
    speedVal.innerText = (speed/1000).toFixed(1) + "s";
    
    // Sync transition speed
    const nodes = document.querySelectorAll('.array-node');
    const transitionTime = (speed * 0.8) / 1000;
    nodes.forEach(n => n.style.transition = `transform ${transitionTime}s ease-in-out, left ${transitionTime}s ease-in-out`);

    if(isRunning && !isSorted) {
        clearInterval(timer);
        timer = setInterval(stepLogic, speed);
    }
});

function initBucketsUI() {
    bucketsContainer.innerHTML = '';
    for(let i=0; i<10; i++) {
        const b = document.createElement('div');
        b.className = 'bucket';
        b.id = `bucket-${i}`;
        b.setAttribute('data-id', i);
        bucketsContainer.appendChild(b);
    }
}

// --- 1. Parse & Render ---
function parseAndRender(reset = true) {
    if(reset) {
        pauseSort();
        isSorted = false;
        currentStep = 0;
        animations = [];
        bucketQueues = Array.from({length: 10}, () => []);
    }

    const rawData = document.getElementById('arrayInput').value;
    dataArray = rawData.split(',').map(item => {
        let val = item.trim();
        return isNaN(val) ? 0 : Math.floor(Math.abs(parseFloat(val)));
    }).filter(item => item !== "");
    
    renderNodes(dataArray);

    if(reset) {
        generateRadixSortSteps([...dataArray]); 
        logBox.innerText = `Status: Ready. Generated ${animations.length} steps.`;
    }
}

function renderNodes(arr) {
    container.innerHTML = '';
    const n = arr.length;

    // --- CENTERING ---
    const totalWidth = n * NODE_SIZE + (n - 1) * GAP;
    const containerWidth = container.clientWidth;
    startX = (containerWidth - totalWidth) / 2;
    if(startX < 20) startX = 20;

    arr.forEach((val, index) => {
        const node = document.createElement('div');
        node.className = 'array-node';
        node.id = `node-init-${index}`;
        
        // Absolute Position
        const leftPos = startX + index * (NODE_SIZE + GAP);
        node.style.left = `${leftPos}px`;
        
        // Track logical index
        node.dataset.xIndex = index;
        node.innerText = val;
        
        container.appendChild(node);
    });
}

// --- 2. Radix Sort Logic (Record Steps) ---
function generateRadixSortSteps(arr) {
    animations = [];
    
    let maxVal = Math.max(...arr);
    if(maxVal === 0) return;

    for (let exp = 1; Math.floor(maxVal / exp) > 0; exp *= 10) {
        
        // 1. Distribution
        let buckets = Array.from({length: 10}, () => []);

        for (let i = 0; i < arr.length; i++) {
            let val = arr[i];
            let digit = Math.floor(val / exp) % 10;
            buckets[digit].push(val);
            
            // Record: Move item currently at logic index 'i' to bucket 'digit'
            animations.push({ type: 'MOVE_TO_BUCKET', fromIdx: i, bucketIdx: digit, val: val, place: exp });
        }

        // 2. Collection
        let idx = 0;
        for (let b = 0; b < 10; b++) {
            while (buckets[b].length > 0) {
                let val = buckets[b].shift();
                arr[idx] = val;

                // Record: Move from bucket 'b' back to array index 'idx'
                animations.push({ type: 'RESTORE_FROM_BUCKET', toIdx: idx, bucketIdx: b, val: val });
                idx++;
            }
        }
    }
    animations.push({ type: 'ALL_SORTED' });
}


// --- 3. Animation Replay Logic (Stable Size) ---
function stepLogic() {
    if (currentStep >= animations.length) {
        finishSort();
        return;
    }

    const action = animations[currentStep];
    const nodes = Array.from(document.querySelectorAll('.array-node'));

    if (action.type === 'MOVE_TO_BUCKET') {
        // Find the node currently at this logic index
        const node = nodes.find(n => parseInt(n.dataset.xIndex) === action.fromIdx);
        const bucket = document.getElementById(`bucket-${action.bucketIdx}`);
        
        if(node && bucket) {
            // Style
            node.classList.add('processing');

            // Calculate Vectors (Stable because size is fixed!)
            const nodeRect = node.getBoundingClientRect();
            const bucketRect = bucket.getBoundingClientRect();
            
            // Center to Center
            const nodeCenterX = nodeRect.left + nodeRect.width / 2;
            const nodeCenterY = nodeRect.top + nodeRect.height / 2;
            
            const bucketCenterX = bucketRect.left + bucketRect.width / 2;
            const bucketCenterY = bucketRect.top + bucketRect.height / 2;
            
            const moveX = bucketCenterX - nodeCenterX;
            const moveY = bucketCenterY - nodeCenterY;
            
            // Apply Transform
            node.style.transform = `translate(${moveX}px, ${moveY}px)`;
            
            // Track in JS bucket queue
            bucketQueues[action.bucketIdx].push(node);
            
            logBox.innerHTML = `Digit place ${action.place}: Moving <b>${action.val}</b> to Bucket <b>${action.bucketIdx}</b>.`;
        }
    }
    else if (action.type === 'RESTORE_FROM_BUCKET') {
        // FIFO: Get first node that entered this bucket
        const node = bucketQueues[action.bucketIdx].shift();
        
        if(node) {
            // New Array Position
            const targetLeft = startX + action.toIdx * (NODE_SIZE + GAP);
            
            node.classList.remove('processing');
            
            // Reset logic: Update Left, Remove Transform
            node.style.left = `${targetLeft}px`;
            node.style.transform = `translate(0px, 0px)`;
            
            // Update logical index for next pass
            node.dataset.xIndex = action.toIdx;

            logBox.innerHTML = `Collecting <b>${action.val}</b> back to position ${action.toIdx}.`;
        }
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
    logBox.innerText = "Status: Radix Sort Complete!";
    logBox.style.color = "var(--sorted)";
    document.querySelectorAll('.array-node').forEach(b => {
        b.classList.remove('processing');
        b.style.transform = 'translate(0,0)';
    });
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