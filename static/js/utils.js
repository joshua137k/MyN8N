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
    const nodeEl = portElement.closest('.flow-node');
    return {
        x: nodeEl.offsetLeft + portElement.offsetLeft + portElement.offsetWidth / 2,
        y: nodeEl.offsetTop + portElement.offsetTop + portElement.offsetHeight / 2
    };
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