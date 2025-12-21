// --- State ---
let nodes = []; // {id, x, y, el, color, setId}
let edges = []; // {u, v, weight, elLine, elText}
let animations = [];
let currentStep = 0;
let isRunning = false;
let isFinished = false;
let timer = null;
let speed = 1000;

// Unique colors for sets
const SET_COLORS = [
    '#f38ba8', '#fab387', '#f9e2af', '#a6e3a1', '#94e2d5', '#89b4fa', '#cba6f7', '#f5c2e7',
    '#eb4d4b', '#f0932b', '#badc58', '#22a6b3', '#be2edd', '#4834d4', '#6ab04c', '#535c68'
];

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
    const color = SET_COLORS[id % SET_COLORS.length];
    
    const el = document.createElement('div');
    el.className = 'node';
    el.innerText = id;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.backgroundColor = color; // Initial Set Color
    el.style.borderColor = color;

    nodesLayer.appendChild(el);
    nodes.push({ id, x, y, el, color, setId: id });
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
    // Edges (Connect if close)
    for(let i=0; i<nodes.length; i++) {
        for(let j=i+1; j<nodes.length; j++) {
            const dist = Math.sqrt(Math.pow(nodes[i].x - nodes[j].x, 2) + Math.pow(nodes[i].y - nodes[j].y, 2));
            if(dist < 250) { // Connect nearby
                createEdge(i, j);
            }
        }
    }
    // Ensure connectivity
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

// --- Kruskal's Logic ---
function runKruskal() {
    // 1. Sort Edges
    let sortedEdges = [...edges].sort((a, b) => a.weight - b.weight);
    
    // Disjoint Set Data
    let parent = Array.from({length: nodes.length}, (_, i) => i);
    
    function find(i) {
        if (parent[i] == i) return i;
        return find(parent[i]);
    }

    function union(i, j) {
        let root_i = find(i);
        let root_j = find(j);
        if (root_i !== root_j) {
            parent[root_i] = root_j;
            return true;
        }
        return false;
    }

    // 2. Iterate
    for (let e of sortedEdges) {
        // Animation: Check Edge
        animations.push({ type: 'CHECK', edge: e });

        let rootU = find(e.u);
        let rootV = find(e.v);

        if (rootU !== rootV) {
            // Union Logic for visualization tracking
            // We need to know WHICH nodes change color. 
            // In visualizer, we can iterate all nodes to find those belonging to rootU
            // and change them to rootV's color.
            
            // Logic:
            let oldSetId = rootU; // Simplified logic, assumes path compression isn't visualized instantly
            // Actually, we need to track visual sets separately or reconstruct sets every step.
            // Better: Record the UNION action with roots.
            
            animations.push({ type: 'ADD_MST', edge: e });
            animations.push({ type: 'UNION', rootFrom: rootU, rootTo: rootV });
            
            // Update logical parent for next loop iterations
            parent[rootU] = rootV;
        } else {
            animations.push({ type: 'SKIP', edge: e });
        }
    }
    animations.push({ type: 'FINISHED' });
}

// --- Animation ---
// We need to maintain visual set IDs during animation replay
let visualParent = []; 

function animateStep() {
    if (currentStep >= animations.length) {
        pauseViz();
        return;
    }

    const action = animations[currentStep];
    
    if (action.type === 'CHECK') {
        action.edge.elLine.classList.add('current');
        logBox.innerHTML = `Checking edge (${action.edge.u}-${action.edge.v}) with weight <b>${action.edge.weight}</b>.`;
    }
    else if (action.type === 'ADD_MST') {
        action.edge.elLine.classList.remove('current');
        action.edge.elLine.classList.add('mst');
        logBox.innerHTML = `Sets are different. Adding to MST.`;
    }
    else if (action.type === 'SKIP') {
        action.edge.elLine.classList.remove('current');
        action.edge.elLine.classList.add('skipped');
        logBox.innerHTML = `Nodes are in same set. Cycle detected. Skipping.`;
    }
    else if (action.type === 'UNION') {
        // Merge Sets Visually
        // We need to find all nodes that currently point to rootFrom and repoint them to rootTo
        // And update their colors.
        
        let targetColor = nodes[action.rootTo].color; // Use the color of the new root
        
        // This is strictly visual update logic, simulating the result of Union
        // Note: visualParent array tracks the current root of each node FOR THE ANIMATION
        
        // Find the visual root of 'from' group
        let oldRoot = visualFind(action.rootFrom);
        let newRoot = visualFind(action.rootTo);
        
        // Update parents array
        visualParent[oldRoot] = newRoot;
        
        // Update DOM Colors
        // Scan all nodes, if their root is now newRoot (via path traversal), update color
        for(let i=0; i<nodes.length; i++) {
            if(visualFind(i) === newRoot) {
                nodes[i].el.style.backgroundColor = nodes[newRoot].color; 
                nodes[i].el.style.borderColor = nodes[newRoot].color;
            }
        }
        logBox.innerHTML = `Union Sets: Merging colors.`;
    }
    else if (action.type === 'FINISHED') {
        isFinished = true;
        pauseViz();
        logBox.innerHTML = `<b>MST Construction Complete!</b>`;
        return;
    }

    currentStep++;
}

// Helper for animation logic to traverse the visual set structure
function visualFind(i) {
    if (visualParent[i] == i) return i;
    return visualFind(visualParent[i]);
}

// --- Utils ---
function initKruskal() {
    if (nodes.length === 0) {
        logBox.innerText = "Please generate a graph first.";
        return;
    }
    if (isRunning) return;
    if (isFinished) resetGraphStatus();
    
    if (currentStep === 0) {
        animations = [];
        runKruskal();
        // Reset Visual Parent Array for Animation Replay
        visualParent = Array.from({length: nodes.length}, (_, i) => i);
        // Reset Colors to initial
        nodes.forEach(n => {
            n.el.style.backgroundColor = n.color;
            n.el.style.borderColor = n.color;
        });
    }
    
    isRunning = true;
    timer = setInterval(animateStep, speed);
}

function pauseViz() { isRunning = false; clearInterval(timer); }
function stepForward() { 
    pauseViz(); 
    if(!isFinished) { 
        if(currentStep===0) initKruskal(); // Initialize if first step
        animateStep(); 
    } 
}

function resetGraphStatus() {
    pauseViz();
    currentStep = 0;
    isFinished = false;
    animations = [];
    
    // CSS reset
    edges.forEach(e => e.elLine.classList.remove('current', 'mst', 'skipped'));
    
    // Colors reset
    nodes.forEach(n => {
        n.el.style.backgroundColor = n.color;
        n.el.style.borderColor = n.color;
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