// static/js/uiManager.js

import { state, dom } from './state.js';

export function logToTerminal(message, type = 'log') {
    const p = document.createElement('p');
    p.textContent = message;
    p.className = type;
    dom.terminalOutput.appendChild(p);
    dom.terminalOutput.scrollTop = dom.terminalOutput.scrollHeight;
}

export async function populateNodeList() {
        try {
            const response = await fetch('/static/nodes.json');

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const categories = await response.json();
            
            dom.nodeListContainer.innerHTML = ''; // Limpa qualquer conteúdo existente

            categories.forEach(category => {
                // Cria o título da categoria
                const categoryTitle = document.createElement('h3');
                categoryTitle.className = 'node-category-title';
                categoryTitle.textContent = category.category;
                dom.nodeListContainer.appendChild(categoryTitle);

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
                    dom.nodeListContainer.appendChild(nodeItem);
                });
            });

        } catch (error) {
            console.error("Erro ao carregar a lista de nós:", error);
            dom.nodeListContainer.innerHTML = '<p style="color: #ff5555; padding: 10px;">Falha ao carregar blocos.</p>';
        }
}


function updateNodeConfig(nodeId, field, value) {
    if (!state.nodeConfigs.has(nodeId)) {
        state.nodeConfigs.set(nodeId, {});
    }
    const config = state.nodeConfigs.get(nodeId);
    config[field] = value;
}


export function showPropertiesForNode(nodeId) {
    const nodeEl = document.getElementById(nodeId);
    const nodeConfig = state.nodeConfigs.get(nodeId) || {};
    const nodeType = nodeEl.dataset.nodeType; // Precisaremos disso!
    const nodeName = nodeEl.querySelector('.node-title').textContent;

    dom.propertiesTitle.textContent = `Propriedades: ${nodeName}`;
    dom.propertiesBody.innerHTML = ''; // Limpa o painel

    // Gera os campos com base no tipo do nó
    switch (nodeType) {
        case 'readFile':
            dom.propertiesBody.innerHTML = `
                <div class="property-group">
                    <label for="prop-path">Caminho do Arquivo (Path)</label>
                    <input type="text" id="prop-path" data-field="path" value="${nodeConfig.path || ''}">
                </div>
            `;
            break;
        case 'writeFile':
            dom.propertiesBody.innerHTML = `
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
            dom.propertiesBody.innerHTML = `
                <div class="property-group">
                    <label for="prop-url">URL</label>
                    <input type="text" id="prop-url" data-field="url" value="${nodeConfig.url || ''}">
                </div>
            `;
            break;
        default:
            dom.propertiesBody.innerHTML = '<p class="no-node-selected">Este nó não possui configurações.</p>';
    }

    // Adiciona listeners para salvar as alterações
    dom.propertiesBody.querySelectorAll('input, textarea').forEach(input => {
        input.addEventListener('input', (e) => {
            const field = e.target.dataset.field;
            const value = e.target.value;
            updateNodeConfig(nodeId, field, value);
        });
    });

    dom.terminalPanel.classList.add('hidden');
    dom.propertiesPanel.classList.remove('hidden');
}

export function hidePropertiesPanel() {
    dom.propertiesPanel.classList.add('hidden');
    dom.terminalPanel.classList.remove('hidden');
    dom.propertiesTitle.textContent = `Propriedades`;
}

export function updateNodesWithResults(results) {
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
