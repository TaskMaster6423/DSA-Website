// --- State ---
let treeData = {}; 
let animations = [];
let currentStep = 0;
let isRunning = false;
let isFinished = false;
let timer = null;
let speed = 1000;

const NEG_INF = -Infinity;
const POS_INF = Infinity;

// DOM
const container = document.getElementById('treeContainer');
const treeWrapper = document.getElementById('treeWrapper');
const svgLines = document.getElementById('svgLines');
const logBox = document.getElementById('logBox');
const speedInput = document.getElementById('speedRange');
const speedVal = document.getElementById('speedVal');
const rootToggle = document.getElementById('rootToggle');

window.onload = () => generateTree();
window.onresize = drawLines;

speedInput.addEventListener('input', (e) => {
    speed = parseInt(e.target.value);
    speedVal.innerText = (speed/1000).toFixed(1) + "s";
    if(isRunning && !isFinished) {
        clearInterval(timer);
        timer = setInterval(animateStep, speed);
    }
});

// Regenerate immediately on toggle
rootToggle.addEventListener('change', generateTree);

// --- 1. Tree Generation ---
function generateTree() {
    pauseSearch();
    currentStep = 0;
    animations = [];
    isFinished = false;
    
    const depth = parseInt(document.getElementById('depthInput').value);
    const branching = parseInt(document.getElementById('branchInput').value);
    const isRootMax = rootToggle.checked;
    
    // Clean Slate
    treeWrapper.innerHTML = '';
    // Re-add SVG to wrapper because innerHTML cleared it
    const newSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    newSvg.id = 'svgLines';
    treeWrapper.appendChild(newSvg);
    
    // Build Data & DOM
    treeData = buildRecursiveTree(0, depth, branching, isRootMax);
    const treeDOM = createTreeElement(treeData);
    treeWrapper.appendChild(treeDOM);
    
    // Wait for layout to calculate lines
    setTimeout(() => {
        drawLines();
        alphaBeta(treeData, depth, NEG_INF, POS_INF, isRootMax);
        const type = isRootMax ? "Maximizer" : "Minimizer";
        logBox.innerText = `Tree Generated. Root is ${type}. Ready to Prune.`;
    }, 100);
}

function buildRecursiveTree(currentDepth, maxDepth, branching, isMax) {
    let node = {
        id: `node-${Math.random().toString(36).substr(2, 9)}`,
        value: null,
        children: [],
        isMax: isMax,
        depth: currentDepth
    };

    if (currentDepth === maxDepth) {
        node.value = Math.floor(Math.random() * 50) - 25; 
    } else {
        for (let i = 0; i < branching; i++) {
            node.children.push(buildRecursiveTree(currentDepth + 1, maxDepth, branching, !isMax));
        }
    }
    return node;
}

function createTreeElement(nodeData) {
    const subtreeDiv = document.createElement('div');
    subtreeDiv.className = 'tree-subtree';

    const nodeDiv = document.createElement('div');
    nodeDiv.className = `node ${nodeData.isMax ? 'maximizer' : 'minimizer'}`;
    nodeDiv.id = nodeData.id;
    
    const valSpan = document.createElement('span');
    valSpan.className = 'node-value';
    valSpan.innerText = nodeData.children.length === 0 ? nodeData.value : '?';
    nodeDiv.appendChild(valSpan);

    const abLabel = document.createElement('div');
    abLabel.className = 'ab-label';
    abLabel.id = `ab-${nodeData.id}`;
    abLabel.innerText = `[-∞, +∞]`;
    nodeDiv.appendChild(abLabel);

    subtreeDiv.appendChild(nodeDiv);

    if (nodeData.children.length > 0) {
        const childrenDiv = document.createElement('div');
        childrenDiv.className = 'tree-children';
        nodeData.children.forEach(child => {
            childrenDiv.appendChild(createTreeElement(child));
        });
        subtreeDiv.appendChild(childrenDiv);
    }
    return subtreeDiv;
}

// --- LINE DRAWING FIX ---
function drawLines() {
    const svg = document.getElementById('svgLines');
    if(!svg) return;
    svg.innerHTML = '';
    
    // Loop through all nodes to draw lines to children
    // We use a simple queue traversal
    let queue = [treeData];
    
    // Helper to find absolute position relative to treeWrapper
    function getCenter(element) {
        // Since treeWrapper is relative, and element is inside it:
        // We can find position by subtracting wrapper's rect from element's rect.
        // Or recursively adding offsetTop/Left.
        // Simple bounding rect math is safest here.
        const wrapperRect = treeWrapper.getBoundingClientRect();
        const elRect = element.getBoundingClientRect();
        
        return {
            x: (elRect.left - wrapperRect.left) + (elRect.width / 2),
            y: (elRect.top - wrapperRect.top) + (elRect.height / 2)
        };
    }

    while(queue.length > 0) {
        let parent = queue.shift();
        const pEl = document.getElementById(parent.id);
        
        if(pEl && parent.children.length > 0) {
            const pCenter = getCenter(pEl);
            // Parent connects from Bottom
            const x1 = pCenter.x;
            const y1 = pCenter.y + (pEl.offsetHeight / 2); // Bottom edge

            parent.children.forEach(child => {
                const cEl = document.getElementById(child.id);
                if(cEl) {
                    const cCenter = getCenter(cEl);
                    // Child connects at Top
                    const x2 = cCenter.x;
                    const y2 = cCenter.y - (cEl.offsetHeight / 2); // Top edge

                    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                    line.setAttribute('x1', x1);
                    line.setAttribute('y1', y1);
                    line.setAttribute('x2', x2);
                    line.setAttribute('y2', y2);
                    line.id = `line-${parent.id}-${child.id}`;
                    svg.appendChild(line);
                }
                queue.push(child);
            });
        }
    }
}

