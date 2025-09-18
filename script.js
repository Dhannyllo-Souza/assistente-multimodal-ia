document.addEventListener('DOMContentLoaded', () => {
    const modeSelector = document.getElementById('mode-selector');
    const promptInput = document.getElementById('prompt-input');
    const generateBtn = document.getElementById('generate-btn');
    const outputArea = document.getElementById('output-area');

    let currentMode = 'text';
    
    // --- State Management for async operations ---
    let audioContext;
    let audioBuffer;
    let audioSource = null;
    let audioAnimationId = null;
    let typewriterTimeout = null;
    // ---

    // Load audio file for 8D audio simulation
    async function setupAudio() {
        try {
            window.AudioContext = window.AudioContext || window.webkitAudioContext;
            audioContext = new AudioContext();
            const response = await fetch('generated_audio.mp3');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const arrayBuffer = await response.arrayBuffer();
            audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        } catch (e) {
            console.error("Failed to load or decode audio file:", e);
            // We can handle this error more gracefully later if needed
        }
    }
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
            const newMode = e.target.dataset.mode;
            
            // Stop audio if switching away from audio mode
            if (currentMode === 'audio' && newMode !== 'audio') {
                stopAudio();
            }

            currentMode = newMode;
            promptInput.placeholder = getPlaceholderText(currentMode);
        }
    });

    generateBtn.addEventListener('click', () => {
        const prompt = promptInput.value.trim();
        if (!prompt) {
            outputArea.innerHTML = `<div class="placeholder" style="color: var(--secondary-color);">Por favor, digite um comando para gerar.</div>`;
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

    outputArea.addEventListener('click', (e) => {
        if (e.target.closest('.video-placeholder')) {
            alert('Esta é uma simulação de player de vídeo.');
        }
    });
    
    function getPlaceholderText(mode) {
        switch(mode) {
            case 'text': return "Digite seu comando... ex: 'crie um poema sobre o espaço'";
            case 'code': return "Digite seu comando... ex: 'escreva uma função python que some dois números'";
            case 'site': return "Digite seu comando... ex: 'crie um site de portfólio simples'";
            case 'game': return "Digite seu comando... ex: 'descreva a mecânica de um jogo de plataforma'";
            case 'image': return "Digite seu comando... ex: 'um astronauta em um cavalo, fotorrealista'";
            case 'video': return "Digite seu comando... ex: 'trailer cinematográfico de uma cidade cyberpunk'";
            case 'audio': return "Digite seu comando... ex: 'componha uma trilha sonora relaxante de 8D'";
            default: return "Digite seu comando...";
        }
    }

    function showLoading() {
        outputArea.innerHTML = `<div class="loading-animation"><div class="loader"></div></div>`;
    }
    
    // --- Simulated "Dynamic" Content Generation ---
    function getSimulatedTextResponse(prompt) {
        const lowerPrompt = prompt.toLowerCase();
        if (lowerPrompt.includes('poema')) {
            return `Claro, aqui está um poema sobre o espaço:\n\nNo veludo negro, um brilho sem par,\nDiamantes de fogo, a piscar,\nGaláxias dançando em um véu de luar,\nO universo sussurra, em seu eterno fiar.`;
        } else if (lowerPrompt.includes('história') || lowerPrompt.includes('conto')) {
            return `Era uma vez, em um futuro distante, um robô chamado Unit 734 que sonhava em pintar o pôr do sol de um planeta que ele nunca tinha visto. Todos os dias, ele misturava poeira de meteoros para criar novas cores, esperando um dia viajar para as estrelas.`;
        }
        return `Com base em sua solicitação: "${prompt}", aqui está um texto gerado:\n\nInteligência artificial é a simulação de processos de inteligência humana por máquinas, especialmente sistemas de computador. Essas aplicações incluem sistemas especialistas, processamento de linguagem natural, reconhecimento de fala e visão de máquina.`;
    }

    function getSimulatedCodeResponse(prompt) {
        const lowerPrompt = prompt.toLowerCase();
        if (lowerPrompt.includes('python') && lowerPrompt.includes('somar')) {
             return `Aqui está uma função em Python para somar dois números:\n\n<code class="language-python">def somar(a, b):\n  """Esta função retorna a soma de dois números."""\n  return a + b\n\n# Exemplo de uso:\nresultado = somar(5, 3)\nprint(f"O resultado é: {resultado}")\n</code>`;
        } else if (lowerPrompt.includes('javascript') && lowerPrompt.includes('alerta')) {
            return `Certo, aqui está um código JavaScript simples para exibir um alerta:\n\n<code class="language-javascript">function mostrarAlerta() {\n  alert("Olá, Mundo!");\n}\n\n// Para chamar a função:\nmostrarAlerta();\n</code>`;
        }
        return `Não foi possível gerar um código específico para "${prompt}". Aqui está um exemplo genérico em JavaScript:\n\n<code class="language-javascript">console.log("Olá, Nexus AI!");</code>`;
    }

    function generateOutput(prompt) {
        // --- Cleanup before generating new output ---
        stopAudio();
        if (typewriterTimeout) {
            clearTimeout(typewriterTimeout);
            typewriterTimeout = null;
        }
        // ---

        showLoading();
        // Simulate network delay
        setTimeout(() => {
            let content = '';
            switch (currentMode) {
                case 'text':
                    content = getSimulatedTextResponse(prompt);
                    typeWriter(content);
                    break;
                case 'code':
                    content = getSimulatedCodeResponse(prompt);
                     typeWriter(content, true);
                    break;
                case 'site':
                    content = `Simulação da estrutura de um site de portfólio:\n\n<pre><code>&lt;!DOCTYPE html&gt;
&lt;html&gt;
&lt;head&gt;
  &lt;title&gt;Meu Portfólio&lt;/title&gt;
&lt;/head&gt;
&lt;body&gt;
  &lt;h1&gt;Bem-vindo ao Meu Portfólio&lt;/h1&gt;
  &lt;p&gt;Confira meus projetos abaixo.&lt;/p&gt;
&lt;/body&gt;
&lt;/html&gt;
</code></pre>`;
                    typeWriter(content, true);
                    break;
                case 'game':
                    content = `Conceito de Jogo baseado em "${prompt}":\n\n**Título Provisório:** "Crônicas do Nexus"\n\n**Gênero:** RPG de Ação Sci-Fi.\n\n**Mecânica Principal:** O jogador explora mundos gerados proceduralmente, coletando artefatos de IA para aprimorar suas próprias habilidades. O combate é em tempo real, combinando tiroteios com habilidades especiais baseadas em "glitches" que o jogador pode invocar para manipular o ambiente e os inimigos.`;
                    typeWriter(content);
                    break;
                case 'image':
                    outputArea.innerHTML = `
                        <p>Gerando imagem para: "${prompt}"</p>
                        <img src="generated_image.png" alt="Imagem gerada pela IA">
                    `;
                    break;
                case 'video':
                     outputArea.innerHTML = `
                        <p>Gerando vídeo para: "${prompt}"</p>
                        <div class="video-placeholder" title="Clique para assistir (simulação)">
                            <img src="generated_image.png" alt="Thumbnail de vídeo gerado pela IA">
                            <div class="play-icon">▶</div>
                        </div>
                    `;
                    break;
                case 'audio':
                    outputArea.innerHTML = `<p>Gerando áudio 8D para: "${prompt}"</p><p>Use fones de ouvido para uma melhor experiência.</p>`;
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
        }, 1000);
    }
    
    function typeWriter(text, isHtml = false) {
        if (typewriterTimeout) {
            clearTimeout(typewriterTimeout);
        }
        outputArea.innerHTML = "";
        let i = 0;
        const speed = isHtml ? 5 : 30; // Type faster for code/html
        
        function type() {
            if (i < text.length) {
                if (isHtml) {
                    // To avoid breaking tags, find the next tag and add it all at once
                    if (text.charAt(i) === '<') {
                        const endIndex = text.indexOf('>', i);
                        outputArea.innerHTML += text.substring(i, endIndex + 1);
                        i = endIndex;
                    } else {
                        outputArea.innerHTML += text.charAt(i);
                    }
                } else {
                    outputArea.innerHTML += text.charAt(i);
                }
                i++;
                typewriterTimeout = setTimeout(type, speed);
            } else {
                 typewriterTimeout = null;
            }
        }
        type();
    }
});