// static/js/flowManager.js
import { state, dom } from './state.js';
import { draw } from './canvasRenderer.js';
import { getMouseWorldPosition } from './utils.js';
import { showPropertiesForNode, hidePropertiesPanel, logToTerminal } from './uiManager.js';
import { attachNodeListeners } from './eventBinder.js'; 


export function createNode(type,name, x, y) {
        state.nodeCounter++;
        const nodeId = `node-${state.nodeCounter}`;
        const nodeEl = document.createElement('div');
        nodeEl.className = 'flow-node';
        nodeEl.id = nodeId;
        nodeEl.dataset.nodeType = type;
        nodeEl.style.left = `${x}px`;
        nodeEl.style.top = `${y}px`;

        nodeEl.innerHTML = `
            <div class="node-port input" data-port-type="input"></div>
            <div class="node-port output" data-port-type="output"></div>
            <div class="node-header">
                <span class="node-title">${name} #${state.nodeCounter}</span>
                <div class="node-controls">
                    <button class="minimize-btn" title="Minimizar">_</button>
                </div>
            </div>
            <div class="node-content"><i>Nó não configurado.</i></div>
            <div class="resizer"></div>
        `;
        dom.nodesContainer.appendChild(nodeEl);
        logToTerminal(`Bloco #${name} (${type}) criado.`);
        attachNodeListeners(nodeEl);
        selectNode(nodeId);
}


export function deleteSelectedNodes() {
    if (state.selectedNodeIds.size === 0) return;

    const idsToDelete = new Set(state.selectedNodeIds);
    
    // 1. Remove as conexões e seus waypoints
    const connectionsToRemove = state.connections.filter(conn => 
        idsToDelete.has(conn.from) || idsToDelete.has(conn.to)
    );
    connectionsToRemove.forEach(conn => {
        document.querySelectorAll(`.connection-waypoint[data-connection-id="${conn.id}"]`)
            .forEach(wp => wp.remove());
    });
    state.connections = state.connections.filter(conn => 
        !idsToDelete.has(conn.from) && !idsToDelete.has(conn.to)
    );

    // 2. Remove os nós do DOM e da seleção
    idsToDelete.forEach(nodeId => {
        document.getElementById(nodeId)?.remove();
        state.selectedNodeIds.delete(nodeId);
        state.nodeConfigs.delete(nodeId);
    });

    logToTerminal(`${idsToDelete.size} nó(s) deletado(s).`);
    hidePropertiesPanel();
    draw(); // Redesenha o canvas para remover as linhas
}


export function selectNode(nodeId, addToSelection = false) {
    if (!addToSelection) {
        clearSelection();
    }
    state.selectedNodeIds.add(nodeId);
    document.getElementById(nodeId)?.classList.add('selected');
    showPropertiesForNode(nodeId);
}


export function addWaypointToConnection(connection, segmentIndex, x, y) {
    const newWaypointData = { x, y };
    connection.waypoints.splice(segmentIndex, 0, newWaypointData);

    const waypointEl = document.createElement('div');
    waypointEl.className = 'connection-waypoint';
    waypointEl.dataset.connectionId = connection.id; // NOVO
    waypointEl.style.left = `${x}px`;
    waypointEl.style.top = `${y}px`;
    dom.nodesContainer.appendChild(waypointEl);
    
    waypointEl.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        state.dragging.isDragging = true;
        state.dragging.target = waypointEl;
        state.dragging.dataObject = newWaypointData;
        state.dragging.lastMousePos = getMouseWorldPosition(e);
    });
    
    logToTerminal(`Waypoint adicionado à conexão ${connection.id}`);
    draw();
}

export function cancelConnection() {
    state.connecting.isConnecting = false;
    state.connecting.startNodeId = null;
    state.connecting.startPort = null;
    draw(); // Limpa a linha de preview
}

export function clearSelection() {
    state.selectedNodeIds.forEach(nodeId => {
        document.getElementById(nodeId)?.classList.remove('selected');
    });
    state.selectedNodeIds.clear();
    hidePropertiesPanel();
}

export function endConnection(e) {
    if (!state.connecting.isConnecting) return;
    const endPort = e.target;
    if (endPort.dataset.portType !== 'input' || !endPort.closest('.flow-node')) {
        cancelConnection();
        return;
    }

    const endNodeId = endPort.closest('.flow-node').id;
    if (state.connecting.startNodeId === endNodeId) {
        logToTerminal("Erro: Um nó não pode ser conectado a si mesmo.", 'error');
        cancelConnection();
        return;
    }

    state.connectionCounter++;
    const newConn = {
        id: `conn-${state.connectionCounter}`,
        from: state.connecting.startNodeId,
        to: endNodeId,
        waypoints: []
    };
    state.connections.push(newConn);
    logToTerminal(`Conexão criada: ${newConn.id}`);
    cancelConnection();
}

export function startConnection(e) {
    e.stopPropagation();
    if (e.target.dataset.portType !== 'output') return;

    state.connecting.isConnecting = true;
    state.connecting.startPort = e.target;
    state.connecting.startNodeId = e.target.closest('.flow-node').id;
    state.connecting.mousePos = getMouseWorldPosition(e);

    logToTerminal(`Iniciando conexão de ${state.connecting.startNodeId}...`);
    draw();
}

export function toggleNodeSelection(nodeId) {
    if (state.selectedNodeIds.has(nodeId)) {
        unselectNode(nodeId);
    } else {
        selectNode(nodeId, true); // O 'true' indica para adicionar à seleção
    }
}

export function unselectNode(nodeId) {
    state.selectedNodeIds.delete(nodeId);
    document.getElementById(nodeId)?.classList.remove('selected');
}