// --- 2. Algorithm Logic ---
function alphaBeta(node, depth, alpha, beta, isMax) {
    animations.push({ type: 'VISIT', nodeId: node.id, alpha, beta });

    if (node.children.length === 0) {
        animations.push({ type: 'RETURN', nodeId: node.id, value: node.value });
        return node.value;
    }

    if (isMax) {
        let best = NEG_INF;
        for (let i = 0; i < node.children.length; i++) {
            let child = node.children[i];
            animations.push({ type: 'EDGE_ACTIVE', pId: node.id, cId: child.id });
            
            let val = alphaBeta(child, depth - 1, alpha, beta, false);
            best = Math.max(best, val);
            alpha = Math.max(alpha, best);
            
            animations.push({ type: 'UPDATE_MAX', nodeId: node.id, value: best, alpha, beta });

            if (beta <= alpha) {
                // Prune siblings
                for(let j = i+1; j < node.children.length; j++) {
                    markPruned(node.children[j], node.id);
                }
                break; 
            }
        }
        animations.push({ type: 'RETURN', nodeId: node.id, value: best });
        return best;
    } else {
        let best = POS_INF;
        for (let i = 0; i < node.children.length; i++) {
            let child = node.children[i];
            animations.push({ type: 'EDGE_ACTIVE', pId: node.id, cId: child.id });
            
            let val = alphaBeta(child, depth - 1, alpha, beta, true);
            best = Math.min(best, val);
            beta = Math.min(beta, best);
            
            animations.push({ type: 'UPDATE_MIN', nodeId: node.id, value: best, alpha, beta });

            if (beta <= alpha) {
                for(let j = i+1; j < node.children.length; j++) {
                    markPruned(node.children[j], node.id);
                }
                break;
            }
        }
        animations.push({ type: 'RETURN', nodeId: node.id, value: best });
        return best;
    }
}

function markPruned(node, parentId) {
    animations.push({ type: 'PRUNE', nodeId: node.id, parentId: parentId });
    node.children.forEach(child => markPruned(child, node.id));
}

// --- 3. Animation ---
function animateStep() {
    if (currentStep >= animations.length) {
        isFinished = true;
        pauseSearch();
        logBox.innerText = "Algorithm Finished.";
        return;
    }

    const action = animations[currentStep];
    const nodeEl = document.getElementById(action.nodeId);
    
    document.querySelectorAll('.node').forEach(n => n.classList.remove('active'));
    if(nodeEl) nodeEl.classList.add('active');

    if (action.type === 'VISIT') {
        if(nodeEl) {
            nodeEl.classList.add('visited');
            updateABLabel(action.nodeId, action.alpha, action.beta);
        }
        logBox.innerHTML = `Visiting. Bounds: [${fmt(action.alpha)}, ${fmt(action.beta)}]`;
    }
    else if (action.type === 'EDGE_ACTIVE') {
        const line = document.getElementById(`line-${action.pId}-${action.cId}`);
        if(line) line.classList.add('active');
    }
    else if (action.type === 'UPDATE_MAX' || action.type === 'UPDATE_MIN') {
        if(nodeEl) {
            nodeEl.querySelector('.node-value').innerText = action.value;
            updateABLabel(action.nodeId, action.alpha, action.beta);
        }
        logBox.innerHTML = `Value Update: <b>${action.value}</b>.`;
    }
    else if (action.type === 'PRUNE') {
        const pNode = document.getElementById(action.nodeId);
        if(pNode) {
            pNode.classList.add('pruned');
            const line = document.getElementById(`line-${action.parentId}-${action.nodeId}`);
            if(line) line.classList.add('pruned');
        }
        logBox.innerHTML = `Pruning branch (Beta <= Alpha).`;
    }
    else if (action.type === 'RETURN') {
        logBox.innerHTML = `Returning value <b>${action.value}</b>.`;
    }

    currentStep++;
}

function updateABLabel(id, a, b) {
    const lbl = document.getElementById(`ab-${id}`);
    if(lbl) lbl.innerText = `[${fmt(a)}, ${fmt(b)}]`;
}

function fmt(val) {
    if(val === NEG_INF) return '-∞';
    if(val === POS_INF) return '+∞';
    return val;
}

// --- Controls ---
function initSearch() {
    if (isRunning) return;
    if (isFinished) { resetVisualization(); return; }
    isRunning = true;
    timer = setInterval(animateStep, speed);
}

function pauseSearch() { isRunning = false; clearInterval(timer); }
function stepForward() { pauseSearch(); if(!isFinished) animateStep(); }
function resetVisualization() { generateTree(); }

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