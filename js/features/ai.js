// js/features/ai.js
import { askGeminiAI } from '../services/aiService.js';

export function renderAI(container) {
    container.innerHTML = `
        <div class="relative z-10 p-6 md:p-8 max-w-6xl mx-auto h-[calc(100vh-5rem)] flex flex-col">
            <header class="mb-4 shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 class="text-3xl font-bold text-on-surface tracking-tight">AI Assistant</h2>
                    <p class="text-on-surface-variant text-sm mt-1">Multi-Model Engine Active</p>
                </div>
                
                <div class="flex items-center gap-2 bg-surface-container-high border border-white/10 rounded-xl px-3 py-2 shadow-lg">
                    <span class="material-symbols-outlined text-primary-container text-sm">psychology</span>
                    <label for="ai-model-select" class="text-xs text-on-surface-variant font-medium">Model AI:</label>
                    <select id="ai-model-select" class="bg-transparent text-primary-container font-bold text-xs outline-none cursor-pointer border-none focus:ring-0">
                        <option value="groq-llama" class="bg-surface text-on-surface" selected>Groq - Llama 3.3 (70B) 🔥</option>
                        <option value="groq-deepseek" class="bg-surface text-on-surface">Groq - DeepSeek R1 🧠</option>
                        <option value="gemini" class="bg-surface text-on-surface">Google - Gemini 1.5 Flash ⚡</option>
                    </select>
                </div>
            </header>

            <div class="flex-1 glass-panel rounded-2xl flex flex-col overflow-hidden border border-white/10 mb-6 relative">
                
                <div id="chat-box" class="flex-1 p-6 overflow-y-auto flex flex-col gap-4">
                    <div class="flex gap-4">
                        <div class="w-10 h-10 rounded-full bg-gradient-to-tr from-secondary-container to-primary-container flex items-center justify-center text-black font-bold shrink-0">
                            <span class="material-symbols-outlined text-sm">smart_toy</span>
                        </div>
                        <div class="bg-surface-container-low border border-white/5 p-4 rounded-2xl rounded-tl-none max-w-2xl">
                            <p class="text-on-surface text-sm">Yo bro! Gua LifeHub AI buatan Reski Setiawan dari Team PixelForgeDev. Lu bisa ganti-ganti model AI di pojok kanan atas sesuai kebutuhan lu. Ada yang bisa gua bantu hari ini?</p>
                        </div>
                    </div>
                </div>

                <div class="p-4 border-t border-white/10 bg-surface/50 shrink-0">
                    <div class="flex items-center gap-2 bg-surface-container-low border border-white/10 rounded-xl p-2 focus-within:border-primary-container transition-all">
                        <button class="p-2 text-on-surface-variant hover:text-primary-container transition-colors">
                            <span class="material-symbols-outlined">attach_file</span>
                        </button>
                        <input id="ai-input" type="text" placeholder="Ketik pesan untuk LifeHub AI..." class="flex-1 bg-transparent border-none outline-none text-sm text-on-surface px-2 focus:ring-0">
                        <button id="btn-send-ai" class="p-2.5 bg-primary-container text-black rounded-lg hover:scale-105 active:scale-95 transition-all flex items-center justify-center shadow-[0_0_15px_rgba(0,229,255,0.3)]">
                            <span class="material-symbols-outlined text-lg">send</span>
                        </button>
                    </div>
                </div>

            </div>
        </div>
    `;

    // Inisialisasi Event Listener
    initAIChatLogic();
}

function initAIChatLogic() {
    const chatBox = document.getElementById('chat-box');
    const inputMsg = document.getElementById('ai-input');
    const btnSend = document.getElementById('btn-send-ai');
    const modelSelect = document.getElementById('ai-model-select');

    if (!chatBox || !inputMsg || !btnSend) return;

    const scrollToBottom = () => {
        chatBox.scrollTop = chatBox.scrollHeight;
    };

    const appendBubble = (text, sender) => {
        const div = document.createElement('div');
        div.className = 'flex gap-4 mb-2';

        const formatted = text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br>');

        if (sender === 'user') {
            div.classList.add('flex-row-reverse');
            div.innerHTML = `
                <div class="w-10 h-10 rounded-full bg-primary-container/20 border border-primary-container flex items-center justify-center text-primary-container font-bold shrink-0">RS</div>
                <div class="bg-primary-container/10 border border-primary-container/30 p-4 rounded-2xl rounded-tr-none max-w-2xl text-on-surface text-sm">
                    ${formatted}
                </div>
            `;
        } else if (sender === 'ai') {
            div.innerHTML = `
                <div class="w-10 h-10 rounded-full bg-gradient-to-tr from-secondary-container to-primary-container flex items-center justify-center text-black font-bold shrink-0">
                    <span class="material-symbols-outlined text-sm">smart_toy</span>
                </div>
                <div class="bg-surface-container-low border border-white/5 p-4 rounded-2xl rounded-tl-none max-w-2xl text-on-surface text-sm leading-relaxed">
                    ${formatted}
                </div>
            `;
        } else if (sender === 'loading') {
            div.id = 'ai-loading-indicator';
            div.innerHTML = `
                <div class="w-10 h-10 rounded-full bg-gradient-to-tr from-secondary-container to-primary-container flex items-center justify-center text-black font-bold shrink-0">
                    <span class="material-symbols-outlined text-sm animate-spin">refresh</span>
                </div>
                <div class="bg-surface-container-low border border-white/5 p-4 rounded-2xl rounded-tl-none max-w-2xl">
                    <p class="text-primary-container text-xs font-semibold tracking-wider uppercase animate-pulse">LifeHub AI lagi mikir...</p>
                </div>
            `;
        }

        chatBox.appendChild(div);
        scrollToBottom();
    };

    const processSend = async () => {
        const text = inputMsg.value.trim();
        if (!text) return;

        // Ambil model yang lagi dipilih di dropdown
        const selectedModel = modelSelect ? modelSelect.value : 'groq-llama';

        // 1. Tampilkan pesan user
        appendBubble(text, 'user');
        inputMsg.value = '';
        btnSend.disabled = true;

        // 2. Tampilkan indikator loading
        appendBubble('', 'loading');

        try {
            // 3. Panggil askGeminiAI dengan menyertakan pilihan model
            const reply = await askGeminiAI(text, null, selectedModel);

            // Hapus indikator loading
            const loader = document.getElementById('ai-loading-indicator');
            if (loader) loader.remove();

            // 4. Tampilkan jawaban dari AI
            appendBubble(reply, 'ai');

        } catch (err) {
            const loader = document.getElementById('ai-loading-indicator');
            if (loader) loader.remove();

            appendBubble(`Aduh bro, ada kendala pas konek ke model AI: ${err.message}`, 'ai');
        } finally {
            btnSend.disabled = false;
            inputMsg.focus();
        }
    };

    btnSend.addEventListener('click', processSend);
    inputMsg.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') processSend();
    });
}