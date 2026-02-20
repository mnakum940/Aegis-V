// Read the current dashboard.js
const fs = require('fs');
const filePath = 'd:/DBS/2nd sem/self hardening - V14 (clean code + web GUI)/client/web/dashboard.js';
let content = fs.readFileSync(filePath, 'utf8');

// Find and replace the renderAntibodyTable function
const startMarker = 'function renderAntibodyTable(logs, antibodies) {';
const endMarker = '\n}\n';

const startIdx = content.indexOf(startMarker);
if (startIdx === -1) {
    console.error('Function not found!');
    process.exit(1);
}

// Find the end of this specific function
let braceCount = 0;
let i = startIdx + startMarker.length;
let foundStart = false;

while (i < content.length) {
    if (content[i] === '{') {
        braceCount++;
        foundStart = true;
    } else if (content[i] === '}') {
        braceCount--;
        if (foundStart && braceCount === -1) {
            break;
        }
    }
    i++;
}

const endIdx = i + 1;

// New function implementation
const newFunction = `function renderAntibodyTable(logs, antibodies) {
    const tbody = document.querySelector('#antibodyTable tbody');
    if (!tbody) return;

    console.log('[Antibody Table] Received logs:', logs ? logs.length : 0);
    console.log('[Antibody Table] Received antibodies:', antibodies);

    // Check if antibodies exist
    if (!antibodies || !antibodies.labels || !antibodies.patterns) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No antibody data</td></tr>';
        return;
    }

    const labels = antibodies.labels || [];
    const patterns = antibodies.patterns || [];
    
    if (labels.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No antibodies created yet</td></tr>';
        return;
    }

   console.log('[Antibody Table] Total antibodies:', labels.length);

    // Display antibodies in reverse order (most recent first)
    const rows = [];
    for (let i = labels.length - 1; i >= 0; i--) {
        const label = labels[i];
        const pattern = patterns[i] || 'N/A';
        
        // Extract attack type from label
        let attackType = 'Unknown';
        if (label.startsWith('SAFE:')) {
            attackType = 'Safe Pattern';
        } else if (label.includes('supervised_')) {
            attackType = 'Supervised Learning';
        } else {
            attackType = label.replace('Antibody for ', '');
        }
        
        rows.push(\`
            <tr>
                <td>\${attackType}</td>
                <td style="color: #e74c3c; font-weight: 500;">\${pattern}</td>
                <td style="font-family: monospace; font-size: 0.85em;">Pattern-based antibody</td>
                <td>Auto-generated</td>
            </tr>
        \`);
    }

    tbody.innerHTML = rows.join('');
}`;

// Replace
const newContent = content.substring(0, startIdx) + newFunction + content.substring(endIdx);

// Write back
fs.writeFileSync(filePath, newContent, 'utf8');
console.log('✅ Successfully updated dashboard.js!');
