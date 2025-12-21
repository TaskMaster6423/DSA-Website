// --- State ---
let nodes = []; // {id, x, y, el}
let edges = []; // {u, v, weight, elLine, elText}
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

// --- Graph Generation ---
function createNode(x, y, id) {
    const el = document.createElement('div');
    el.className = 'node';
    el.innerText = id;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    
    const info = document.createElement('div');
    info.className = 'node-info';
    info.id = `info-${id}`;
    el.appendChild(info);

    nodesLayer.appendChild(el);
    nodes.push({ id, x, y, el });
}

function createEdge(u, v) {
    if(edges.some(e => (e.u===u && e.v===v) || (e.u===v && e.v===u))) return;

    const n1 = nodes[u];
    const n2 = nodes[v];
    
    // Distance as weight
    const weight = Math.floor(Math.sqrt(Math.pow(n2.x - n1.x, 2) + Math.pow(n2.y - n1.y, 2)) / 5);
    
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', n1.x);
    line.setAttribute('y1', n1.y);
    line.setAttribute('x2', n2.x);
    line.setAttribute('y2', n2.y);
    line.id = `edge-${u}-${v}`;
    
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', (n1.x + n2.x)/2);
    text.setAttribute('y', (n1.y + n2.y)/2);
    text.setAttribute('class', 'edge-weight');
    text.textContent = weight;

    svgEdges.appendChild(line);
    svgEdges.appendChild(text);
    
    edges.push({ u, v, weight, elLine: line, id: edges.length });
}

function generateRandomGraph() {
    clearGraph();
    // Nodes
    for(let i=0; i<8; i++) {
        createNode(50 + Math.random()*800, 50 + Math.random()*350, i);
    }
    // Edges
    for(let i=0; i<nodes.length; i++) {
        for(let j=i+1; j<nodes.length; j++) {
            const dist = Math.sqrt(Math.pow(nodes[i].x - nodes[j].x, 2) + Math.pow(nodes[i].y - nodes[j].y, 2));
            if(dist < 250) { 
                createEdge(i, j);
            }
        }
    }
    // Connectivity
    for(let i=0; i<nodes.length-1; i++) {
        createEdge(i, i+1);
    }
    logBox.innerText = `Graph Generated: ${nodes.length} Nodes, ${edges.length} Edges.`;
}

function clearGraph() {
    pauseViz();
    nodesLayer.innerHTML = '';
    svgEdges.innerHTML = '';
    nodes = [];
    edges = [];
    logBox.innerText = "Cleared.";
}

// --- Prim's Logic ---
function runPrim() {
    let parent = Array(nodes.length).fill(-1);
    let key = Array(nodes.length).fill(Infinity);
    let mstSet = Array(nodes.length).fill(false);
    
    // Start at Node 0
    key[0] = 0;
    
    // Total steps = number of vertices
    for (let count = 0; count < nodes.length; count++) {
        
        // Pick min key vertex
        let u = -1;
        let min = Infinity;
        
        for (let v = 0; v < nodes.length; v++) {
            if (!mstSet[v] && key[v] < min) {
                min = key[v];
                u = v;
            }
        }

        if (u === -1) break; // Disconnected graph or done

        // Add to MST
        mstSet[u] = true;
        animations.push({ type: 'ADD_NODE', u: u, parent: parent[u] });

        // Update Neighbors
        let myEdges = edges.filter(e => e.u === u || e.v === u);
        
        for (let e of myEdges) {
            let v = (e.u === u) ? e.v : e.u;
            
            if (!mstSet[v]) {
                animations.push({ type: 'SCAN', edge: e });
                
                if (e.weight < key[v]) {
                    parent[v] = u;
                    key[v] = e.weight;
                    animations.push({ type: 'UPDATE_KEY', u: v, val: e.weight, edge: e });
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
    
    if (action.type === 'ADD_NODE') {
        const nodeEl = nodes[action.u].el;
        nodeEl.classList.add('visited');
        
        // Highlight the edge connecting to parent
        if (action.parent !== -1) {
            const p = action.parent;
            const u = action.u;
            const edgeObj = edges.find(e => (e.u===p && e.v===u) || (e.u===u && e.v===p));
            if(edgeObj) {
                edgeObj.elLine.classList.remove('candidate', 'scanning');
                edgeObj.elLine.classList.add('mst');
            }
        }
        logBox.innerHTML = `Added Node <b>${action.u}</b> to MST.`;
    }
    else if (action.type === 'SCAN') {
        action.edge.elLine.classList.add('scanning');
        setTimeout(() => action.edge.elLine.classList.remove('scanning'), speed * 0.8);
    }
    else if (action.type === 'UPDATE_KEY') {
        // Find previous candidate edges for node u and remove 'candidate' class?
        // Actually, Prim's only keeps ONE best edge per node.
        // We should visually clear old candidate for this specific node if we are being fancy, 
        // but adding 'candidate' to the new one is enough for visualization flow.
        
        // Clean old candidate edges connected to this specific node 'v' 
        // (Visual polish: find edges connected to u where u is the target, remove candidate)
        // For simplicity, we just mark the new best one.
        
        action.edge.elLine.classList.add('candidate');
        
        const info = document.getElementById(`info-${action.u}`);
        info.innerText = `Key:${action.val}`;
        info.classList.add('show');
        
        logBox.innerHTML = `New best path to Node <b>${action.u}</b> via edge weight <b>${action.val}</b>.`;
    }
    else if (action.type === 'FINISHED') {
        isFinished = true;
        pauseViz();
        logBox.innerHTML = `<b>MST Construction Complete!</b>`;
        return;
    }

    currentStep++;
}

// --- Utils ---
function initPrim() {
    if (nodes.length === 0) {
        logBox.innerText = "Please generate a graph first.";
        return;
    }
    if (isRunning) return;
    if (isFinished) resetGraphStatus();
    
    if (currentStep === 0) {
        animations = [];
        runPrim();
    }
    
    isRunning = true;
    timer = setInterval(animateStep, speed);
}

function pauseViz() { isRunning = false; clearInterval(timer); }
function stepForward() { 
    pauseViz(); 
    if(!isFinished) { 
        if(currentStep===0) initPrim(); 
        animateStep(); 
    } 
}

function resetGraphStatus() {
    pauseViz();
    currentStep = 0;
    isFinished = false;
    animations = [];
    
    // CSS reset
    edges.forEach(e => e.elLine.classList.remove('scanning', 'mst', 'candidate'));
    nodes.forEach(n => {
        n.el.classList.remove('visited');
        document.getElementById(`info-${n.id}`).classList.remove('show');
    });
    
    logBox.innerText = "Status Reset.";
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