// --- State ---
let nodes = []; // {id, x, y, el}
let edges = []; // {from, to, weight, elLine, elText}
let distMatrix = []; // 2D array for logic
let animations = [];
let currentStep = 0;
let isRunning = false;
let isFinished = false;
let timer = null;
let speed = 1000;

// Interaction Mode
let mode = 'node'; // node, edge, edit
let selectedNodeId = null;

// DOM
const container = document.getElementById('graphContainer');
const svgEdges = document.getElementById('svgEdges');
const nodesLayer = document.getElementById('nodesLayer');
const tableObj = document.getElementById('distMatrix');
const logBox = document.getElementById('logBox');
const speedInput = document.getElementById('speedRange');
const speedVal = document.getElementById('speedVal');

const INF = 999; // Using 999 for infinity display

// --- Init ---
speedInput.addEventListener('input', (e) => {
    speed = parseInt(e.target.value);
    speedVal.innerText = (speed/1000).toFixed(1) + "s";
    if(isRunning && !isFinished) {
        clearInterval(timer);
        timer = setInterval(animateStep, speed);
    }
});

// Click Interaction
container.addEventListener('click', (e) => {
    if(e.target === container || e.target === svgEdges) {
        if(mode === 'node') {
            // Limit nodes for Floyd Warshall visual clarity (O(N^3))
            if(nodes.length >= 8) {
                alert("For visual clarity, max 8 nodes recommended.");
                return;
            }
            const rect = container.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            createNode(x, y);
        } else {
            selectedNodeId = null;
            updateNodeVisuals();
        }
    }
});

function setMode(m) {
    mode = m;
    selectedNodeId = null;
    updateNodeVisuals();
    document.querySelectorAll('.btn-mode').forEach(b => b.classList.remove('active'));
    document.getElementById(`btnMode${m.charAt(0).toUpperCase() + m.slice(1)}`).classList.add('active');
    
    let msg = "";
    if(m === 'node') msg = "Click empty space to add Node (Max 8 recommended).";
    if(m === 'edge') msg = "Click two nodes to connect.";
    if(m === 'edit') msg = "Click an edge number to edit weight.";
    logBox.innerText = msg;
}

function createNode(x, y) {
    const id = nodes.length;
    const el = document.createElement('div');
    el.className = 'node';
    el.innerText = id;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.onclick = (e) => handleNodeClick(e, id);
    nodesLayer.appendChild(el);
    nodes.push({ id, x, y, el });
    renderMatrixTable(); // Re-render table on node add
}

function handleNodeClick(e, id) {
    e.stopPropagation();
    if(isRunning) return;

    if (mode === 'edge') {
        if (selectedNodeId === null) {
            selectedNodeId = id;
            nodes[id].el.style.borderColor = "var(--primary)";
        } else {
            if (selectedNodeId !== id) createEdge(selectedNodeId, id);
            selectedNodeId = null;
            updateNodeVisuals();
        }
    }
}

function updateNodeVisuals() {
    nodes.forEach(n => n.el.style.borderColor = "");
}

function createEdge(id1, id2) {
    if(edges.some(e => (e.from===id1 && e.to===id2) || (e.from===id2 && e.to===id1))) return; // Already exists? (Undirected)
    // Actually FW is usually directed, but undirected works too (symmetric). Let's do directed behavior for interaction simplicity, but logic treats it undirected (creates both ways in matrix)
    
    const n1 = nodes[id1];
    const n2 = nodes[id2];
    const weight = Math.floor(Math.sqrt(Math.pow(n2.x - n1.x, 2) + Math.pow(n2.y - n1.y, 2)) / 15);
    
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', n1.x);
    line.setAttribute('y1', n1.y);
    line.setAttribute('x2', n2.x);
    line.setAttribute('y2', n2.y);
    line.id = `edge-${id1}-${id2}`;
    
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', (n1.x + n2.x)/2);
    text.setAttribute('y', (n1.y + n2.y)/2);
    text.setAttribute('class', 'edge-weight');
    text.textContent = weight;
    
    // Edit logic
    const edgeIdx = edges.length;
    text.onclick = (e) => handleEdgeClick(e, edgeIdx);

    svgEdges.appendChild(line);
    svgEdges.appendChild(text);
    
    edges.push({ from: id1, to: id2, weight, elLine: line, elText: text });
    renderMatrixTable(); // Update initial weights
}

