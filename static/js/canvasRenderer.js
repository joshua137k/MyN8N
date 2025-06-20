// static/js/canvasRenderer.js

import { state, dom } from './state.js';
import { getPortPosition } from './utils.js';

export function resizeCanvas() {
    const rect = dom.mainCanvasArea.getBoundingClientRect();
    dom.connectionCanvas.width = rect.width;
    dom.connectionCanvas.height = rect.height;
    draw();
}

function updateTransforms() {
    const transform = `translate(${state.pan.x}px, ${state.pan.y}px) scale(${state.zoom.scale})`;
    dom.nodesContainer.style.transform = transform;
    dom.ctx.setTransform(state.zoom.scale, 0, 0, state.zoom.scale, state.pan.x, state.pan.y);
}

export function draw() {
    dom.ctx.save();
    dom.ctx.clearRect(0, 0, dom.ctx.canvas.width, dom.ctx.canvas.height);
    updateTransforms();
    if (state.connecting.isConnecting) {
        drawPreviewConnection();
    }
    state.connections.forEach(drawConnection);
    dom.ctx.restore();
}

function drawConnection(conn) {
    const fromNode = document.getElementById(conn.from);
    const toNode = document.getElementById(conn.to);
    if (!fromNode || !toNode) return;
    const startPos = getPortPosition(fromNode.querySelector('.output'));
    const endPos = getPortPosition(toNode.querySelector('.input'));
    const points = [startPos, ...conn.waypoints, endPos];
    dom.ctx.beginPath();
    dom.ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
        dom.ctx.lineTo(points[i].x, points[i].y);
    }
    dom.ctx.strokeStyle = 'var(--accent-color)';
    dom.ctx.lineWidth = 2.5;
    dom.ctx.stroke();
}

function drawPreviewConnection() {
    const startPos = getPortPosition(state.connecting.startPort);
    const endPos = state.connecting.mousePos;
    dom.ctx.beginPath();
    dom.ctx.moveTo(startPos.x, startPos.y);
    dom.ctx.lineTo(endPos.x, endPos.y);
    dom.ctx.strokeStyle = 'var(--accent-color)';
    dom.ctx.lineWidth = 2;
    dom.ctx.setLineDash([5, 5]);
    dom.ctx.stroke();
    dom.ctx.setLineDash([]);
}