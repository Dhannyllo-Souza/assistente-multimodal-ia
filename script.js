document.addEventListener('DOMContentLoaded', () => {
    const modeSelector = document.getElementById('mode-selector');
    const promptInput = document.getElementById('prompt-input');
    const generateBtn = document.getElementById('generate-btn');
    const outputArea = document.getElementById('output-area');
    const outputActions = document.getElementById('output-actions');
    const downloadBtn = document.getElementById('download-btn');

    let currentMode = 'text';
    let lastGeneratedContent = { type: '', content: '' }; // For download functionality
    let typewriterTimeout = null;
    
    // --- State Management for async operations ---
    let audioContext;
    let audioBuffer;
    let audioSource = null;
    let audioAnimationId = null;
    // ---

    // API Configuration
    const HUGGINGFACE_API_BASE = "https://api-inference.huggingface.co/models/";
    // Switched to more powerful models
    const TEXT_MODEL = "mistralai/Mistral-7B-Instruct-v0.2";
    const IMAGE_MODEL = "SG161222/Realistic_Vision_V5.1_noVAE"; // A good alternative for photorealism

    // --- API Helper Functions ---

    // Generic function to query Hugging Face models with timeout
    async function queryHuggingFace(model, data) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30-second timeout

        try {
            const response = await fetch(
                `${HUGGINGFACE_API_BASE}${model}`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(data),
                    signal: controller.signal
                }
            );

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorText = await response.text();
                console.error("API Error:", errorText);
                // Models can take time to load on Hugging Face, this is a common error.
                if (response.status === 503 && errorText.includes("estimated_time")) {
                     throw new Error(`O modelo de IA está sendo carregado no servidor. Por favor, tente novamente em alguns instantes.`);
                }
                throw new Error(`Falha na API de IA (Status: ${response.status}). O modelo pode estar temporariamente indisponível ou sobrecarregado.`);
            }
            return response;
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error('A API demorou muito para responder (Timeout). Tente um comando mais simples ou verifique sua conexão.');
            }
             // Catch network errors
            if (error instanceof TypeError) {
                throw new Error('Erro de rede. Verifique sua conexão com a internet e tente novamente.');
            }
            throw error; // Re-throw other errors
        }
    }

    // Function to generate text content using an instruction-tuned model
    async function generateText(prompt) {
        // Using a structured prompt for better results with instruct models
        const fullPrompt = `[INST] ${prompt} [/INST]`;
        const response = await queryHuggingFace(TEXT_MODEL, { 
            "inputs": fullPrompt,
            "parameters": { "return_full_text": false, "max_new_tokens": 1024 } // Increased token limit for sites
        });
        const result = await response.json();
        if (result && result[0] && result[0].generated_text) {
            return result[0].generated_text.trim();
        }
        return "Não foi possível gerar uma resposta de texto. O resultado da API estava vazio.";
    }

    // Function to generate an image
    async function generateImage(prompt) {
        const response = await queryHuggingFace(IMAGE_MODEL, { "inputs": prompt });
        const imageBlob = await response.blob();
        return URL.createObjectURL(imageBlob);
    }

    // Load audio file for 8D audio simulation
    async function setupAudio() {
        if (audioContext) return; // Already initialized
        try {
            window.AudioContext = window.AudioContext || window.webkitAudioContext;
            audioContext = new AudioContext();
            // Start in suspended state until user interaction
            if (audioContext.state === 'suspended') {
                console.log('AudioContext is suspended. Will resume on user interaction.');
            }
            const response = await fetch('generated_audio.mp3');
            const arrayBuffer = await response.arrayBuffer();
            audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        } catch (e) {
            console.error("Failed to load or decode audio file:", e);
            showError("Não foi possível carregar os recursos de áudio. A geração de áudio pode não funcionar.");
        }
    }
    // Call setup on load, but it won't play until user interaction.
    setupAudio();

    // Stop any ongoing audio playback and animation
    function stopAudio() {
        if (audioSource) {
            audioSource.stop();
            audioSource.disconnect();
            audioSource = null;
        }
        if (audioAnimationId) {
            cancelAnimationFrame(audioAnimationId);
            audioAnimationId = null;
        }
    }

    modeSelector.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            document.querySelector('.mode-btn.active').classList.remove('active');
            e.target.classList.add('active');
            currentMode = e.target.dataset.mode;
            promptInput.placeholder = getPlaceholderText(currentMode);
            // Auto-resize textarea
            promptInput.style.height = 'auto';
            promptInput.style.height = (promptInput.scrollHeight) + 'px';
            // Stop audio when switching modes
            if (currentMode !== 'audio') {
                stopAudio();
            }
        }
    });

    generateBtn.addEventListener('click', () => {
        const prompt = promptInput.value;
        if (!prompt) {
            alert('Por favor, digite um comando.');
            return;
        }
        // Ensure audio context is resumed by user gesture
        if (currentMode === 'audio' && audioContext && audioContext.state === 'suspended') {
            audioContext.resume().then(() => {
                generateOutput(prompt);
            });
        } else {
            generateOutput(prompt);
        }
    });

    // Auto-resize textarea on input
    promptInput.addEventListener('input', () => {
        promptInput.style.height = 'auto';
        promptInput.style.height = (promptInput.scrollHeight) + 'px';
    });
    
    // Allow Shift+Enter for new line, Enter to submit
    promptInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            generateBtn.click();
        }
    });

    outputArea.addEventListener('click', (e) => {
        if (e.target.closest('.video-placeholder')) {
            alert('Esta é uma simulação de player de vídeo.');
        }
        if (e.target.classList.contains('copy-code-btn')) {
            const code = e.target.nextElementSibling.innerText;
            navigator.clipboard.writeText(code).then(() => {
                e.target.textContent = 'Copiado!';
                setTimeout(() => { e.target.textContent = 'Copiar Código'; }, 2000);
            }, (err) => {
                console.error('Could not copy text: ', err);
                e.target.textContent = 'Falhou!';
                setTimeout(() => { e.target.textContent = 'Copiar Código'; }, 2000);
            });
        }
    });
    
    function getPlaceholderText(mode) {
        switch(mode) {
            case 'text': return "Digite seu comando... ex: 'crie um poema sobre o espaço'";
            case 'code': return "Digite seu comando... ex: 'escreva uma função python que some dois números'";
            case 'site': return "Digite seu comando... ex: 'crie um site de portfólio simples com html, css e js'";
            case 'game': return "Digite seu comando... ex: 'descreva a mecânica de um jogo de plataforma'";
            case 'image': return "Digite seu comando... ex: 'um astronauta em um cavalo, fotorrealista'";
            case 'video': return "Digite seu comando... ex: 'trailer cinematográfico de uma cidade cyberpunk'";
            case 'audio': return "Digite seu comando... ex: 'simule uma trilha sonora relaxante de 8D'";
            default: return "Digite seu comando...";
        }
    }

    function showLoading() {
        outputArea.innerHTML = `<div class="loading-animation"><div class="loader"></div></div>`;
    }

    function showError(message) {
        outputArea.innerHTML = `<div class="api-error"><h4>Ocorreu um erro</h4><p>${message}</p></div>`;
        outputActions.classList.add('hidden');
    }
    
    // Helper to extract code from markdown-like responses ```lang\ncode\n```
    function extractCode(text) {
        const match = /```(?:\w+)?\n([\s\S]+?)\n```/.exec(text);
        return match ? match[1].trim() : text;
    }

    async function generateOutput(prompt) {
        // --- Cleanup before generating new output ---
        stopAudio();
        outputActions.classList.add('hidden');
        lastGeneratedContent = { type: '', content: '' };
        // ---

        showLoading();

        try {
            switch (currentMode) {
                case 'text': {
                    const response = await generateText(prompt);
                    lastGeneratedContent = { type: 'text', content: response };
                    outputArea.innerHTML = ''; // Clear for typewriter
                    typeWriter(marked.parse(response, { sanitize: true }), true);
                    outputActions.classList.remove('hidden');
                    break;
                }
                case 'code': {
                     const response = await generateText(`Sua tarefa é gerar apenas o bloco de código para o seguinte pedido: "${prompt}". Não inclua explicações, apenas o código formatado em um bloco markdown. Identifique a linguagem (ex: javascript, python).`);
                    const code = extractCode(response);
                    lastGeneratedContent = { type: 'code', content: code };
                    outputArea.innerHTML = `
                        <div class="code-block-header">
                            <span class="code-title">Código Gerado</span>
                            <button class="copy-code-btn">Copiar Código</button>
                        </div>
                        <pre><code class="hljs">${code.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</code></pre>
                    `;
                    hljs.highlightElement(outputArea.querySelector('code'));
                    outputActions.classList.remove('hidden');
                    break;
                }
                case 'site': {
                    const response = await generateText(`Gere um arquivo HTML completo e funcional para o seguinte pedido: "${prompt}". O CSS deve estar dentro de tags <style> no <head>. O Javascript deve estar dentro de tags <script> antes de fechar o </body>. Forneça apenas o código, sem explicações, formatado em um bloco de código HTML.`);
                    const htmlContent = extractCode(response);
                    lastGeneratedContent = { type: 'site', content: htmlContent };
                    const blob = new Blob([htmlContent], { type: 'text/html' });
                    const url = URL.createObjectURL(blob);

                    outputArea.innerHTML = `
                        <div class="site-preview">
                            <div class="site-header">Prévia do Site</div>
                            <iframe src="${url}" sandbox="allow-scripts allow-same-origin"></iframe>
                        </div>
                        <details class="code-details">
                            <summary>Ver Código-Fonte</summary>
                            <div class="code-block-header">
                               <span class="code-title">HTML</span>
                               <button class="copy-code-btn">Copiar Código</button>
                            </div>
                            <pre><code class="language-html hljs">${htmlContent.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</code></pre>
                        </details>
                    `;
                     hljs.highlightElement(outputArea.querySelector('code'));
                     outputActions.classList.remove('hidden');
                    break;
                }
                case 'game': {
                    const response = await generateText(`Descreva em detalhes um conceito de jogo, incluindo mecânicas, objetivo e tema, baseado na seguinte ideia: "${prompt}"`);
                    const markdownResponse = `### Conceito de Jogo para: *"${prompt}"*\n\n---\n\n${response}`;
                    lastGeneratedContent = { type: 'game', content: markdownResponse };
                    outputArea.innerHTML = ''; // Clear for typewriter
                    typeWriter(marked.parse(markdownResponse, { sanitize: true }), true);
                    outputActions.classList.remove('hidden');
                    break;
                }
                case 'image': {
                    const imageUrl = await generateImage(prompt);
                    lastGeneratedContent = { type: 'image', content: imageUrl };
                    outputArea.innerHTML = `
                        <p>Imagem gerada para: "${prompt}"</p>
                        <img src="${imageUrl}" alt="Imagem gerada pela IA para: ${prompt}">
                        <a href="${imageUrl}" download="generated_image.png" style="display: block; text-align: center; margin-top: 1rem; color: var(--primary-color);">Baixar Imagem</a>
                    `;
                    // The download button in actions is not needed as we provide a direct link
                    outputActions.classList.add('hidden');
                    break;
                }
                case 'video': {
                    // Simulate video by generating a thumbnail first
                     const imageUrl = await generateImage(`cinematic trailer thumbnail for: ${prompt}`);
                     outputArea.innerHTML = `
                        <p>Gerando prévia de vídeo para: "${prompt}"</p>
                        <div class="video-placeholder" title="Clique para assistir (simulação)">
                            <img src="${imageUrl}" alt="Thumbnail de vídeo gerado pela IA">
                            <div class="play-icon">▶</div>
                        </div>
                         <p style="text-align: center; font-style: italic; margin-top: 1rem; color: #888;">A geração de vídeo real não é suportada no momento.</p>
                    `;
                    break;
                }
                case 'audio':
                    outputArea.innerHTML = `<p>Simulando áudio 8D para: "${prompt}"</p><p>Use fones de ouvido para uma melhor experiência.</p>`;
                    if(audioBuffer && audioContext) {
                        // Re-create source node each time
                        audioSource = audioContext.createBufferSource();
                        audioSource.buffer = audioBuffer;
                        audioSource.loop = true; // Loop the audio for continuous effect

                        const panner = audioContext.createPanner();
                        panner.panningModel = 'HRTF';
                        panner.distanceModel = 'inverse';
                        panner.refDistance = 1;
                        panner.maxDistance = 10000;
                        panner.rolloffFactor = 1;
                        panner.coneInnerAngle = 360;
                        panner.coneOuterAngle = 0;
                        panner.coneOuterGain = 0;
                        
                        audioSource.connect(panner).connect(audioContext.destination);
                        audioSource.start(0);

                        // Smooth circular motion for 8D effect using requestAnimationFrame
                        const orbitRadius = 2.5;
                        let angle = 0;
                        const animatePanner = () => {
                            panner.positionX.setValueAtTime(Math.cos(angle) * orbitRadius, audioContext.currentTime);
                            panner.positionZ.setValueAtTime(Math.sin(angle) * orbitRadius, audioContext.currentTime);
                            angle += 0.01;
                            audioAnimationId = requestAnimationFrame(animatePanner);
                        };
                        animatePanner();

                    } else {
                        outputArea.innerHTML += `<p style="color:red;">Não foi possível carregar o áudio. Tente recarregar a página.</p>`;
                    }
                    break;
            }
        } catch (error) {
            console.error(error);
            showError(error.message);
        }
    }
    
    function typeWriter(text, isHtml = false) {
        if (typewriterTimeout) {
            clearTimeout(typewriterTimeout);
        }
        outputArea.innerHTML = "";
        let i = 0;
        const speed = 10; // Adjusted speed
        
        function type() {
            if (i < text.length) {
                // To avoid breaking tags, find the next tag and add it all at once
                if (isHtml && text.charAt(i) === '<') {
                    const endIndex = text.indexOf('>', i);
                    if (endIndex !== -1) {
                         outputArea.innerHTML += text.substring(i, endIndex + 1);
                         i = endIndex;
                    } else {
                        // Fallback for broken html
                        outputArea.innerHTML += text.charAt(i);
                    }
                } else {
                    outputArea.innerHTML += text.charAt(i);
                }
                i++;
                outputArea.scrollTop = outputArea.scrollHeight; // Auto-scroll
                typewriterTimeout = setTimeout(type, speed);
            } else {
                 typewriterTimeout = null;
                 // Re-apply highlighting after typing is done for code blocks
                 if (currentMode === 'code' || currentMode === 'site') {
                     outputArea.querySelectorAll('pre code').forEach((block) => {
                        hljs.highlightElement(block);
                    });
                 }
            }
        }
        type();
    }
});