const fieldRenderers = {
    'text': (prop, value) => `
        <input 
            type="text" 
            id="prop-${prop.name}" 
            data-field="${prop.name}" 
            placeholder="${prop.placeholder || ''}"
            value="${value || prop.defaultValue || ''}">
    `,
    'textarea': (prop, value) => `
        <textarea 
            id="prop-${prop.name}" 
            data-field="${prop.name}"
            placeholder="${prop.placeholder || ''}"
        >${value || prop.defaultValue || ''}</textarea>
    `,
    'select': (prop, value) => `
        <div class="select-wrapper">
            <select id="prop-${prop.name}" data-field="${prop.name}">
                ${prop.options.map(option => `
                    <option value="${option}" ${ (value || prop.defaultValue) === option ? 'selected' : ''}>
                        ${option}
                    </option>
                `).join('')}
            </select>
        </div>
    `,
    
};


export function renderProperties(container, properties, currentConfig) {
    if (!properties || properties.length === 0) {
        container.innerHTML = '<p class="no-node-selected">Este nó não possui configurações.</p>';
        return;
    }

    let html = '';
    for (const prop of properties) {
        const renderer = fieldRenderers[prop.type];
        if (renderer) {
            const currentValue = currentConfig[prop.name];
            // NOVO: Adiciona um wrapper div com data attributes para a lógica de dependência
            html += `
                <div class="property-group" data-dependency="${prop.dependsOn ? `${prop.dependsOn.field}:${prop.dependsOn.value}` : ''}">
                    <label for="prop-${prop.name}">${prop.label}</label>
                    ${renderer(prop, currentValue)}
                    ${prop.info ? `<small>${prop.info}</small>` : ''}
                </div>
            `;
        }
    }
    container.innerHTML = html;
}