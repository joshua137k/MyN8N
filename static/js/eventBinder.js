import { state, dom } from './state.js';
import { draw, resizeCanvas } from './canvasRenderer.js';
import { getMouseWorldPosition, findConnectionAtPoint } from './utils.js';
import { executeFlow } from './api.js';
import { 
    createNode, 
    addWaypointToConnection,
    deleteSelectedNodes,
    selectNode,
    unselectNode,
    toggleNodeSelection,
    clearSelection,
    startConnection,
    endConnection,
    cancelConnection
} from './flowManager.js';

let draggedNodeInfo = null;

// Função principal que será chamada no main.js
export function bindAllEventListeners() {
    
    // --- Eventos Globais da Janela ---

    window.addEventListener('resize', resizeCanvas);

    window.addEventListener('mousemove', handleMouseMove);

    window.addEventListener('mouseup', handleMouseUp);

    window.addEventListener('keydown', handleKeyDown);

    // --- Eventos da Área Principal (Canvas) ---

    dom.mainCanvasArea.addEventListener('wheel', handleCanvasWheel);

    dom.mainCanvasArea.addEventListener('mousedown', handleCanvasMouseDown);

    // Drag & Drop para criar novos nós
    dom.mainCanvasArea.addEventListener('dragover', (e) => e.preventDefault());
    dom.mainCanvasArea.addEventListener('drop', handleCanvasDrop);

    // --- Eventos do Painel Lateral (Lista de Nós) ---

    dom.nodeListContainer.addEventListener('dragstart', handleNodeListDragStart);

    // --- Eventos de Botões e Inputs ---

    dom.executeBtn.addEventListener('click', executeFlow);

    // Adicione outros listeners de botões aqui se necessário
}


// =========================================================================
// --- FUNÇÕES "HANDLER" (Lidam com a lógica do evento) ---
// =========================================================================

function handleMouseMove(e) {
    // 1. Lida com o Pan do Canvas
    if (state.pan.isPanning) {
        state.pan.x = e.clientX - state.dragging.offset.x;
        state.pan.y = e.clientY - state.dragging.offset.y;
        draw();
    }

    // 2. Lida com o Arrastar de Nós e Waypoints
    if (state.dragging.isDragging) {
        const worldPos = getMouseWorldPosition(e);
        const dx = worldPos.x - state.dragging.lastMousePos.x;
        const dy = worldPos.y - state.dragging.lastMousePos.y;

        if (state.dragging.dataObject) { // Arrastando um waypoint
            state.dragging.dataObject.x += dx;
            state.dragging.dataObject.y += dy;
            state.dragging.target.style.left = `${state.dragging.dataObject.x}px`;
            state.dragging.target.style.top = `${state.dragging.dataObject.y}px`;
        } else { // Arrastando um ou mais nós
            state.selectedNodeIds.forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    el.style.left = `${el.offsetLeft + dx}px`;
                    el.style.top = `${el.offsetTop + dy}px`;
                }
            });
        }

        state.dragging.lastMousePos = worldPos;
        draw();
    }


    // 4. Lida com a criação de uma nova conexão
    if (state.connecting.isConnecting) {
        state.connecting.mousePos = getMouseWorldPosition(e);
        draw();
    }
}

function handleMouseUp(e) {
    // Para o Pan
    if (state.pan.isPanning) {
        state.pan.isPanning = false;
        dom.mainCanvasArea.style.cursor = 'default';
    }

    // Para o Arrastar
    if (state.dragging.isDragging) {
        if (state.dragging.target) {
            state.dragging.target.classList.remove('is-dragging');
        }
        state.dragging.isDragging = false;
        state.dragging.target = null;
        state.dragging.dataObject = null;
    }


    // Para a Conexão
    if (state.connecting.isConnecting && !e.target.closest('.node-port[data-port-type="input"]')) {
        cancelConnection();
    }
}

function handleKeyDown(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
    }
    
    if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        deleteSelectedNodes();
    }
}

function handleCanvasWheel(e) {
    e.preventDefault();
    const rect = dom.mainCanvasArea.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const oldScale = state.zoom.scale;
    const delta = -e.deltaY * 0.001;
    state.zoom.scale = Math.max(state.zoom.min, Math.min(state.zoom.max, oldScale + delta));
    
    state.pan.x = mouseX - (mouseX - state.pan.x) * (state.zoom.scale / oldScale);
    state.pan.y = mouseY - (mouseY - state.pan.y) * (state.zoom.scale / oldScale);
    
    draw();
}

function handleCanvasMouseDown(e) {
    if (e.target.closest('.flow-node, .connection-waypoint')) return;
    
    const worldPos = getMouseWorldPosition(e);
    const hit = findConnectionAtPoint(worldPos.x, worldPos.y);

    if (hit) {
        e.stopPropagation();
        addWaypointToConnection(hit.connection, hit.segmentIndex + 1, worldPos.x, worldPos.y);
    } else {
        clearSelection();
        state.pan.isPanning = true;
        state.dragging.offset.x = e.clientX - state.pan.x;
        state.dragging.offset.y = e.clientY - state.pan.y;
        dom.mainCanvasArea.style.cursor = 'grabbing';
    }
}

function handleCanvasDrop(e) {
    e.preventDefault();
    if (e.dataTransfer.getData('text/plain') === 'application/node-from-list' && draggedNodeInfo) {
        const worldPos = getMouseWorldPosition(e);
        createNode(draggedNodeInfo.type, draggedNodeInfo.name, worldPos.x, worldPos.y);
        draggedNodeInfo = null;
    }
}

function handleNodeListDragStart(e) {
    const nodeItem = e.target.closest('.node-item');
    if (nodeItem) {
        e.dataTransfer.setData('text/plain', 'application/node-from-list');
        e.dataTransfer.effectAllowed = 'copy';
        draggedNodeInfo = {
            type: nodeItem.dataset.nodeType,
            name: nodeItem.dataset.nodeName
        };
    }
}

// =========================================================================
// --- BINDERS ESPECÍFICOS PARA ELEMENTOS DINÂMICOS ---
// =========================================================================

// Esta função será chamada toda vez que um novo nó for criado (dentro do `flowManager.js`)
// Isso é necessário porque não podemos adicionar listeners a elementos que ainda não existem.
export function attachNodeListeners(nodeEl) {
    const nodeId = nodeEl.id;

    // Mover o nó e lidar com seleção
    nodeEl.querySelector('.node-header').addEventListener('mousedown', (e) => {
        if (e.target.tagName === 'BUTTON') return;

        if (e.shiftKey) {
            toggleNodeSelection(nodeId);
        } else {
            if (!state.selectedNodeIds.has(nodeId)) {
                selectNode(nodeId);
            }
        }

        state.dragging.isDragging = true;
        state.dragging.target = nodeEl;
        state.dragging.lastMousePos = getMouseWorldPosition(e);
        
        state.dragging.initialPositions.clear();
        state.selectedNodeIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) state.dragging.initialPositions.set(id, { x: el.offsetLeft, y: el.offsetTop });
        });

        nodeEl.classList.add('is-dragging');
    });



    // Conectar portas
    nodeEl.querySelectorAll('.node-port').forEach(port => {
        port.addEventListener('mousedown', startConnection);
        port.addEventListener('mouseup', endConnection);
    });
    
    // Minimizar
    nodeEl.querySelector('.minimize-btn').addEventListener('click', () => {
        nodeEl.classList.toggle('minimized');
        draw(); 
    });
}