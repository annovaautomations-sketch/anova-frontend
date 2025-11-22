document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIG --- 
    const API_URL = 'https://anova-realtime-backend-46703179756.us-central1.run.app/api/realtime-session';
    const MIC_BUBBLE_ICON = `
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
            <line x1="12" y1="19" x2="12" y2="23"></line>
        </svg>`;
    const CLOSE_ICON = '&times;';

    // --- STATE --- 
    let audioContext, mediaStream, mediaRecorder, audioSocket, audioProcessor, analyser, dataArray;
    let isRecording = false;
    let isPanelOpen = false;

    // --- HTML ELEMENTS --- 
    function createWidgetHTML() {
        const container = document.createElement('div');
        container.id = 'anova-voice-widget-container';

        container.innerHTML = `
            <div id="anova-widget-panel">
                <button id="anova-close-button">${CLOSE_ICON}</button>
                <div id="anova-status-message">Connecting...</div>
                <div id="anova-vu-meter">
                    ${Array(5).fill('<div class="vu-bar"></div>').join('')}
                </div>
            </div>
            <div id="anova-mic-bubble">${MIC_BUBBLE_ICON}</div>
        `;

        document.body.appendChild(container);
        return {
            micBubble: document.getElementById('anova-mic-bubble'),
            panel: document.getElementById('anova-widget-panel'),
            statusMessage: document.getElementById('anova-status-message'),
            vuMeter: document.getElementById('anova-vu-meter'),
            closeButton: document.getElementById('anova-close-button')
        };
    }

    const elements = createWidgetHTML();

    // --- UI FUNCTIONS --- 
    const setStatus = (message) => elements.statusMessage.textContent = message;
    const togglePanel = (force) => {
        isPanelOpen = typeof force === 'boolean' ? force : !isPanelOpen;
        elements.panel.classList.toggle('active', isPanelOpen);
    };

    function updateVUMeter() {
        if (!analyser || !isRecording) return;
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((acc, val) => acc + val, 0) / dataArray.length;
        const bars = elements.vuMeter.children;
        const normalized = Math.min(1, average / 128);
        
        for (let i = 0; i < bars.length; i++) {
            const barHeight = Math.max(10, Math.pow(normalized, 2) * 100 * (1 + i/bars.length) * 2 );
            bars[i].style.height = `${i < normalized * bars.length ? barHeight : 10}px`;
        }
        requestAnimationFrame(updateVUMeter);
    }

    // --- CORE LOGIC --- 
    async function startSession() {
        if (isRecording) return;

        togglePanel(true);
        setStatus('Connecting...');

        try {
            // 1. Get User Media
            mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            analyser = audioContext.createAnalyser();
            dataArray = new Uint8Array(analyser.frequencyBinCount);

            const source = audioContext.createMediaStreamSource(mediaStream);
            source.connect(analyser);

            // 2. Start WebSocket Connection
            audioSocket = new WebSocket('wss://anova-realtime-backend-46703179756.us-central1.run.app');

            audioSocket.onopen = async () => {
                setStatus('Speak now...');
                isRecording = true;

                // 3. First API call to get session ID
                const response = await fetch(API_URL, {
                    method: 'POST', 
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sampleRate: audioContext.sampleRate })
                });
                const data = await response.json();
                if (!data.sessionId) throw new Error('Failed to get session ID.');

                audioSocket.send(JSON.stringify({ type: 'start_session', sessionId: data.sessionId }));

                // 4. Start sending audio data
                audioProcessor = audioContext.createScriptProcessor(2048, 1, 1);
                source.connect(audioProcessor);
                audioProcessor.connect(audioContext.destination);
                audioProcessor.onaudioprocess = (e) => {
                    if (!isRecording || audioSocket.readyState !== WebSocket.OPEN) return;
                    const inputData = e.inputBuffer.getChannelData(0);
                    audioSocket.send(inputData.buffer);
                };

                requestAnimationFrame(updateVUMeter);
            };

            audioSocket.onmessage = (event) => {
                console.log("Received from server:", event.data);
                // Handle incoming transcripts or commands here
                setStatus(event.data); // Simple display for now
            };

            audioSocket.onerror = (error) => {
                console.error('WebSocket Error:', error);
                setStatus('Connection error.');
                stopSession();
            };

            audioSocket.onclose = () => {
                console.log('WebSocket disconnected.');
                if (isRecording) { // Unexpected close
                  stopSession();
                  setStatus('Connection lost.');
                }
            };

        } catch (error) {
            console.error('Error starting session:', error);
            setStatus(error.name === 'NotAllowedError' ? 'Microphone access denied.' : 'Error starting session.');
            setTimeout(stopSession, 3000);
        }
    }

    function stopSession() {
        if (!isRecording && !isPanelOpen) return;
        
        if(audioSocket && audioSocket.readyState === WebSocket.OPEN) {
             audioSocket.send(JSON.stringify({ type: 'end_session' }));
             audioSocket.close();
        }

        if (mediaRecorder && mediaRecorder.state === 'recording') mediaRecorder.stop();
        if (audioProcessor) audioProcessor.disconnect();
        if (mediaStream) mediaStream.getTracks().forEach(track => track.stop());
        if (audioContext && audioContext.state !== 'closed') audioContext.close();

        isRecording = false;
        togglePanel(false);
        setStatus('Click to start'); // Reset status
    }


    // --- EVENT LISTENERS --- 
    elements.micBubble.addEventListener('click', () => {
        if (!isPanelOpen) {
            startSession();
        } else {
            stopSession();
        }
    });
    elements.closeButton.addEventListener('click', stopSession);

    // Make trigger function global
    window.anovaTrigger = startSession;
});
