// --- State ---
let nodes = []; // {id, x, y, el}
let edges = []; // {from, to, weight, elLine, elText}
let startNodeId = null;
let endNodeId = null;
let mode = 'node'; // node, edge, start, end
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
    
    // Dist Label
    const distLbl = document.createElement('div');
    distLbl.className = 'node-dist';
    distLbl.id = `dist-${id}`;
    distLbl.innerText = "∞";
    el.appendChild(distLbl);

    nodesLayer.appendChild(el);
    nodes.push({ id, x, y, el });
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
    
    // Weight = Distance / 10
    const weight = Math.floor(Math.sqrt(Math.pow(n2.x - n1.x, 2) + Math.pow(n2.y - n1.y, 2)) / 10);
    
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

    svgEdges.appendChild(line);
    svgEdges.appendChild(text);
    
    edges.push({ from: id1, to: id2, weight, elLine: line });
}

// --- Dijkstra Logic ---
function runDijkstra() {
    if(startNodeId === null) {
        logBox.innerText = "Please select a Start Node.";
        return;
    }

    let dist = {};
    let parent = {};
    let pq = []; // {id, d}
    
    nodes.forEach(n => dist[n.id] = Infinity);
    dist[startNodeId] = 0;
    
    pq.push({ id: startNodeId, d: 0 });

    while(pq.length > 0) {
        // Sort to simulate Priority Queue (Smallest distance first)
        pq.sort((a, b) => a.d - b.d);
        let u = pq.shift().id;

        // If we reached End node (optional optimization: stop here)
        if (endNodeId !== null && u === endNodeId) {
            animations.push({ type: 'VISIT', id: u, dist: dist[u] });
            break; 
        }

        animations.push({ type: 'VISIT', id: u, dist: dist[u] });

        // Get Neighbors
        let myEdges = edges.filter(e => e.from === u || e.to === u);
        
        for (let edge of myEdges) {
            let v = (edge.from === u) ? edge.to : edge.from;
            let weight = edge.weight;
            
            // Animation: Scanning Edge
            animations.push({ type: 'SCAN_EDGE', edge: edge });

            // Relaxation
            if (dist[u] + weight < dist[v]) {
                dist[v] = dist[u] + weight;
                parent[v] = u;
                
                // Add/Update Priority Queue
                let existing = pq.find(item => item.id === v);
                if(existing) {
                    existing.d = dist[v];
                } else {
                    pq.push({ id: v, d: dist[v] });
                }

                animations.push({ type: 'UPDATE', id: v, dist: dist[v] });
            }
        }
    }

    // Path Reconstruction
    if (endNodeId !== null && dist[endNodeId] !== Infinity) {
        let curr = endNodeId;
        let pathEdges = [];
        while(curr !== startNodeId) {
            let p = parent[curr];
            let e = edges.find(edge => (edge.from===p && edge.to===curr) || (edge.from===curr && edge.to===p));
            pathEdges.push(e);
            curr = p;
        }
        // Reverse for animation flow
        pathEdges.reverse().forEach(e => {
            animations.push({ type: 'PATH', edge: e });
        });
        animations.push({ type: 'FINISHED', found: true, dist: dist[endNodeId] });
    } else {
        animations.push({ type: 'FINISHED', found: false });
    }
}

// --- Animation ---
function animateStep() {
    if (currentStep >= animations.length) {
        pauseSearch();
        return;
    }

    const action = animations[currentStep];

    if (action.type === 'VISIT') {
        const el = nodes[action.id].el;
        el.classList.add('visited');
        el.classList.remove('scanning'); // remove old scanning style if any
        document.getElementById(`dist-${action.id}`).innerText = action.dist;
        logBox.innerHTML = `Visiting Node <b>${action.id}</b> (Distance: ${action.dist})`;
    }
    else if (action.type === 'SCAN_EDGE') {
        action.edge.elLine.classList.add('scanning');
        setTimeout(() => action.edge.elLine.classList.remove('scanning'), speed * 0.5);
    }
    else if (action.type === 'UPDATE') {
        const el = nodes[action.id].el;
        // Flash Scanning color
        el.classList.add('scanning');
        setTimeout(() => el.classList.remove('scanning'), speed * 0.8);
        document.getElementById(`dist-${action.id}`).innerText = action.dist;
        logBox.innerHTML = `Updated Node <b>${action.id}</b> to Distance <b>${action.dist}</b>`;
    }
    else if (action.type === 'PATH') {
        action.edge.elLine.classList.add('path-edge');
    }
    else if (action.type === 'FINISHED') {
        isFinished = true;
        pauseSearch();
        if(action.found) {
            logBox.innerText = `Shortest Path Found! Total Distance: ${action.dist}`;
            logBox.style.color = "#a6e3a1";
        } else {
            logBox.innerText = "No path found.";
        }
        return;
    }

    currentStep++;
}

// --- Utils ---
function initDijkstra() {
    if (isRunning) return;
    if (isFinished) resetGraphStatus();
    if (currentStep === 0) {
        animations = [];
        runDijkstra();
    }
    isRunning = true;
    timer = setInterval(animateStep, speed);
}

function pauseSearch() { isRunning = false; clearInterval(timer); }
function stepForward() { pauseSearch(); if(!isFinished) { if(currentStep===0) runDijkstra(); animateStep(); } }

function resetGraphStatus() {
    pauseSearch();
    currentStep = 0;
    isFinished = false;
    animations = [];
    
    nodes.forEach(n => {
        n.el.classList.remove('visited', 'scanning', 'path');
        const lbl = document.getElementById(`dist-${n.id}`);
        lbl.innerText = "∞";
        if(n.id === startNodeId) lbl.innerText = "0";
    });
    edges.forEach(e => e.elLine.classList.remove('path-edge', 'scanning'));
    logBox.innerText = "Status Reset.";
    logBox.style.color = "var(--text)";
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
    for(let i=0; i<8; i++) {
        createNode(50 + Math.random()*800, 50 + Math.random()*350);
    }
    for(let i=0; i<nodes.length; i++) {
        for(let j=i+1; j<nodes.length; j++) {
            const dist = Math.sqrt(Math.pow(nodes[i].x - nodes[j].x, 2) + Math.pow(nodes[i].y - nodes[j].y, 2));
            if(dist < 250) createEdge(i, j);
        }
    }
    // Ensure Connectivity
    for(let i=0; i<nodes.length-1; i++) createEdge(i, i+1);

    startNodeId = 0; nodes[0].el.classList.add('start');
    endNodeId = nodes.length-1; nodes[nodes.length-1].el.classList.add('end');
    document.getElementById(`dist-0`).innerText = "0";
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