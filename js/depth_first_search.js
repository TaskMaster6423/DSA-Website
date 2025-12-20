// --- State Variables ---
let dataArray = [];
let target = "";
let isRunning = false;
let isFound = false;
let timer = null;
let speed = 1000;

// DFS Specific State: Stack
let dfsStack = []; // Holds indices
let processedSet = new Set();
let currentProcessingIndex = null;

// DOM Elements
const treeContainer = document.getElementById('treeContainer');
const svgLines = document.getElementById('svgLines');
const stackBox = document.getElementById('stackBox');
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
        dfsStack = [];
        processedSet = new Set();
        currentProcessingIndex = null;
        updateStackVisuals();
    }

    const rawData = document.getElementById('arrayInput').value;
    dataArray = rawData.split(',').map(item => item.trim()).filter(item => item !== "");

    // Clear Previous
    const existingNodes = document.querySelectorAll('.tree-node');
    existingNodes.forEach(n => n.remove());
    svgLines.innerHTML = ''; 

    if(dataArray.length === 0) return;

    // --- Dynamic Tree Layout Logic ---
    const depth = Math.floor(Math.log2(dataArray.length)) + 1;
    const containerWidth = treeContainer.clientWidth;
    const startY = 40;
    const levelHeight = 70;

    dataArray.forEach((val, index) => {
        const level = Math.floor(Math.log2(index + 1));
        const maxNodesAtLevel = Math.pow(2, level);
        const posInLevel = index - (Math.pow(2, level) - 1);
        
        const sliceWidth = containerWidth / (maxNodesAtLevel + 1);
        const x = sliceWidth * (posInLevel + 1);
        const y = startY + (level * levelHeight);

        const node = document.createElement('div');
        node.className = 'tree-node';
        node.id = `node-${index}`;
        node.innerText = val;
        node.style.left = (x - 20) + 'px';
        node.style.top = (y - 20) + 'px';
        treeContainer.appendChild(node);

        if (index > 0) {
            const parentIndex = Math.floor((index - 1) / 2);
            
            // Re-calc parent coords
            const pLevel = Math.floor(Math.log2(parentIndex + 1));
            const pMaxNodes = Math.pow(2, pLevel);
            const pPos = parentIndex - (Math.pow(2, pLevel) - 1);
            const pSlice = containerWidth / (pMaxNodes + 1);
            const pX = pSlice * (pPos + 1);
            const pY = startY + (pLevel * levelHeight);

            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', pX);
            line.setAttribute('y1', pY);
            line.setAttribute('x2', x);
            line.setAttribute('y2', y);
            svgLines.appendChild(line);
        }
    });

    if(reset) {
        logBox.innerText = "Status: Tree built. Ready for DFS.";
        logBox.style.color = "var(--text)";
    }
}

window.onresize = () => parseAndRenderTree(false);
document.getElementById('arrayInput').addEventListener('change', () => parseAndRenderTree(true));

// --- 2. Start Logic ---
function initSearch() {
    if (isRunning) return;
    if (isFound || (processedSet.size >= dataArray.length && dfsStack.length === 0)) {
        resetVisualization();
        return;
    }

    target = document.getElementById('targetInput').value.trim();
    if(!target) { alert("Enter Target"); return; }

    // Initial Push
    if (dfsStack.length === 0 && processedSet.size === 0 && currentProcessingIndex === null) {
        dfsStack.push(0);
        updateVisuals(0, 'in-stack');
        logBox.innerText = `Status: Push Root '${dataArray[0]}' to Stack.`;
        updateStackVisuals();
    }

    isRunning = true;
    timer = setInterval(stepLogic, speed);
}

function pauseSearch() {
    isRunning = false;
    clearInterval(timer);
    logBox.innerText += " (Paused)";
}

