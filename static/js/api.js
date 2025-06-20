// static/js/api.js
import { state } from './state.js';
import { logToTerminal, updateNodesWithResults } from './uiManager.js';

export async function executeFlow() {
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