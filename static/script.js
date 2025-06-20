document.addEventListener('DOMContentLoaded', () => {
    // =========================================================================
    // --- ELEMENTOS DO DOM E CONFIGURAÇÃO INICIAL ---
    // =========================================================================
    const mainCanvasArea = document.getElementById('main-canvas-area');
    const nodesContainer = document.getElementById('canvas');
    const connectionCanvas = document.getElementById('connection-canvas');
    const ctx = connectionCanvas.getContext('2d');
    const terminalOutput = document.getElementById('terminal-output');
    const terminalInput = document.getElementById('terminal-input');
    const nodeListContainer = document.getElementById('node-list');
    const executeBtn = document.getElementById('execute-btn');
    const propertiesPanel = document.getElementById('properties-panel');
    const propertiesTitle = document.getElementById('properties-title');
    const propertiesBody = document.getElementById('properties-body');
    const terminalPanel = document.getElementById('terminal-panel');

    // =========================================================================
    // --- ESTADO DA APLICAÇÃO ---
    // =========================================================================
    let state = {
        pan: { x: 0, y: 0, isPanning: false },
        zoom: { scale: 1, max: 2, min: 0.3 },
        dragging: {
            isDragging: false,
            isResizing: false,
            target: null,       // O elemento DOM sendo arrastado (nó ou waypoint)
            dataObject: null,   // O objeto de dados a ser atualizado (waypoint)
            offset: { x: 0, y: 0 },
            initialSize: { width: 0, height: 0 },
            initialPositions: new Map(), 
            lastMousePos: { x: 0, y: 0 } 
        },
        connecting: {
            isConnecting: false,
            startNodeId: null,
            startPort: null,
            mousePos: { x: 0, y: 0 } // Posição do mouse no "mundo"
        },
        nodeConfigs: new Map(),
        selectedNodeIds: new Set(),
        nodeCounter: 0,
        connectionCounter: 0,
        connections: [] // Estrutura: { id, from, to, waypoints: [{x, y}] }
    };

    // =========================================================================
    // --- FUNÇÕES DE DESENHO E CANVAS ---
    // =========================================================================

    // Redimensiona o canvas para preencher a área principal
    function resizeCanvas() {
        const rect = mainCanvasArea.getBoundingClientRect();
        connectionCanvas.width = rect.width;
        connectionCanvas.height = rect.height;
        draw();
    }

    function updateTransforms() {
        const transform = `translate(${state.pan.x}px, ${state.pan.y}px) scale(${state.zoom.scale})`;
        // Aplica ao contêiner dos nós (DOM)
        nodesContainer.style.transform = transform;
        // Aplica ao canvas de desenho (Canvas API)
        ctx.setTransform(state.zoom.scale, 0, 0, state.zoom.scale, state.pan.x, state.pan.y);
    }

    // O loop de desenho principal
    function draw() {
        // Limpa o canvas
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        // Aplica transformações de pan e zoom
        ctx.save();
        updateTransforms();


        // Desenha a linha de pré-visualização se estiver criando uma conexão
        if (state.connecting.isConnecting) {
            drawPreviewConnection();
        }

        // Desenha todas as conexões salvas
        state.connections.forEach(drawConnection);

        ctx.restore();
    }

    // Desenha uma única conexão com seus waypoints
    function drawConnection(conn) {
        const fromNode = document.getElementById(conn.from);
        const toNode = document.getElementById(conn.to);
        if (!fromNode || !toNode) return;

        const startPos = getPortPosition(fromNode.querySelector('.output'));
        const endPos = getPortPosition(toNode.querySelector('.input'));

        const points = [startPos, ...conn.waypoints, endPos];

        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);

        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
        }

        ctx.strokeStyle = 'var(--accent-color)';
        ctx.lineWidth = 2.5; // Mantém a espessura visual consistente
        ctx.stroke();
    }
    
    // Desenha a linha tracejada de pré-visualização
    function drawPreviewConnection() {
        const startPos = getPortPosition(state.connecting.startPort);
        const endPos = state.connecting.mousePos;

        ctx.beginPath();
        ctx.moveTo(startPos.x, startPos.y);
        ctx.lineTo(endPos.x, endPos.y);

        ctx.strokeStyle = 'var(--accent-color)';
        ctx.lineWidth = 2 ;
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]); // Reseta para linhas sólidas
    }

    // =========================================================================
    // --- LÓGICA DE SELEÇÃO E EXCLUSÃO  ---
    // =========================================================================

    function clearSelection() {
        state.selectedNodeIds.forEach(nodeId => {
            document.getElementById(nodeId)?.classList.remove('selected');
        });
        state.selectedNodeIds.clear();
        hidePropertiesPanel();
    }

    function selectNode(nodeId, addToSelection = false) {
        if (!addToSelection) {
            clearSelection();
        }
        state.selectedNodeIds.add(nodeId);
        document.getElementById(nodeId)?.classList.add('selected');
        showPropertiesForNode(nodeId);
    }

    function unselectNode(nodeId) {
        state.selectedNodeIds.delete(nodeId);
        document.getElementById(nodeId)?.classList.remove('selected');
    }

    function toggleNodeSelection(nodeId) {
        if (state.selectedNodeIds.has(nodeId)) {
            unselectNode(nodeId);
        } else {
            selectNode(nodeId, true); // O 'true' indica para adicionar à seleção
        }
    }

    function deleteSelectedNodes() {
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

    function hidePropertiesPanel() {
        propertiesPanel.classList.add('hidden');
        terminalPanel.classList.remove('hidden');
        propertiesTitle.textContent = `Propriedades`;
    }

    function updateNodeConfig(nodeId, field, value) {
        if (!state.nodeConfigs.has(nodeId)) {
            state.nodeConfigs.set(nodeId, {});
        }
        const config = state.nodeConfigs.get(nodeId);
        config[field] = value;
    }


    // =========================================================================
    // --- FUNÇÕES AUXILIARES (Coordenadas e Detecção de Colisão) ---
    // =========================================================================
    
    // Converte coordenadas do evento do mouse para coordenadas do "mundo" (canvas)
    function getMouseWorldPosition(e) {
        const rect = mainCanvasArea.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left - state.pan.x) / state.zoom.scale,
            y: (e.clientY - rect.top - state.pan.y) / state.zoom.scale
        };
    }

    function getPortPosition(portElement) {
        const nodeEl = portElement.closest('.flow-node');
        return {
            x: nodeEl.offsetLeft + portElement.offsetLeft + portElement.offsetWidth / 2,
            y: nodeEl.offsetTop + portElement.offsetTop + portElement.offsetHeight / 2
        };
    }

    function findConnectionAtPoint(worldX, worldY) {
        const HIT_THRESHOLD = 5 / state.zoom.scale;
        let closest = { connection: null, segmentIndex: -1, distance: Infinity };

        state.connections.forEach(conn => {
            const fromNode = document.getElementById(conn.from);
            const toNode = document.getElementById(conn.to);
            if (!fromNode || !toNode) return;

            const points = [getPortPosition(fromNode.querySelector('.output')), ...conn.waypoints, getPortPosition(toNode.querySelector('.input'))];

            for (let i = 0; i < points.length - 1; i++) {
                const p1 = points[i];
                const p2 = points[i + 1];
                const l2 = (p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2;
                if (l2 === 0) continue;
                let t = ((worldX - p1.x) * (p2.x - p1.x) + (worldY - p1.y) * (p2.y - p1.y)) / l2;
                t = Math.max(0, Math.min(1, t));
                const projection = { x: p1.x + t * (p2.x - p1.x), y: p1.y + t * (p2.y - p1.y) };
                const dist = Math.sqrt((worldX - projection.x) ** 2 + (worldY - projection.y) ** 2);

                if (dist < HIT_THRESHOLD && dist < closest.distance) {
                    closest = { connection: conn, segmentIndex: i, distance: dist };
                }
            }
        });
        return closest.connection ? closest : null;
    }

    // =========================================================================
    // --- LÓGICA DE EXECUÇÃO ---
    // =========================================================================
function showPropertiesForNode(nodeId) {
    const nodeEl = document.getElementById(nodeId);
    const nodeConfig = state.nodeConfigs.get(nodeId) || {};
    const nodeType = nodeEl.dataset.nodeType; // Precisaremos disso!
    const nodeName = nodeEl.querySelector('.node-title').textContent;

    propertiesTitle.textContent = `Propriedades: ${nodeName}`;
    propertiesBody.innerHTML = ''; // Limpa o painel

    // Gera os campos com base no tipo do nó
    switch (nodeType) {
        case 'readFile':
            propertiesBody.innerHTML = `
                <div class="property-group">
                    <label for="prop-path">Caminho do Arquivo (Path)</label>
                    <input type="text" id="prop-path" data-field="path" value="${nodeConfig.path || ''}">
                </div>
            `;
            break;
        case 'writeFile':
            propertiesBody.innerHTML = `
                <div class="property-group">
                    <label for="prop-path">Caminho do Arquivo (Path)</label>
                    <input type="text" id="prop-path" data-field="path" value="${nodeConfig.path || ''}">
                </div>
                <div class="property-group">
                    <label for="prop-content">Conteúdo a Escrever</label>
                    <textarea id="prop-content" data-field="content">${nodeConfig.content || '{{input}}'}</textarea>
                    <small>Use {{input}} para usar a saída do nó anterior.</small>
                </div>
            `;
            break;
        case 'httpRequest':
            // Exemplo para outro nó
            propertiesBody.innerHTML = `
                <div class="property-group">
                    <label for="prop-url">URL</label>
                    <input type="text" id="prop-url" data-field="url" value="${nodeConfig.url || ''}">
                </div>
            `;
            break;
        default:
            propertiesBody.innerHTML = '<p class="no-node-selected">Este nó não possui configurações.</p>';
    }

    // Adiciona listeners para salvar as alterações
    propertiesBody.querySelectorAll('input, textarea').forEach(input => {
        input.addEventListener('input', (e) => {
            const field = e.target.dataset.field;
            const value = e.target.value;
            updateNodeConfig(nodeId, field, value);
        });
    });

    terminalPanel.classList.add('hidden');
    propertiesPanel.classList.remove('hidden');
}


    async function executeFlow() {
        logToTerminal("Preparando dados do fluxo para execução...");

        document.querySelectorAll('.flow-node .node-content').forEach(el => {
            el.innerHTML = '<i>Aguardando execução...</i>';
        });

        // 1. Coletar dados dos nós
        const nodesData = [];
        const allNodes = document.querySelectorAll('.flow-node');
        allNodes.forEach(nodeEl => {
            nodesData.push({
                id: nodeEl.id,
                name: nodeEl.querySelector('.node-title').textContent,
                // O 'type' pode ser extraído do nome ou armazenado em um data-attribute
                // Por simplicidade, vamos derivar do nome por enquanto.
                type: nodeEl.dataset.nodeType,
                config: state.nodeConfigs.get(nodeEl.id) || {},
                position: {
                    x: nodeEl.offsetLeft,
                    y: nodeEl.offsetTop
                },
                size: {
                    width: nodeEl.offsetWidth,
                    height: nodeEl.offsetHeight
                }
            });
        });

        // 2. Coletar dados das conexões (já estão no 'state')
        const connectionsData = state.connections;

        // 3. Montar o payload final
        const flowPayload = {
            nodes: nodesData,
            connections: connectionsData
        };

        logToTerminal("Enviando fluxo para o backend Python...");

        try {
            // 4. Enviar para o backend via POST
            const response = await fetch('/execute', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(flowPayload)
            });

            if (!response.ok) {
                throw new Error(`Erro do servidor: ${response.status}`);
            }

            const result = await response.json();
            logToTerminal(`Resposta do Backend: ${result.message}`);

            if (result.results) {
                updateNodesWithResults(result.results);
            }


        } catch (error) {
            console.error("Erro ao executar o fluxo:", error);
            logToTerminal(`Falha na comunicação com o backend: ${error.message}`, 'error');
        }
    }


