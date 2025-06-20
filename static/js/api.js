// static/js/api.js
import { state } from './state.js';
import { logToTerminal, updateNodesWithResults } from './uiManager.js';



function getCurrentNodeConfig(nodeId) {
    const savedConfig = state.nodeConfigs.get(nodeId) || {};


    if (state.selectedNodeIds.has(nodeId) && !dom.propertiesPanel.classList.contains('hidden')) {
        dom.propertiesBody.querySelectorAll('input, textarea, select').forEach(input => {
            const field = input.dataset.field;
            const parentGroup = input.closest('.property-group');
            if (parentGroup && parentGroup.style.display !== 'none') {
                savedConfig[field] = input.value;
            } else if (parentGroup && parentGroup.style.display === 'none') {
                 delete savedConfig[field];
            }
        });
    }

    return savedConfig;
}

export async function executeFlow() {
    logToTerminal("Preparando dados do fluxo para execução...");

    document.querySelectorAll('.flow-node .node-content').forEach(el => {
        el.innerHTML = '<i>Aguardando execução...</i>';
    });

    // 1. Coletar dados dos nós com a configuração ATUALIZADA
    const nodesData = [];
    const allNodes = document.querySelectorAll('.flow-node');
    allNodes.forEach(nodeEl => {
        nodesData.push({
            id: nodeEl.id,
            name: nodeEl.querySelector('.node-title').textContent,
            type: nodeEl.dataset.nodeType,
            // CORREÇÃO AQUI: Usa a nova função para pegar a config completa e atual
            config: getCurrentNodeConfig(nodeEl.id),
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

    // 2. Coletar dados das conexões (sem alterações)
    const connectionsData = state.connections;

    // 3. Montar o payload final
    const flowPayload = {
        nodes: nodesData,
        connections: connectionsData
    };

    logToTerminal("Enviando fluxo para o backend Python...");
    console.log("Payload a ser enviado:", flowPayload); // Ótimo para depuração

    try {
        // 4. Enviar para o backend via POST (sem alterações)
        const response = await fetch('/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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