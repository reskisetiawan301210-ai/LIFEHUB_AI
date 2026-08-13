// js/features/ai.js

// 🟢 1. BIKIN MEMORI GLOBAL BIAR CHAT GAK ILANG PAS GANTI MENU
if (!window.globalLifeHubChatHistory) {
    window.globalLifeHubChatHistory = [];
}

export function renderAI(container) {
    // Render UI Utama
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
                    <div class="flex gap-4 mb-2">
                        <div class="w-10 h-10 rounded-full bg-gradient-to-tr from-secondary-container to-primary-container flex items-center justify-center text-black font-bold shrink-0">
                            <span class="material-symbols-outlined text-sm">smart_toy</span>
                        </div>
                        <div class="bg-surface-container-low border border-white/5 p-4 rounded-2xl rounded-tl-none max-w-2xl">
                            <p class="text-on-surface text-sm">Yo bro! Gua LifeHub AI buatan Team Legacy (Xazyy). Lu bisa ganti model AI di pojok kanan atas sesuai kebutuhan. Ada yang bisa gua bantu hari ini?</p>
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

    // Jalankan sistem logika chat
    initAIChatLogic();
}

function initAIChatLogic() {
    const chatBox = document.getElementById('chat-box');
    const inputMsg = document.getElementById('ai-input');
    const btnSend = document.getElementById('btn-send-ai');
    const modelSelect = document.getElementById('ai-model-select');

    if (!chatBox || !inputMsg || !btnSend) return;

    // Ambil memori chat yang tersimpan secara global
    const chatHistory = window.globalLifeHubChatHistory;

    // Fungsi otomatis scroll ke bawah
    const scrollToBottom = () => {
        chatBox.scrollTop = chatBox.scrollHeight;
    };

    // Fungsi untuk bikin elemen bubble chat
    const appendBubble = (text, sender) => {
        const div = document.createElement('div');
        div.className = 'flex gap-4 mb-2';

        // Format basic untuk bold dan enter
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

    // 🟢 2. RENDER ULANG HISTORY JIKA ADA (Biar pas pindah menu chat gak ilang)
    if (chatHistory.length > 0) {
        chatHistory.forEach(msg => {
            // Abaikan system prompt kalau kebetulan masuk sini, cuma nampilin user & asisten
            if (msg.role === 'user' || msg.role === 'assistant') {
                appendBubble(msg.content, msg.role === 'user' ? 'user' : 'ai');
            }
        });
    }

    // 🟢 3. LOGIKA PENGIRIMAN PESAN
    const processSend = async () => {
        const text = inputMsg.value.trim();
        if (!text) return;

        // Simpan pesan user ke dalam memori
        chatHistory.push({ role: "user", content: text });

        // Kunci input & tombol kirim
        inputMsg.value = '';
        inputMsg.disabled = true;
        btnSend.disabled = true;

        // Munculkan di layar
        appendBubble(text, 'user');
        appendBubble('', 'loading');

        // Cek model apa yang dipilih user
        const selectedValue = modelSelect ? modelSelect.value : 'groq-llama';
        let provider = 'groq';
        let model = 'llama-3.3-70b-versatile';

        if (selectedValue === 'groq-deepseek') {
            provider = 'groq';
            model = 'deepseek-r1-distill-llama-70b';
        } else if (selectedValue === 'gemini') {
            provider = 'gemini';
            model = 'gemini-1.5-flash';
        }

        try {
            // Panggil file aiservis.js lu yang udah kita setup bareng
            if (!window.LifeHubAI || !window.LifeHubAI.sendMessageWithFallback) {
                throw new Error("File aiservis.js belum terhubung dengan benar di index.html lu.");
            }

            const res = await window.LifeHubAI.sendMessageWithFallback({
                provider: provider,
                model: model,
                messages: chatHistory // 👈 Ngirim semua history ke engine
            });

            // Hapus loading
            const loader = document.getElementById('ai-loading-indicator');
            if (loader) loader.remove();

            // Tampilkan hasil & simpan jawaban AI ke memori
            appendBubble(res.text, 'ai');
            chatHistory.push({ role: "assistant", content: res.text });

        } catch (err) {
            // Hapus loading
            const loader = document.getElementById('ai-loading-indicator');
            if (loader) loader.remove();

            // Kalo gagal, buang pesan user tadi dari history biar gak rusak pas di-retry
            chatHistory.pop();

            appendBubble(`Aduh bro, ada error nih: ${err.message}`, 'ai');
        } finally {
            // Buka kunci input lagi
            inputMsg.disabled = false;
            btnSend.disabled = false;
            inputMsg.focus();
        }
    };

    // Tombol Click & Enter
    btnSend.addEventListener('click', processSend);
    inputMsg.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') processSend();
    });
}