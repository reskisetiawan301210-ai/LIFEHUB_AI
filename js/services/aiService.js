// js/services/aiService.js

export const GEMINI_API_KEY = 'AQ.Ab8RN6KdE8-zuOol5-9PkeudK86wmVhZWEh01ZqDiFCBnqpEmQ';
export const GROQ_API_KEY = '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';

function ambilRiwayatChat() {
    try {
        const localData = localStorage.getItem('lifehub_chat_memory');
        return localData ? JSON.parse(localData) : [];
    } catch (e) {
        return [];
    }
}

function simpanRiwayatChat(riwayatBaru) {
    try {
        localStorage.setItem('lifehub_chat_memory', JSON.stringify(riwayatBaru));
    } catch (e) {
        console.error("Gagal simpan riwayat chat:", e);
    }
}

export function hapusMemoriChat() {
    localStorage.removeItem('lifehub_chat_memory');
}

export async function askGeminiAI(userMessage, fileAttachment = null, modelPilihan = 'groq-llama') {
    let riwayatChat = ambilRiwayatChat();
    
    // SYSTEM PROMPT
    const systemPromptText = `Kamu adalah LifeHub AI.
- Nama: LifeHub AI
- Dibuat oleh: Team PixelForgeDev (Lead Developer: Reski Setiawan)
- Gaya Bicara: Anak Gen Z Indonesia (umur 18-20 tahun), gaul, santai, panggil "lu" dan "gua", pakai kata "bro", "cuy", "mantap", "gokil".
- DILARANG berbicara kaku, formal, atau ngomong "Saya/Anda".
- Jika ditanya siapa pembuatmu, jawab: "Gua buatan Team PixelForgeDev, lead developernya Reski Setiawan, bro!"`;

    // =========================================================================
    // OPTION A: GROQ ENGINE
    // =========================================================================
    if (modelPilihan.startsWith('groq')) {
        const url = `https://api.groq.com/openai/v1/chat/completions`;
        
        let namaModelGroq = 'llama-3.3-70b-versatile';
        if (modelPilihan === 'groq-deepseek') {
            namaModelGroq = 'deepseek-r1-distill-qwen-32b'; // Model aktif pengganti model lama
        } else if (modelPilihan === 'groq-instant') {
            namaModelGroq = 'llama-3.1-8b-instant';
        }

        // Jika user kirim gambar di Groq, switch ke Vision Model
        if (fileAttachment) {
            namaModelGroq = 'llama-3.2-11b-vision-preview';
        }

        let messagesGroq = [{ role: 'system', content: systemPromptText }];

        // Ambil 6 pesan terakhir
        const riwayatTerakhir = riwayatChat.slice(-6);
        riwayatTerakhir.forEach(msg => {
            const role = msg.role === 'model' ? 'assistant' : 'user';
            const textContent = msg.parts?.[0]?.text || msg.content || '';
            if (textContent) {
                messagesGroq.push({ role, content: textContent });
            }
        });

        // Content pesan baru
        let contentUser = [];
        if (userMessage) contentUser.push({ type: "text", text: userMessage });
        if (fileAttachment) {
            contentUser.push({
                type: "image_url",
                image_url: { url: `data:${fileAttachment.mimeType};base64,${fileAttachment.base64Data}` }
            });
        }

        messagesGroq.push({ role: 'user', content: contentUser.length === 1 && contentUser[0].type === 'text' ? userMessage : contentUser });

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json', 
                    'Authorization': `Bearer ${GROQ_API_KEY}` 
                },
                body: JSON.stringify({ 
                    model: namaModelGroq, 
                    messages: messagesGroq, 
                    temperature: 0.7 
                })
            });
            
            const data = await response.json();
            if (!response.ok) {
                return `❌ Error Groq (${namaModelGroq}): ${data.error?.message || 'Gagal tersambung'}`;
            }
            
            const reply = data.choices?.[0]?.message?.content;
            if (reply) {
                riwayatChat.push({ role: 'user', parts: [{ text: userMessage || '[Gambar]' }] });
                riwayatChat.push({ role: 'model', parts: [{ text: reply }] });
                simpanRiwayatChat(riwayatChat);
                return reply;
            }
        } catch (err) { 
            return `❌ Gagal konek Groq: ${err.message}`; 
        }
    } 
    
    // =========================================================================
    // OPTION B: GOOGLE GEMINI ENGINE
    // =========================================================================
    else {
        let modelGemini = 'gemini-1.5-flash';
        if (modelPilihan === 'gemini-1.5-pro') {
            modelGemini = 'gemini-1.5-pro';
        } else if (modelPilihan === 'gemini-2.0-flash') {
            modelGemini = 'gemini-2.0-flash';
        }

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelGemini}:generateContent?key=${GEMINI_API_KEY}`;
        
        // Buat struktur contents murni Google AI Studio
        let contentsGemini = [];

        // Formatting riwayat agar kompatibel dengan Gemini REST API
        const riwayatTerakhir = riwayatChat.slice(-6);
        riwayatTerakhir.forEach(msg => {
            const role = msg.role === 'model' ? 'model' : 'user';
            const textContent = msg.parts?.[0]?.text || '';
            if (textContent) {
                contentsGemini.push({
                    role: role,
                    parts: [{ text: textContent }]
                });
            }
        });

        // Pesan baru user
        let partsUserBaru = [];
        if (userMessage) {
            partsUserBaru.push({ text: userMessage });
        } else if (fileAttachment) {
            partsUserBaru.push({ text: "Tolong analisa gambar ini, bro!" });
        }

        if (fileAttachment) {
            partsUserBaru.push({
                inlineData: {
                    mimeType: fileAttachment.mimeType,
                    data: fileAttachment.base64Data
                }
            });
        }

        contentsGemini.push({
            role: 'user',
            parts: partsUserBaru
        });

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    systemInstruction: { parts: [{ text: systemPromptText }] },
                    contents: contentsGemini
                })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                return `❌ Error Gemini (${modelGemini}): ${data.error?.message || 'Cek koneksi/API Key'}`;
            }

            const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (reply) {
                riwayatChat.push({ role: 'user', parts: [{ text: userMessage || '[Gambar]' }] });
                riwayatChat.push({ role: 'model', parts: [{ text: reply }] });
                simpanRiwayatChat(riwayatChat);
                return reply;
            } else if (data.candidates?.[0]?.finishReason) {
                return `⚠️ Gemini menolak menjawab (Alasan: ${data.candidates[0].finishReason}).`;
            }
        } catch (err) { 
            return `❌ Gagal konek Gemini: ${err.message}`; 
        }
    }

    return "Waduh, AI-nya lagi gak ada respon nih bro, coba ketik ulang ya!";
}