// static/js/state.js

// --- ESTADO DA APLICAÇÃO ---
export let state = {
    pan: { x: 0, y: 0, isPanning: false },
    zoom: { scale: 1, max: 2, min: 0.3 },
    dragging: {
        isDragging: false,
        target: null,
        dataObject: null,
        offset: { x: 0, y: 0 },
        initialSize: { width: 0, height: 0 },
        initialPositions: new Map(), 
        lastMousePos: { x: 0, y: 0 } 
    },
    connecting: {
        isConnecting: false,
        startNodeId: null,
        startPort: null,
        mousePos: { x: 0, y: 0 }
    },
    nodeConfigs: new Map(),
    selectedNodeIds: new Set(),
    nodeCounter: 0,
    connectionCounter: 0,
    connections: []
};

// --- ELEMENTOS DO DOM ---
export const dom = {
    mainCanvasArea: document.getElementById('main-canvas-area'),
    nodesContainer: document.getElementById('canvas'),
    connectionCanvas: document.getElementById('connection-canvas'),
    ctx: document.getElementById('connection-canvas').getContext('2d'),
    terminalOutput: document.getElementById('terminal-output'),
    terminalInput: document.getElementById('terminal-input'),
    nodeListContainer: document.getElementById('node-list'),
    executeBtn: document.getElementById('execute-btn'),
    propertiesPanel: document.getElementById('properties-panel'),
    propertiesTitle: document.getElementById('properties-title'),
    propertiesBody: document.getElementById('properties-body'),
    terminalPanel: document.getElementById('terminal-panel')
};