function handleEdgeClick(e, idx) {
    e.stopPropagation();
    if(isRunning) return;
    if(mode === 'edit') {
        const edge = edges[idx];
        const newVal = prompt("New Weight:", edge.weight);
        if(newVal !== null && !isNaN(newVal)) {
            edge.weight = parseInt(newVal);
            edge.elText.textContent = edge.weight;
            renderMatrixTable();
        }
    }
}

// --- Matrix Table Renderer ---
function renderMatrixTable() {
    // 1. Init Logic Matrix
    const N = nodes.length;
    distMatrix = Array.from({ length: N }, () => Array(N).fill(INF));
    for(let i=0; i<N; i++) distMatrix[i][i] = 0;
    
    edges.forEach(e => {
        distMatrix[e.from][e.to] = e.weight;
        distMatrix[e.to][e.from] = e.weight; // Undirected
    });

    // 2. Build DOM
    tableObj.innerHTML = '';
    
    // Header Row
    let tr = document.createElement('tr');
    tr.appendChild(document.createElement('th')); // Corner empty
    for(let i=0; i<N; i++) {
        let th = document.createElement('th');
        th.innerText = i;
        tr.appendChild(th);
    }
    tableObj.appendChild(tr);

    // Data Rows
    for(let i=0; i<N; i++) {
        let tr = document.createElement('tr');
        // Row Header
        let th = document.createElement('th');
        th.innerText = i;
        tr.appendChild(th);
        
        for(let j=0; j<N; j++) {
            let td = document.createElement('td');
            td.id = `cell-${i}-${j}`;
            let val = distMatrix[i][j];
            td.innerText = val === INF ? "∞" : val;
            tr.appendChild(td);
        }
        tableObj.appendChild(tr);
    }
}

// --- Floyd-Warshall Logic ---
function runFloyd() {
    const N = nodes.length;
    // Clone distMatrix so we don't mess up the initial state for reset
    let D = JSON.parse(JSON.stringify(distMatrix));
    
    for (let k = 0; k < N; k++) {
        // Animation: Pivot Node
        animations.push({ type: 'PIVOT', k: k });

        for (let i = 0; i < N; i++) {
            for (let j = 0; j < N; j++) {
                // Optimization: Skip if paths don't exist
                if (D[i][k] === INF || D[k][j] === INF) continue;
                if (i === j) continue; // Skip diagonals

                // Animation: Check
                animations.push({ type: 'CHECK', i, j, k, d_ik: D[i][k], d_kj: D[k][j], d_ij: D[i][j] });

                if (D[i][k] + D[k][j] < D[i][j]) {
                    D[i][j] = D[i][k] + D[k][j];
                    
                    // Animation: Update
                    animations.push({ type: 'UPDATE', i, j, val: D[i][j] });
                }
            }
        }
    }
    animations.push({ type: 'FINISHED' });
}