function updateNodesWithResults(results) {
    for (const nodeId in results) {
        const nodeResult = results[nodeId];
        const nodeEl = document.getElementById(nodeId);
        if (nodeEl) {
            const contentDiv = nodeEl.querySelector('.node-content');
            let statusClass = '';
            let statusText = '';

            switch (nodeResult.status) {
                case 'success':
                    statusClass = 'status-success';
                    statusText = '✅ Sucesso';
                    break;
                case 'error':
                    statusClass = 'status-error';
                    statusText = '❌ Erro';
                    break;
                case 'warning':
                    statusClass = 'status-warning';
                    statusText = '⚠️ Aviso';
                    break;
            }
            
            // Limita o tamanho da prévia dos dados para não quebrar o layout
            const outputPreview = (nodeResult.output || '').substring(0, 150);

            contentDiv.innerHTML = `
                <div class="${statusClass}">${statusText}</div>
                <p class="data-preview">${outputPreview}...</p>
            `;
        }
    }
}

    // =========================================================================
    // --- FUNÇÃO PARA POPULAR A LISTA DE NÓS ---
    // =========================================================================
    async function populateNodeList() {
        try {
            const response = await fetch('/static/nodes.json');

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const categories = await response.json();
            
            nodeListContainer.innerHTML = ''; // Limpa qualquer conteúdo existente

            categories.forEach(category => {
                // Cria o título da categoria
                const categoryTitle = document.createElement('h3');
                categoryTitle.className = 'node-category-title';
                categoryTitle.textContent = category.category;
                nodeListContainer.appendChild(categoryTitle);

                // Cria os itens de nó para esta categoria
                category.nodes.forEach(node => {
                    const nodeItem = document.createElement('div');
                    nodeItem.className = 'node-item';
                    nodeItem.draggable = true;
                    nodeItem.dataset.nodeType = node.type;
                    nodeItem.dataset.nodeName = node.name; // Armazena o nome para usar ao criar o nó

                    nodeItem.innerHTML = `
                        <div class="node-icon">${node.icon}</div>
                        <div class="node-item-content">
                            <div class="node-item-name">${node.name}</div>
                            <p class="node-item-description">${node.description}</p>
                        </div>
                    `;
                    nodeListContainer.appendChild(nodeItem);
                });
            });

        } catch (error) {
            console.error("Erro ao carregar a lista de nós:", error);
            nodeListContainer.innerHTML = '<p style="color: #ff5555; padding: 10px;">Falha ao carregar blocos.</p>';
        }
    }
    // =========================================================================
    // --- CRIAÇÃO E MANIPULAÇÃO DE NÓS E CONEXÕES ---
    // =========================================================================

    function createNode(type,name, x, y) {
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
        nodesContainer.appendChild(nodeEl);
        logToTerminal(`Bloco #${name} (${type}) criado.`);
        attachNodeListeners(nodeEl);
        selectNode(nodeId);
    }

    function addWaypointToConnection(connection, segmentIndex, x, y) {
        const newWaypointData = { x, y };
        connection.waypoints.splice(segmentIndex, 0, newWaypointData);

        const waypointEl = document.createElement('div');
        waypointEl.className = 'connection-waypoint';
        waypointEl.dataset.connectionId = connection.id; // NOVO
        waypointEl.style.left = `${x}px`;
        waypointEl.style.top = `${y}px`;
        nodesContainer.appendChild(waypointEl);
        
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

    // =========================================================================
    // --- MANIPULADORES DE EVENTOS (EVENT HANDLERS) ---
    // =========================================================================

    // --- Handlers de Nós e Waypoints ---
    function attachNodeListeners(nodeEl) {
         const nodeId = nodeEl.id;
        nodeEl.querySelector('.node-header').addEventListener('mousedown', (e) => {
            if (e.target.tagName === 'BUTTON') return;

            // 1. Lida com a seleçãodraggedNodeInfo
            if (e.shiftKey) {
                toggleNodeSelection(nodeId);
            } else {
                if (!state.selectedNodeIds.has(nodeId)) {
                    selectNode(nodeId);
                }
            }

            // 2. Prepara para arrastar (um ou múltiplos nós)
            state.dragging.isDragging = true;
            state.dragging.target = nodeEl;
            state.dragging.lastMousePos = getMouseWorldPosition(e);
            
            // Armazena a posição inicial de todos os nós selecionados
            state.dragging.initialPositions.clear();
            state.selectedNodeIds.forEach(id => {
                const el = document.getElementById(id);
                state.dragging.initialPositions.set(id, { x: el.offsetLeft, y: el.offsetTop });
            });

            nodeEl.classList.add('is-dragging');
        });

        nodeEl.querySelector('.resizer').addEventListener('mousedown', (e) => {
            e.stopPropagation();
            state.dragging.isResizing = true;
            state.dragging.target = nodeEl;
            state.dragging.initialSize.width = nodeEl.offsetWidth;
            state.dragging.initialSize.height = nodeEl.offsetHeight;
            state.dragging.offset.x = e.clientX;
            state.dragging.offset.y = e.clientY;
        });

        nodeEl.querySelectorAll('.node-port').forEach(port => {
            port.addEventListener('mousedown', startConnection);
            port.addEventListener('mouseup', endConnection);
        });
        
        nodeEl.querySelector('.minimize-btn').addEventListener('click', (e) => {
            nodeEl.classList.toggle('minimized');
            draw(); 
        });
    }

    // --- Handlers de Conexão ---
    function startConnection(e) {
        e.stopPropagation();
        if (e.target.dataset.portType !== 'output') return;

        state.connecting.isConnecting = true;
        state.connecting.startPort = e.target;
        state.connecting.startNodeId = e.target.closest('.flow-node').id;
        state.connecting.mousePos = getMouseWorldPosition(e);

        logToTerminal(`Iniciando conexão de ${state.connecting.startNodeId}...`);
        draw();
    }

    function endConnection(e) {
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
    
    function cancelConnection() {
        state.connecting.isConnecting = false;
        state.connecting.startNodeId = null;
        state.connecting.startPort = null;
        draw(); // Limpa a linha de preview
    }
    
    // --- Handlers Globais e do Canvas Principal ---
    mainCanvasArea.addEventListener('wheel', (e) => {
        e.preventDefault();
        const rect = mainCanvasArea.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const oldScale = state.zoom.scale;
        const delta = -e.deltaY * 0.001;
        state.zoom.scale = Math.max(state.zoom.min, Math.min(state.zoom.max, oldScale + delta));
        
        state.pan.x = mouseX - (mouseX - state.pan.x) * (state.zoom.scale / oldScale);
        state.pan.y = mouseY - (mouseY - state.pan.y) * (state.zoom.scale / oldScale);
        
        draw();
    });

    mainCanvasArea.addEventListener('mousedown', (e) => {
        if (e.target.closest('.flow-node, .connection-waypoint')) return;
        
        const worldPos = getMouseWorldPosition(e);
        const hit = findConnectionAtPoint(worldPos.x, worldPos.y);

        if (hit) {
            e.stopPropagation();
            addWaypointToConnection(hit.connection, hit.segmentIndex, worldPos.x, worldPos.y);
        } else {
            clearSelection();
            state.pan.isPanning = true;
            state.dragging.offset.x = e.clientX - state.pan.x;
            state.dragging.offset.y = e.clientY - state.pan.y;
            mainCanvasArea.style.cursor = 'grabbing';
        }
    });

    window.addEventListener('mousemove', (e) => {
        if (state.pan.isPanning) {
            state.pan.x = e.clientX - state.dragging.offset.x;
            state.pan.y = e.clientY - state.dragging.offset.y;
            draw();
        }

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

        if (state.dragging.isResizing) {
            const dx = (e.clientX - state.dragging.offset.x) / state.zoom.scale;
            const dy = (e.clientY - state.dragging.offset.y) / state.zoom.scale;
            state.dragging.target.style.width = `${state.dragging.initialSize.width + dx}px`;
            state.dragging.target.style.height = `${state.dragging.initialSize.height + dy}px`;
            draw();
        }

        if (state.connecting.isConnecting) {
            state.connecting.mousePos = getMouseWorldPosition(e);
            draw();
        }
    });

    window.addEventListener('mouseup', (e) => {
        if (state.pan.isPanning) {
            state.pan.isPanning = false;
            mainCanvasArea.style.cursor = 'default';
        }
        if (state.dragging.isDragging) {
            state.dragging.target.classList.remove('is-dragging');
        }
        state.dragging.isDragging = false;
        state.dragging.isResizing = false;
        state.dragging.target = null;
        state.dragging.dataObject = null;

        if (state.connecting.isConnecting && !e.target.closest('.node-port[data-port-type="input"]')) {
            cancelConnection();
        }
    });

    // --- Drag and Drop de novos nós ---
    let draggedNodeInfo = null;
    nodeListContainer.addEventListener('dragstart', (e) => {
        const nodeItem = e.target.closest('.node-item');
        if (nodeItem) {
            e.dataTransfer.setData('text/plain', 'application/node-from-list');
            e.dataTransfer.effectAllowed = 'copy';
            draggedNodeInfo = {
                type: nodeItem.dataset.nodeType,
                name: nodeItem.dataset.nodeName
            };
        }
    });

    mainCanvasArea.addEventListener('dragover', (e) => e.preventDefault());

    // ATUALIZADO: O 'drop' agora usa as informações salvas
    mainCanvasArea.addEventListener('drop', (e) => {
        e.preventDefault();
        if (e.dataTransfer.getData('text/plain') === 'application/node-from-list' && draggedNodeInfo) {
            const worldPos = getMouseWorldPosition(e);
            createNode(draggedNodeInfo.type, draggedNodeInfo.name, worldPos.x, worldPos.y);
            draggedNodeInfo = null; // Limpa a informação após o drop
        }
    });


    window.addEventListener('keydown', (e) => {
        // Ignora se estiver digitando em um input (como o terminal)
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return;
        }
        
        if (e.key === 'Delete' || e.key === 'Backspace') {
            e.preventDefault(); // Evita que o navegador volte a página no Backspace
            deleteSelectedNodes();
        }
    });

    // --- Lógica do Terminal (sem alterações) ---
    function logToTerminal(message, type = 'log') {
        const p = document.createElement('p');
        p.textContent = message;
        p.className = type;
        terminalOutput.appendChild(p);
        terminalOutput.scrollTop = terminalOutput.scrollHeight;
    }
    
    // =========================================================================
    // --- INICIALIZAÇÃO ---
    // =========================================================================
    async function initialize() {
        await populateNodeList();
        executeBtn.addEventListener('click', executeFlow);
        window.addEventListener('resize', resizeCanvas);
        resizeCanvas(); // Chama para definir o tamanho inicial e desenhar
        logToTerminal("JFlow Builder inicializado.");
    }
    
    initialize();
});