// --- State Variables ---
let dataArray = [];
let target = "";
let isRunning = false;
let isFound = false;
let timer = null;
let speed = 1000;

// BFS Specific State
let bfsQueue = []; // Holds indices
let processedSet = new Set();
let currentProcessingIndex = null;

// DOM Elements
const treeContainer = document.getElementById('treeContainer');
const svgLines = document.getElementById('svgLines');
const queueBox = document.getElementById('queueBox');
const logBox = document.getElementById('logBox');
const speedInput = document.getElementById('speedRange');
const speedVal = document.getElementById('speedVal');

// --- Init ---
window.onload = () => {
    parseAndRenderTree();
};

speedInput.addEventListener('input', (e) => {
    speed = parseInt(e.target.value);
    speedVal.innerText = (speed/1000).toFixed(1) + "s";
    if(isRunning && !isFound) {
        clearInterval(timer);
        timer = setInterval(stepLogic, speed);
    }
});

// --- 1. Parse Input & Build Tree ---
function parseAndRenderTree(reset = true) {
    if(reset) {
        pauseSearch();
        isFound = false;
        bfsQueue = [];
        processedSet = new Set();
        currentProcessingIndex = null;
        updateQueueVisuals();
    }

    const rawData = document.getElementById('arrayInput').value;
    dataArray = rawData.split(',').map(item => item.trim()).filter(item => item !== "");

    // Clear Previous
    const existingNodes = document.querySelectorAll('.tree-node');
    existingNodes.forEach(n => n.remove());
    svgLines.innerHTML = ''; // Clear lines

    if(dataArray.length === 0) return;

    // --- Dynamic Tree Layout Logic ---
    // We render a perfect binary tree structure based on array indices
    // i -> left: 2i+1, right: 2i+2
    
    const depth = Math.floor(Math.log2(dataArray.length)) + 1;
    const containerWidth = treeContainer.clientWidth;
    const startY = 40;
    const levelHeight = 70;

    dataArray.forEach((val, index) => {
        // Calculate Level and Position in Level
        const level = Math.floor(Math.log2(index + 1));
        
        // Horizontal spacing decreases as level increases
        // Max nodes at this level
        const maxNodesAtLevel = Math.pow(2, level);
        // Which child is this? (0 to maxNodes-1)
        const posInLevel = index - (Math.pow(2, level) - 1);
        
        // Calculate X and Y
        // Divide width into slices
        const sliceWidth = containerWidth / (maxNodesAtLevel + 1);
        const x = sliceWidth * (posInLevel + 1);
        const y = startY + (level * levelHeight);

        // Create Node
        const node = document.createElement('div');
        node.className = 'tree-node';
        node.id = `node-${index}`;
        node.innerText = val;
        node.style.left = (x - 20) + 'px'; // Center offset
        node.style.top = (y - 20) + 'px';
        treeContainer.appendChild(node);

        // Draw Line to Parent (if not root)
        if (index > 0) {
            const parentIndex = Math.floor((index - 1) / 2);
            const parentNode = document.getElementById(`node-${parentIndex}`);
            
            // Wait for parent to be in DOM to get coords? 
            // We calculated coords manually, so we use those.
            
            // Re-calculate parent coords for line drawing
            const pLevel = Math.floor(Math.log2(parentIndex + 1));
            const pMaxNodes = Math.pow(2, pLevel);
            const pPos = parentIndex - (Math.pow(2, pLevel) - 1);
            const pSlice = containerWidth / (pMaxNodes + 1);
            const pX = pSlice * (pPos + 1);
            const pY = startY + (pLevel * levelHeight);

            // Create Line
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', pX);
            line.setAttribute('y1', pY);
            line.setAttribute('x2', x);
            line.setAttribute('y2', y);
            svgLines.appendChild(line);
        }
    });

    if(reset) {
        logBox.innerText = "Status: Tree built. Ready for BFS.";
        logBox.style.color = "var(--text)";
    }
}

// Re-render on resize to fix positions
window.onresize = () => parseAndRenderTree(false);
document.getElementById('arrayInput').addEventListener('change', () => parseAndRenderTree(true));

// --- 2. Start Logic ---
function initSearch() {
    if (isRunning) return;
    if (isFound || (processedSet.size >= dataArray.length)) {
        resetVisualization();
        return;
    }

    target = document.getElementById('targetInput').value.trim();
    if(!target) { alert("Enter Target"); return; }

    // If queue is empty (fresh start), enqueue root (index 0)
    if (bfsQueue.length === 0 && processedSet.size === 0 && currentProcessingIndex === null) {
        bfsQueue.push(0);
        updateVisuals(0, 'in-queue');
        logBox.innerText = `Status: Initialized. Enqueued Root Node '${dataArray[0]}'.`;
        updateQueueVisuals();
    }

    isRunning = true;
    timer = setInterval(stepLogic, speed);
}

