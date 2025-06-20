// static/js/main.js

import { populateNodeList } from './uiManager.js';
import { bindAllEventListeners } from './eventBinder.js';
import { resizeCanvas } from './canvasRenderer.js';

async function initialize() {
    bindAllEventListeners();
    await populateNodeList();
    resizeCanvas();
    console.log("JFlows Modularizado e Inicializado.");
}

// Inicia a aplicação quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', initialize);