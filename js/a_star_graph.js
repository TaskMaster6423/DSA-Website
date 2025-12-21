// --- State ---
let nodes = []; // {id, x, y, el}
let edges = []; // {fromId, toId, weight, elLine, elText}
let startNodeId = null;
let endNodeId = null;
let mode = 'node'; // node, edge, start, end, edit
let selectedNodeId = null; 

let animations = [];
let currentStep = 0;
let isRunning = false;
let isFinished = false;
let timer = null;
let speed = 1000;

// DOM
const container = document.getElementById('graphContainer');
const svgEdges = document.getElementById('svgEdges');
const nodesLayer = document.getElementById('nodesLayer');
const logBox = document.getElementById('logBox');
const speedInput = document.getElementById('speedRange');
const speedVal = document.getElementById('speedVal');

// --- Init ---
speedInput.addEventListener('input', (e) => {
    speed = parseInt(e.target.value);
    speedVal.innerText = (speed/1000).toFixed(1) + "s";
    if(isRunning && !isFinished) {
        clearInterval(timer);
        timer = setInterval(animateStep, speed);
    }
});

// Click Interaction on Container
container.addEventListener('click', (e) => {
    if(e.target === container || e.target === svgEdges) {
        if(mode === 'node') {
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

// Mode Setting
function setMode(m) {
    mode = m;
    selectedNodeId = null;
    updateNodeVisuals();
    document.querySelectorAll('.btn-mode').forEach(b => b.classList.remove('active'));
    document.getElementById(`btnMode${m.charAt(0).toUpperCase() + m.slice(1)}`).classList.add('active');
    
    let msg = "";
    if(m === 'node') msg = "Click anywhere to create a Node.";
    if(m === 'edge') msg = "Click two nodes to connect them.";
    if(m === 'start') msg = "Click a node to set as Start.";
    if(m === 'end') msg = "Click a node to set as End.";
    if(m === 'edit') msg = "Click on an edge number to change its weight.";
    logBox.innerText = msg;
}

function createNode(x, y) {
    const id = nodes.length;
    const nodeData = { id, x, y };
    
    const el = document.createElement('div');
    el.className = 'node';
    el.innerText = id;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.onclick = (e) => handleNodeClick(e, id);
    
    const info = document.createElement('div');
    info.className = 'node-info';
    info.id = `info-${id}`;
    el.appendChild(info);

    nodesLayer.appendChild(el);
    nodes.push({ ...nodeData, el });
}

function handleNodeClick(e, id) {
    e.stopPropagation();
    if(isRunning) return;

    if (mode === 'start') {
        if(startNodeId !== null) nodes[startNodeId].el.classList.remove('start');
        startNodeId = id;
        nodes[id].el.classList.add('start');
    }
    else if (mode === 'end') {
        if(endNodeId !== null) nodes[endNodeId].el.classList.remove('end');
        endNodeId = id;
        nodes[id].el.classList.add('end');
    }
    else if (mode === 'edge') {
        if (selectedNodeId === null) {
            selectedNodeId = id;
            nodes[id].el.style.borderColor = "var(--primary)";
        } else {
            if (selectedNodeId !== id) {
                createEdge(selectedNodeId, id);
            }
            selectedNodeId = null;
            updateNodeVisuals();
        }
    }
}

function updateNodeVisuals() {
    nodes.forEach(n => {
        n.el.style.borderColor = "";
        if(n.id === startNodeId) n.el.classList.add('start');
        else if(n.id === endNodeId) n.el.classList.add('end');
    });
}

function createEdge(id1, id2) {
    if(edges.some(e => (e.from===id1 && e.to===id2) || (e.from===id2 && e.to===id1))) return;

    const n1 = nodes[id1];
    const n2 = nodes[id2];
    
    const dist = Math.floor(Math.sqrt(Math.pow(n2.x - n1.x, 2) + Math.pow(n2.y - n1.y, 2)) / 10);
    
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
    text.textContent = dist;
    
    // --- NEW: Edit Click Handler ---
    // Pass the index of this edge in the array
    const edgeIndex = edges.length; // It will be pushed next
    text.onclick = (e) => handleEdgeClick(e, edgeIndex);

    svgEdges.appendChild(line);
    svgEdges.appendChild(text);
    
    edges.push({ from: id1, to: id2, weight: dist, elLine: line, elText: text });
}

// --- Logic for Editing Weights ---
function handleEdgeClick(e, idx) {
    e.stopPropagation();
    if(isRunning) return;
    
    if(mode === 'edit') {
        const edge = edges[idx];
        const newVal = prompt(`Enter new weight for edge ${edge.from}-${edge.to}:`, edge.weight);
        if(newVal !== null && !isNaN(newVal) && newVal.trim() !== "") {
            edge.weight = parseInt(newVal);
            edge.elText.textContent = edge.weight;
            // Note: Manual weight might make A* heuristic inadmissible (not shortest path guaranteed if weight < straight line dist)
            // But for a visualizer, we respect user input.
        }
    }
}

// --- A* Algorithm ---
function runAStar() {
    if(startNodeId === null || endNodeId === null) {
        logBox.innerText = "Error: Set Start and End nodes first.";
        return;
    }

    let openSet = [];
    let closedSet = new Set();
    let gScore = {}; 
    let fScore = {}; 
    let parent = {};

    nodes.forEach(n => { gScore[n.id] = Infinity; fScore[n.id] = Infinity; });
    
    gScore[startNodeId] = 0;
    fScore[startNodeId] = heuristic(nodes[startNodeId], nodes[endNodeId]);
    openSet.push({ id: startNodeId, f: fScore[startNodeId] });

    while (openSet.length > 0) {
        openSet.sort((a, b) => a.f - b.f);
        let current = openSet.shift().id;

        if(current !== startNodeId && current !== endNodeId) {
            animations.push({ type: 'CLOSED', id: current, f: fScore[current] });
        }

        if (current === endNodeId) {
            let path = [];
            let curr = endNodeId;
            while(parent[curr] !== undefined) {
                path.push({ from: parent[curr], to: curr });
                curr = parent[curr];
            }
            path.reverse();
            path.forEach(edge => {
                animations.push({ type: 'PATH', from: edge.from, to: edge.to });
            });
            animations.push({ type: 'FINISHED', found: true });
            return;
        }

        closedSet.add(current);

        let myNeighbors = edges.filter(e => e.from === current || e.to === current);
        
        for (let edge of myNeighbors) {
            let neighborId = edge.from === current ? edge.to : edge.from;
            
            if (closedSet.has(neighborId)) continue;

            let tentativeG = gScore[current] + edge.weight;
            
            if (tentativeG < gScore[neighborId]) {
                parent[neighborId] = current;
                gScore[neighborId] = tentativeG;
                fScore[neighborId] = gScore[neighborId] + heuristic(nodes[neighborId], nodes[endNodeId]);
                
                let existing = openSet.find(x => x.id === neighborId);
                if (!existing) {
                    openSet.push({ id: neighborId, f: fScore[neighborId] });
                    if(neighborId !== endNodeId) {
                        animations.push({ type: 'OPEN', id: neighborId, f: fScore[neighborId] });
                    }
                } else {
                    existing.f = fScore[neighborId];
                }
            }
        }
    }
    
    animations.push({ type: 'FINISHED', found: false });
}

function heuristic(a, b) {
    return Math.floor(Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2)) / 10);
}

// --- Animation ---
function animateStep() {
    if (currentStep >= animations.length) {
        pauseSearch();
        return;
    }

    const action = animations[currentStep];
    
    if (action.type === 'OPEN') {
        const el = nodes[action.id].el;
        el.classList.add('open');
        document.getElementById(`info-${action.id}`).innerText = `F:${action.f}`;
    }
    else if (action.type === 'CLOSED') {
        const el = nodes[action.id].el;
        el.classList.remove('open');
        el.classList.add('closed');
    }
    else if (action.type === 'PATH') {
        const id1 = action.from;
        const id2 = action.to;
        const edgeObj = edges.find(e => (e.from===id1 && e.to===id2) || (e.from===id2 && e.to===id1));
        if(edgeObj) edgeObj.elLine.classList.add('path-edge');
        
        if(id2 !== endNodeId) nodes[id2].el.classList.add('path');
    }
    else if (action.type === 'FINISHED') {
        isFinished = true;
        pauseSearch();
        logBox.innerText = action.found ? "Path Found!" : "No Path.";
        return;
    }

    currentStep++;
}

// --- Utils ---
function initSearch() {
    if (isRunning) return;
    if (isFinished) resetGraphStatus();
    
    if (currentStep === 0) {
        animations = [];
        runAStar();
    }
    isRunning = true;
    timer = setInterval(animateStep, speed);
    logBox.innerText = "Running A*...";
}

function pauseSearch() { isRunning = false; clearInterval(timer); }
function stepForward() { pauseSearch(); if(!isFinished) { if(currentStep===0) runAStar(); animateStep(); } }

function resetGraphStatus() {
    pauseSearch();
    currentStep = 0;
    isFinished = false;
    animations = [];
    nodes.forEach(n => {
        n.el.classList.remove('open', 'closed', 'path');
        document.getElementById(`info-${n.id}`).innerText = "";
    });
    edges.forEach(e => e.elLine.classList.remove('path-edge'));
    logBox.innerText = "Status Reset.";
}

function clearGraph() {
    resetGraphStatus();
    nodesLayer.innerHTML = '';
    svgEdges.innerHTML = '';
    nodes = [];
    edges = [];
    startNodeId = null;
    endNodeId = null;
}

function generateRandomGraph() {
    clearGraph();
    // Generate scattered nodes
    for(let i=0; i<8; i++) {
        createNode(50 + Math.random()*800, 50 + Math.random()*350);
    }
    // Connect them
    for(let i=0; i<nodes.length; i++) {
        for(let j=i+1; j<nodes.length; j++) {
            const dist = heuristic(nodes[i], nodes[j]);
            if(dist < 25) { 
                createEdge(i, j);
            }
        }
    }
    // Ensure basic path
    for(let i=0; i<nodes.length-1; i++) {
        createEdge(i, i+1);
    }
    
    startNodeId = 0; nodes[0].el.classList.add('start');
    endNodeId = nodes.length-1; nodes[nodes.length-1].el.classList.add('end');
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