// --- 3. Pause ---
function pauseSearch() {
    isRunning = false;
    clearInterval(timer);
    logBox.innerText += " (Paused)";
}

// --- 4. Step Logic (BFS) ---
function stepLogic() {
    // If no processing node and queue empty -> Finished not found
    if (currentProcessingIndex === null && bfsQueue.length === 0) {
        pauseSearch();
        logBox.innerText = `Status: Finished. Target '${target}' not found.`;
        logBox.style.color = "var(--danger)";
        return;
    }

    // PHASE 1: Dequeue (pick a node to process)
    if (currentProcessingIndex === null) {
        currentProcessingIndex = bfsQueue.shift(); // Dequeue
        updateQueueVisuals();
        
        const val = dataArray[currentProcessingIndex];
        
        // Visual: Mark as Current
        updateVisuals(currentProcessingIndex, 'current');
        
        logBox.innerHTML = `Dequeue: processing Node <b>${val}</b>. Checking if match...`;

        // Check Match
        if (val === target) {
            pauseSearch();
            isFound = true;
            updateVisuals(currentProcessingIndex, 'found');
            logBox.innerHTML = `SUCCESS: Found Target <b>${val}</b>!`;
            logBox.style.color = "var(--success)";
            return;
        }

        // Prepare for Phase 2 (Add Children) in next tick? 
        // To make it smoother, let's do children addition in this same step or next?
        // Let's do it in the same step to keep flow fast enough.
        
        // Add Children (Left: 2i+1, Right: 2i+2)
        const left = 2 * currentProcessingIndex + 1;
        const right = 2 * currentProcessingIndex + 2;

        let addedStr = "";

        if (left < dataArray.length) {
            bfsQueue.push(left);
            updateVisuals(left, 'in-queue');
            addedStr += dataArray[left] + " ";
        }
        if (right < dataArray.length) {
            bfsQueue.push(right);
            updateVisuals(right, 'in-queue');
            addedStr += dataArray[right] + " ";
        }

        if(addedStr) {
            logBox.innerHTML += `<br>Match failed. Enqueued children: [${addedStr}].`;
        } else {
             logBox.innerHTML += `<br>Match failed. Leaf node (no children).`;
        }
        
        updateQueueVisuals();

        // Mark as visited (but visually keep it 'current' for a moment?)
        // In next step, we clear 'current' and make it 'visited'.
        // To handle "state between steps", we can simply mark it visited NOW, 
        // but CSS priority keeps 'current' on top if classes overlap.
        // Let's rely on 'currentProcessingIndex' being cleared next step.
    } 
    else {
        // PHASE 2: Transition from Current to Visited
        // This acts as a "buffer" step to show the transition visually
        updateVisuals(currentProcessingIndex, 'visited');
        document.getElementById(`node-${currentProcessingIndex}`).classList.remove('current');
        
        processedSet.add(currentProcessingIndex);
        currentProcessingIndex = null; // Ready to dequeue next
        
        // Immediately trigger next logic? No, wait for timer.
    }
}

// --- 5. Step Button ---
function stepForward() {
    pauseSearch();
    target = document.getElementById('targetInput').value.trim();
    if(!target) { alert("Enter Target"); return; }

    // Init if needed
    if (bfsQueue.length === 0 && processedSet.size === 0 && currentProcessingIndex === null) {
        bfsQueue.push(0);
        updateVisuals(0, 'in-queue');
        updateQueueVisuals();
        return; // First click just inits
    }

    if(isFound || (bfsQueue.length === 0 && currentProcessingIndex === null)) {
         alert("Search Finished");
         return;
    }

    stepLogic();
}

// --- 6. Helper: Update Visuals ---
function updateVisuals(index, className) {
    const el = document.getElementById(`node-${index}`);
    if(el) {
        if(className === 'visited') {
            el.classList.add('visited');
            // Remove queue style if it was there
            el.classList.remove('in-queue');
        } else if (className === 'current') {
            el.classList.add('current');
            el.classList.remove('in-queue');
        } else if (className === 'in-queue') {
            el.classList.add('in-queue');
        } else if (className === 'found') {
            el.classList.remove('current');
            el.classList.add('found');
        }
    }
}

function updateQueueVisuals() {
    queueBox.innerHTML = '';
    if(bfsQueue.length === 0) {
        queueBox.innerHTML = '<span style="color: #666; font-size: 0.8rem;">(Queue Empty)</span>';
        return;
    }
    bfsQueue.forEach(idx => {
        const val = dataArray[idx];
        const item = document.createElement('div');
        item.className = 'queue-item';
        item.innerText = val;
        queueBox.appendChild(item);
    });
}

// --- 7. Reset ---
function resetVisualization() {
    parseAndRenderTree(true);
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