// --- 3. Step Logic (DFS) ---
function stepLogic() {
    if (currentProcessingIndex === null && dfsStack.length === 0) {
        pauseSearch();
        logBox.innerText = `Status: Finished. Target '${target}' not found.`;
        logBox.style.color = "var(--danger)";
        return;
    }

    // PHASE 1: Pop from Stack
    if (currentProcessingIndex === null) {
        currentProcessingIndex = dfsStack.pop(); 
        updateStackVisuals();
        
        const val = dataArray[currentProcessingIndex];
        
        // Visual: Current
        updateVisuals(currentProcessingIndex, 'current');
        
        logBox.innerHTML = `POP: Processing Node <b>${val}</b>. Checking match...`;

        // Check Match
        if (val === target) {
            pauseSearch();
            isFound = true;
            updateVisuals(currentProcessingIndex, 'found');
            logBox.innerHTML = `SUCCESS: Found Target <b>${val}</b>!`;
            logBox.style.color = "var(--success)";
            return;
        }

        // Prepare for Phase 2: Push Children
        // FOR PRE-ORDER DFS (Root -> Left -> Right):
        // Stack is LIFO, so we push RIGHT first, then LEFT.
        // This ensures Left is at the top of the stack and popped next.
        
        const left = 2 * currentProcessingIndex + 1;
        const right = 2 * currentProcessingIndex + 2;
        let addedLog = [];

        // Push Right First
        if (right < dataArray.length) {
            dfsStack.push(right);
            updateVisuals(right, 'in-stack');
            addedLog.push(dataArray[right]);
        }

        // Push Left Second
        if (left < dataArray.length) {
            dfsStack.push(left);
            updateVisuals(left, 'in-stack');
            addedLog.unshift(dataArray[left]); // For logging display order
        }

        if(addedLog.length > 0) {
            logBox.innerHTML += `<br>Push children: [${addedLog.join(', ')}].`;
        } else {
             logBox.innerHTML += `<br>Leaf node. Backtracking...`;
        }
        
        updateStackVisuals();
    } 
    else {
        // PHASE 2: Mark Visited
        updateVisuals(currentProcessingIndex, 'visited');
        document.getElementById(`node-${currentProcessingIndex}`).classList.remove('current');
        
        processedSet.add(currentProcessingIndex);
        currentProcessingIndex = null; // Ready to pop next
    }
}

// --- 4. Controls ---
function stepForward() {
    pauseSearch();
    target = document.getElementById('targetInput').value.trim();
    if(!target) { alert("Enter Target"); return; }

    if (dfsStack.length === 0 && processedSet.size === 0 && currentProcessingIndex === null) {
        dfsStack.push(0);
        updateVisuals(0, 'in-stack');
        updateStackVisuals();
        return;
    }

    if(isFound || (dfsStack.length === 0 && currentProcessingIndex === null)) {
         alert("Search Finished"); return;
    }
    stepLogic();
}

function updateVisuals(index, className) {
    const el = document.getElementById(`node-${index}`);
    if(el) {
        if(className === 'visited') {
            el.classList.add('visited');
            el.classList.remove('in-stack');
        } else if (className === 'current') {
            el.classList.add('current');
            el.classList.remove('in-stack');
        } else if (className === 'in-stack') {
            el.classList.add('in-stack');
        } else if (className === 'found') {
            el.classList.remove('current');
            el.classList.add('found');
        }
    }
}

function updateStackVisuals() {
    stackBox.innerHTML = '';
    if(dfsStack.length === 0) {
        stackBox.innerHTML = '<span style="color: #666; margin: auto;">(Empty)</span>';
        return;
    }
    // Render stack. 
    // HTML structure is flex-direction: column-reverse, so appending naturally piles them up.
    dfsStack.forEach(idx => {
        const val = dataArray[idx];
        const item = document.createElement('div');
        item.className = 'stack-item';
        item.innerText = val;
        stackBox.appendChild(item);
    });
}

function resetVisualization() {
    parseAndRenderTree(true);
}

function openTab(lang) {
    document.querySelectorAll('.code-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(lang).classList.add('active');
    
    const buttons = document.querySelectorAll('.tab-btn');
    const langMap = {'c':0, 'cpp':1, 'java':2, 'python':3};
    buttons[langMap[lang]].classList.add('active');
}