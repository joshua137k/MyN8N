// static/js/utils.js

import { state, dom } from './state.js';

export function getMouseWorldPosition(e) {
    const rect = dom.mainCanvasArea.getBoundingClientRect();
    return {
        x: (e.clientX - rect.left - state.pan.x) / state.zoom.scale,
        y: (e.clientY - rect.top - state.pan.y) / state.zoom.scale
    };
}

export function getPortPosition(portElement) {
    const canvasAreaRect = dom.mainCanvasArea.getBoundingClientRect();
    const portRect = portElement.getBoundingClientRect();

    // 1. Calcula a posição do centro da porta RELATIVA ao canto superior esquerdo da ÁREA DO CANVAS.
    //    Isso nos dá a posição da porta na "tela" do canvas, sem considerar pan/zoom.
    const portX_onCanvas = (portRect.left + portRect.width / 2) - canvasAreaRect.left;
    const portY_onCanvas = (portRect.top + portRect.height / 2) - canvasAreaRect.top;

    // 2. Converte essa posição da "tela" do canvas para as coordenadas do "MUNDO".
    //    Isso remove o efeito do pan e do zoom, nos dando a coordenada pura (x, y)
    //    onde a porta "realmente" está no nosso espaço infinito.
    const worldX = (portX_onCanvas - state.pan.x) / state.zoom.scale;
    const worldY = (portY_onCanvas - state.pan.y) / state.zoom.scale;
    
    return { x: worldX, y: worldY };
}
export function findConnectionAtPoint(worldX, worldY) {
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