// --- Animation ---
function animateStep() {
    if (currentStep >= animations.length) {
        pauseViz();
        return;
    }

    const action = animations[currentStep];

    // Clear previous check/update highlights from TABLE
    document.querySelectorAll('td').forEach(td => td.classList.remove('cell-check', 'cell-update'));
    // Clear previous edge highlights from GRAPH
    edges.forEach(e => e.elLine.classList.remove('checking', 'update'));

    if (action.type === 'PIVOT') {
        // Highlight Pivot Node k
        nodes.forEach(n => n.el.classList.remove('pivot'));
        nodes[action.k].el.classList.add('pivot');
        logBox.innerHTML = `Pivot Node k = <b>${action.k}</b>. Looking for shortcuts via Node ${action.k}.`;
    }
    else if (action.type === 'CHECK') {
        const { i, j, k } = action;
        
        // Highlight Matrix Cells involved
        highlightCell(i, k, 'cell-check'); // dist[i][k]
        highlightCell(k, j, 'cell-check'); // dist[k][j]
        highlightCell(i, j, 'cell-check'); // dist[i][j] (target)
        
        // Highlight Graph Edges (path i->k and k->j)
        highlightEdge(i, k, 'checking');
        highlightEdge(k, j, 'checking');

        let sum = action.d_ik + action.d_kj;
        let current = action.d_ij === INF ? "∞" : action.d_ij;
        logBox.innerHTML = `Checking: dist[${i}][${k}] (${action.d_ik}) + dist[${k}][${j}] (${action.d_kj}) < dist[${i}][${j}] (${current})? <br> Sum: ${sum}`;
    }
    else if (action.type === 'UPDATE') {
        const { i, j, val } = action;
        
        const cell = document.getElementById(`cell-${i}-${j}`);
        cell.innerText = val;
        cell.classList.add('cell-update');
        
        // Highlight the "Shortcut" edge (direct or virtual) i->j green? 
        // In FW, the 'edge' i->j might not exist physically, it represents a path.
        // We can try to highlight the physical edge if it exists.
        highlightEdge(i, j, 'update');

        logBox.innerHTML = `<b>UPDATE!</b> New shortest distance ${i} -> ${j} is <b>${val}</b>.`;
    }
    else if (action.type === 'FINISHED') {
        isFinished = true;
        pauseViz();
        nodes.forEach(n => n.el.classList.remove('pivot'));
        logBox.innerHTML = `<b>Algorithm Complete!</b> Final Matrix shown.`;
        return;
    }

    currentStep++;
}

function highlightCell(r, c, cls) {
    const cell = document.getElementById(`cell-${r}-${c}`);
    if(cell) cell.classList.add(cls);
}

function highlightEdge(u, v, cls) {
    // Find edge u-v or v-u
    const edge = edges.find(e => (e.from===u && e.to===v) || (e.from===v && e.to===u));
    if(edge) edge.elLine.classList.add(cls);
}

// --- Utils ---
function initFloyd() {
    if (nodes.length === 0) {
        logBox.innerText = "Please generate a graph first.";
        return;
    }
    if (isRunning) return;
    if (isFinished) resetGraphStatus();
    
    if (currentStep === 0) {
        animations = [];
        runFloyd();
    }
    
    isRunning = true;
    timer = setInterval(animateStep, speed);
}

function pauseViz() { isRunning = false; clearInterval(timer); }
function stepForward() { pauseViz(); if(!isFinished) { if(currentStep===0) initFloyd(); animateStep(); } }

function resetGraphStatus() {
    pauseViz();
    currentStep = 0;
    isFinished = false;
    animations = [];
    nodes.forEach(n => n.el.classList.remove('pivot'));
    renderMatrixTable(); // Reset table to initial weights
    logBox.innerText = "Status Reset.";
}

function clearGraph() {
    resetGraphStatus();
    nodesLayer.innerHTML = '';
    svgEdges.innerHTML = '';
    nodes = [];
    edges = [];
    tableObj.innerHTML = '';
    logBox.innerText = "Cleared.";
}

function generateRandomGraph() {
    clearGraph();
    // 5 nodes for good matrix size
    for(let i=0; i<5; i++) {
        createNode(100 + Math.random()*400, 50 + Math.random()*400);
    }
    // Connect them
    for(let i=0; i<nodes.length; i++) {
        for(let j=i+1; j<nodes.length; j++) {
            const dist = Math.sqrt(Math.pow(nodes[i].x - nodes[j].x, 2) + Math.pow(nodes[i].y - nodes[j].y, 2));
            if(dist < 300) createEdge(i, j);
        }
    }
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