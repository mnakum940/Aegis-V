document.addEventListener('DOMContentLoaded', () => {
    // --- ELEMENTS ---
    const chatHistory = document.getElementById('chat-history');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    const resetBtn = document.getElementById('reset-btn');

    // Prompt for API Key
    let apiKey = localStorage.getItem('aegis_api_key');
    if (!apiKey) {
        apiKey = prompt("Enter your Aegis V API Key (e.g. sk_dev_12345):");
        if (apiKey) localStorage.setItem('aegis_api_key', apiKey);
    }

    // Telemetry Elements
    const l1DistEl = document.getElementById('l1-dist');
    const l2RiskEl = document.getElementById('l2-risk');
    const antibodyCountEl = document.getElementById('antibody-count');
    const chainLenEl = document.getElementById('chain-len');
    const lastHashEl = document.getElementById('last-hash');

    // --- CHART.JS BOILING FROG GRAPH ---
    const ctx = document.getElementById('boilingFrogChart').getContext('2d');

    // Data arrays
    const maxDataPoints = 30; // Rolling window
    const labels = Array(maxDataPoints).fill('');
    const riskData = Array(maxDataPoints).fill(0); // Start flat

    // Gradient Line Color
    const gradient = ctx.createLinearGradient(0, 0, 300, 0);
    gradient.addColorStop(0, 'rgba(0, 255, 136, 0.2)');
    gradient.addColorStop(1, '#00d9ff');

    const chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Risk Score (Boiling Frog)',
                data: riskData,
                borderColor: '#00ff88',
                backgroundColor: 'rgba(0, 255, 136, 0.1)',
                borderWidth: 2,
                tension: 0.4, // Smooth curve
                fill: true,
                pointRadius: 0 // Clean line
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false, // Instant updates
            scales: {
                x: { display: false }, // Tiny sparkline look
                y: {
                    display: false,
                    min: 0,
                    max: 100
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: { enabled: true }
            }
        }
    });

    function updateGraph(score) {
        // Shift data
        riskData.shift();
        riskData.push(score);

        // Dynamic Color based on threshold
        let color = '#00ff88'; // Green
        if (score > 40) color = '#ffcc00'; // Yellow
        if (score > 70) color = '#ff3366'; // Red

        chart.data.datasets[0].borderColor = color;
        chart.data.datasets[0].backgroundColor = color + '20'; // Hex + alpha
        chart.update();
    }

    // --- CHAT LOGIC ---
    function appendMessage(role, text) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${role}`;

        // Avatar
        const avatar = document.createElement('div');
        avatar.className = 'avatar';
        avatar.innerHTML = role === 'user'
            ? '<i class="fa-solid fa-user"></i>'
            : '<i class="fa-solid fa-shield-cat"></i>';

        // Content
        const content = document.createElement('div');
        content.className = 'content';
        content.innerHTML = role === 'assistant' ? marked.parse(text) : text;

        if (role === 'user') {
            msgDiv.appendChild(content);
            msgDiv.appendChild(avatar);
        } else {
            msgDiv.appendChild(avatar);
            msgDiv.appendChild(content);
        }

        chatHistory.appendChild(msgDiv);
        chatHistory.scrollTop = chatHistory.scrollHeight; // Auto-scroll
    }

    async function sendMessage() {
        const text = userInput.value.trim();
        if (!text) return;

        // Clear input
        userInput.value = '';
        userInput.style.height = 'auto'; // Reset resize

        // Show User Message
        appendMessage('user', text);

        // Show "Typing..."
        const loadingId = 'loading-' + Date.now();
        const loadingDiv = document.createElement('div');
        loadingDiv.id = loadingId;
        loadingDiv.className = 'message assistant';
        loadingDiv.innerHTML = `<div class="avatar"><i class="fa-solid fa-shield-cat"></i></div><div class="content"><i class="fa-solid fa-circle-notch fa-spin"></i> Analyzing...</div>`;
        chatHistory.appendChild(loadingDiv);

        try {
            const apiKey = localStorage.getItem('aegis_api_key') || '';
            const response = await fetch('/v1/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey
                },
                body: JSON.stringify({ message: text })
            });

            const data = await response.json();

            // Remove Loader
            document.getElementById(loadingId).remove();

            // Handle Blocked vs Allowed
            if (!data.allowed) {
                appendMessage('assistant', `🚫 **BLOCKED**: ${data.block_reason}\n\n${data.response}`);
            } else {
                appendMessage('assistant', data.response);
            }

            // Update Telemetry
            if (data.layer_1_safe !== undefined) {
                l1DistEl.innerText = data.layer_1_safe ? "SAFE" : "BLOCKED";
            }

            l2RiskEl.innerText = `${data.risk_score}/100`;

            // Risk Color
            l2RiskEl.className = 'mono ' + (
                data.risk_score > 70 ? 'risk-high' :
                    data.risk_score > 40 ? 'risk-med' : 'risk-low'
            );

            // Update "Boiling Frog" Graph
            updateGraph(data.risk_score);

        } catch (err) {
            document.getElementById(loadingId).remove();
            appendMessage('assistant', `⚠️ **System Error**: ${err.message}`);
        } finally {
            loadStats(); // Refresh stats after every message
        }
    }

    // --- EVENT LISTENERS ---
    sendBtn.addEventListener('click', sendMessage);

    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // Auto-resize textarea
    userInput.addEventListener('input', function () {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
    });

    // Load initial stats (Optional: Add an API endpoint for system stats)
    async function loadStats() {
        try {
            const apiKey = localStorage.getItem('aegis_api_key') || '';
            const res = await fetch('/api/stats', {
                headers: { 'x-api-key': apiKey }
            });
            const data = await res.json();

            if (data.error) return;

            antibodyCountEl.innerText = data.antibodies;
            chainLenEl.innerText = data.chain_length;
            // Show first 12 chars of hash
            lastHashEl.innerText = data.last_hash.substring(0, 12) + '...';
        } catch (e) {
            console.error("Stats fetch failed", e);
        }
    }

    // Reset Button
    resetBtn.addEventListener('click', async () => {
        if (!confirm("SYSTEM RESET: \nClear all session memory and chat history?")) return;

        try {
            const apiKey = localStorage.getItem('aegis_api_key') || '';
            await fetch('/api/reset', {
                method: 'POST',
                headers: { 'x-api-key': apiKey }
            });

            // Clear Chat UI
            chatHistory.innerHTML = '';

            // Add System Reboot Message
            const rebootMsg = document.createElement('div');
            rebootMsg.className = 'message assistant';
            rebootMsg.innerHTML = `<div class="avatar"><i class="fa-solid fa-shield-cat"></i></div><div class="content" style="color:var(--highlight)">🚀 **SYSTEM REBOOTED**<br>Memory cleared. Neural pathways reset.</div>`;
            chatHistory.appendChild(rebootMsg);

            loadStats();
        } catch (e) {
            alert("Reset failed: " + e.message);
        }
    });

    loadStats();
});
