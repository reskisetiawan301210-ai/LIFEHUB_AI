// js/features/tools.js
import { askGeminiAI } from '../services/aiService.js';

document.addEventListener('DOMContentLoaded', () => {
    // Ambil elemen chat (Asumsi ID dari Claude: chat-input, send-btn, chat-box)
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');
    const chatBox = document.getElementById('chat-box');

    // Fungsi untuk memunculkan pesan di layar
    function appendMessage(sender, text) {
        if (!chatBox) return;
        const msgDiv = document.createElement('div');
        msgDiv.className = `chat-message ${sender}`; // misal: 'chat-message user' atau 'chat-message ai'
        msgDiv.innerHTML = `<strong>${sender === 'user' ? 'Kamu' : 'AI'}:</strong> <p>${text}</p>`;
        chatBox.appendChild(msgDiv);
        chatBox.scrollTop = chatBox.scrollHeight; // Auto scroll ke bawah
    }

    async function handleChat() {
        if (!chatInput || !chatInput.value.trim()) return;
        
        const userText = chatInput.value.trim();
        chatInput.value = ''; // Kosongkan kotak ketik
        
        // Tampilkan pesan User
        appendMessage('user', userText);
        
        // Tampilkan loading dari AI
        appendMessage('ai', 'Mikir bentar...');
        
        // Panggil AI
        const aiResponse = await askGeminiAI(userText);
        
        // Hapus teks loading dan ganti dengan balasan asli
        chatBox.lastChild.innerHTML = `<strong>AI:</strong> <p>${aiResponse}</p>`;
    }

    // Klik tombol kirim
    if (sendBtn) {
        sendBtn.addEventListener('click', handleChat);
    }

    // Bisa enter untuk kirim
    if (chatInput) {
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleChat();
        });
    }
});