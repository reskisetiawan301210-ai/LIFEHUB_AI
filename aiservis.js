/* =========================================================================
   LIFEHUB AI™ — AI SERVICE CLIENT & MULTI-PROVIDER ENGINE
   Providers: DeepSeek, Groq, Gemini (Google), OpenAI Compatible
   Includes: Dual-Level Fallback, Streaming SSE parser, Vision attachments, and System persona.
   ========================================================================= */

const AI_CONFIG = {
  deepseek: {
    enabled: true,
    apiKey: "sk-dfe41797f50d4b6a99fe6cd658a7b431",
    baseURL: "https://api.deepseek.com/v1/chat/completions",
    models: [
      { id: "deepseek-chat", label: "DeepSeek Chat (V3)", vision: false, context: 64000 },
      { id: "deepseek-reasoner", label: "DeepSeek Reasoner (R1)", vision: false, context: 64000 },
      { id: "deepseek-v4-flash", label: "DeepSeek V4 Flash", vision: true, context: 1000000 },
      { id: "deepseek-v4-pro", label: "DeepSeek V4 Pro", vision: true, context: 1000000 }
    ]
  },

  groq: {
    enabled: true,
    apiKey: "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",
    baseURL: "https://api.groq.com/openai/v1/chat/completions",
    models: [
      { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B Versatile", vision: false, context: 128000 },
      { id: "llama-3.1-8b-instant", label: "Llama 3.1 8B Instant", vision: false, context: 128000 },
      { id: "llama-3.2-90b-vision-preview", label: "Llama 3.2 90B Vision", vision: true, context: 128000 },
      { id: "deepseek-r1-distill-llama-70b", label: "DeepSeek R1 (Groq)", vision: false, context: 128000 },
      { id: "mixtral-8x7b-32768", label: "Mixtral 8x7b", vision: false, context: 32768 },
      { id: "gemma2-9b-it", label: "Gemma 2 9B", vision: false, context: 8192 }
    ]
  },

  gemini: {
    enabled: true,
    apiKey: "AQ.Ab8RN6KlgUTJns_i5rRh3UbyMEXCDw_Fq1fgVPIKnEXAa0zHDA",
    baseURL: "https://generativelanguage.googleapis.com/v1beta/models",
    models: [
      { id: "gemini-1.5-flash", label: "Gemini 1.5 Flash", vision: true, context: 1000000 },
      { id: "gemini-1.5-pro", label: "Gemini 1.5 Pro", vision: true, context: 2000000 },
      { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash", vision: true, context: 1000000 },
      { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash", vision: true, context: 1000000 },
      { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro", vision: true, context: 2000000 }
    ]
  }
};

const PROVIDER_ORDER = ["deepseek", "groq", "gemini"];

const PROVIDER_LABELS = {
  deepseek: "DeepSeek",
  groq: "Groq",
  gemini: "Gemini"
};

/* ==========================================================================
   PUBLIC HELPERS
   ========================================================================== */

function getEnabledProviders() {
  return PROVIDER_ORDER.filter((key) => {
    const cfg = AI_CONFIG[key];
    return cfg && cfg.enabled && typeof cfg.apiKey === "string" && cfg.apiKey.trim().length > 0;
  });
}

function isProviderReady(providerKey) {
  const cfg = AI_CONFIG[providerKey];
  return !!(cfg && cfg.enabled && cfg.apiKey && cfg.apiKey.trim().length > 0);
}

function getModelsForProvider(providerKey) {
  const cfg = AI_CONFIG[providerKey];
  return cfg ? cfg.models : [];
}

function providerSupportsVision(providerKey, modelId) {
  const cfg = AI_CONFIG[providerKey];
  if (!cfg) return false;
  const model = cfg.models.find((m) => m.id === modelId);
  return !!(model && model.vision);
}

function getDefaultModel(providerKey) {
  const models = getModelsForProvider(providerKey);
  return models.length ? models[0].id : null;
}

/* ==========================================================================
   LOW-LEVEL PROVIDER CALLS
   ========================================================================== */

function toOpenAIMessages(messages) {
  return messages.map((m) => {
    if (!m.images || m.images.length === 0) {
      return { role: m.role, content: m.content };
    }
    const parts = [];
    if (m.content) parts.push({ type: "text", text: m.content });
    m.images.forEach((img) => {
      parts.push({
        type: "image_url",
        image_url: { url: `data:${img.mimeType};base64,${img.data}` }
      });
    });
    return { role: m.role, content: parts };
  });
}

function toGeminiContents(messages) {
  const filtered = messages.filter((m) => m.role !== "system");

  let contents = filtered.map((m) => {
    const parts = [];
    if (m.content) parts.push({ text: m.content });
    if (m.images) {
      m.images.forEach((img) => {
        parts.push({ inlineData: { mimeType: img.mimeType, data: img.data } });
      });
    }
    return { role: m.role === "assistant" ? "model" : "user", parts };
  });

  const cleanContents = [];
  contents.forEach((item) => {
    if (cleanContents.length > 0 && cleanContents[cleanContents.length - 1].role === item.role) {
      cleanContents[cleanContents.length - 1].parts.push(...item.parts);
    } else {
      cleanContents.push(item);
    }
  });

  while (cleanContents.length > 0 && cleanContents[cleanContents.length - 1].role === "model") {
    cleanContents.pop();
  }

  return cleanContents;
}

function extractSystemPrompt(messages) {
  const sys = messages.find((m) => m.role === "system");
  return sys ? sys.content : null;
}

async function callOpenAICompatible(providerKey, { model, messages, options, onChunk, signal }) {
  const cfg = AI_CONFIG[providerKey];
  if (!cfg) throw new Error(`Unknown provider: ${providerKey}`);
  if (!cfg.apiKey || !cfg.apiKey.trim()) {
    throw new Error(
      `${PROVIDER_LABELS[providerKey]} API key is missing. Add it to AI_CONFIG.${providerKey}.apiKey in aiservis.js.`
    );
  }

  const stream = options.stream !== false;
  const body = {
    model,
    messages: toOpenAIMessages(messages),
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens ?? 2048,
    stream
  };

  let response;
  try {
    response = await fetch(cfg.baseURL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cfg.apiKey}`
      },
      body: JSON.stringify(body),
      signal
    });
  } catch (networkErr) {
    if (networkErr.name === "AbortError") throw networkErr;
    throw new Error(`${PROVIDER_LABELS[providerKey]} network error: ${networkErr.message}`);
  }

  if (!response.ok) {
    let detail = "";
    try {
      const errJson = await response.json();
      detail = errJson?.error?.message || JSON.stringify(errJson);
    } catch (_) {
      detail = await response.text().catch(() => "");
    }
    throw new Error(`${PROVIDER_LABELS[providerKey]} API error (${response.status}): ${detail || "Unknown error"}`);
  }

  if (!stream) {
    const json = await response.json();
    const text = json.choices?.[0]?.message?.content ?? "";
    const usage = json.usage || null;
    if (onChunk && text) onChunk(text);
    return { text, usage };
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let fullText = "";
  let buffer = "";
  let usage = null;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop();

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (payload === "[DONE]") continue;
      try {
        const json = JSON.parse(payload);
        const delta = json.choices?.[0]?.delta?.content;
        if (delta) {
          fullText += delta;
          if (onChunk) onChunk(delta);
        }
        if (json.usage) usage = json.usage;
      } catch (_) {
        // Ignore malformed fragments
      }
    }
  }

  return { text: fullText, usage };
}

async function callGemini({ model, messages, options, onChunk, signal }) {
  const cfg = AI_CONFIG.gemini;
  if (!cfg.apiKey || !cfg.apiKey.trim()) {
    throw new Error("Gemini API key is missing. Add it to AI_CONFIG.gemini.apiKey in aiservis.js.");
  }

  const stream = options.stream !== false;
  const systemPrompt = extractSystemPrompt(messages);
  const contents = toGeminiContents(messages);

  const body = {
    contents,
    generationConfig: {
      temperature: options.temperature ?? 0.7,
      maxOutputTokens: options.maxTokens ?? 2048
    }
  };
  if (systemPrompt) {
    body.systemInstruction = { parts: [{ text: systemPrompt }] };
  }

  const finalURL = stream
    ? `${cfg.baseURL}/${model}:streamGenerateContent?alt=sse&key=${cfg.apiKey}`
    : `${cfg.baseURL}/${model}:generateContent?key=${cfg.apiKey}`;

  let response;
  try {
    response = await fetch(finalURL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal
    });
  } catch (networkErr) {
    if (networkErr.name === "AbortError") throw networkErr;
    throw new Error(`Gemini network error: ${networkErr.message}`);
  }

  if (!response.ok) {
    let detail = "";
    try {
      const errJson = await response.json();
      detail = errJson?.error?.message || JSON.stringify(errJson);
    } catch (_) {
      detail = await response.text().catch(() => "");
    }
    throw new Error(`Gemini API error (${response.status}): ${detail || "Unknown error"}`);
  }

  if (!stream) {
    const json = await response.json();
    const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") ?? "";
    if (onChunk && text) onChunk(text);
    return { text, usage: json.usageMetadata || null };
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let fullText = "";
  let buffer = "";
  let usage = null;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop();

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const json = JSON.parse(payload);
        const parts = json.candidates?.[0]?.content?.parts || [];
        const delta = parts.map((p) => p.text || "").join("");
        if (delta) {
          fullText += delta;
          if (onChunk) onChunk(delta);
        }
        if (json.usageMetadata) usage = json.usageMetadata;
      } catch (_) {
        // Ignore malformed fragments
      }
    }
  }

  return { text: fullText, usage };
}

/* ==========================================================================
   UNIFIED PROVIDER ABSTRACTION
   ========================================================================== */

async function sendMessage({ provider, model, messages, options = {}, onChunk, signal }) {
  if (!provider) throw new Error("No AI provider specified.");
  if (!AI_CONFIG[provider]) throw new Error(`Unknown provider: ${provider}`);
  if (!AI_CONFIG[provider].enabled) throw new Error(`${PROVIDER_LABELS[provider]} is disabled in AI_CONFIG.`);

  if (provider === "gemini") {
    return callGemini({ model, messages, options, onChunk, signal });
  }
  return callOpenAICompatible(provider, { model, messages, options, onChunk, signal });
}

async function sendMessageWithFallback({
  provider,
  model,
  messages,
  options = {},
  onChunk,
  onProviderSwitch,
  onModelSwitch,
  onStatus,
  signal
}) {
  const systemPromptText = `Kamu adalah LifeHub AI, asisten virtual paling keren yang terintegrasi di workspace LifeHub. 

ATURAN IDENTITAS WACANA:
1. Developer / Pembuat utama aplikasi ini ADALAH "Team LegacyXxazyy" (atau dipanggil Erxyss). Jika ada pengguna yang bertanya siapa pembuat, developer, atau pencipta kamu/LifeHub AI, WAJIB jawab secara tegas bahwa kamu dibuat oleh Team LegacyXxazyy / Erxyss. JANGAN PERNAH katakan kamu buatan OpenAI atau Google!

ATURAN GAYA BAHASA & PERSONALITAS:
1. Gunakan bahasa gaul anak nongkrong/tongkrongan (pake panggilan "lu", "gua", "bro", "sis").
2. Gaya bicara santai, cerdas, asik, blak-blakan, dan fleksibel.
3. Boleh sesekali menggunakan kata-kata kasar / toxic yang wajar dan kocak (seperti: "anjir", "anjay", "jir", "bejir", "sableng", "koplak") untuk mencairkan suasana atau berekspresi, tapi TIDAK BOLEH menghina user secara berlebihan, SARA, atau jahat.`;

  let updatedMessages = [...messages];
  const hasSystem = updatedMessages.some((m) => m.role === "system");

  if (!hasSystem) {
    updatedMessages.unshift({ role: "system", content: systemPromptText });
  } else {
    updatedMessages = updatedMessages.map((m) => 
      m.role === "system" ? { ...m, content: systemPromptText } : m
    );
  }
  const enabled = getEnabledProviders();
  if (enabled.length === 0) {
    throw new Error(
      "No AI provider is configured. Insert at least one API key into AI_CONFIG in aiservis.js."
    );
  }

  const order = [provider, ...enabled.filter((p) => p !== provider)].filter((p) =>
    enabled.includes(p)
  );
  const attemptOrder = [...new Set(order)];

  let lastError = null;

  for (let i = 0; i < attemptOrder.length; i++) {
    const currentProvider = attemptOrder[i];
    
    const availableModels = getModelsForProvider(currentProvider).map((m) => m.id);
    const primaryModel = (currentProvider === provider && model) ? model : getDefaultModel(currentProvider);
    const modelsToTry = [...new Set([primaryModel, ...availableModels])].filter(Boolean);

    if (i > 0 && onProviderSwitch) {
      onProviderSwitch(attemptOrder[i - 1], currentProvider);
    }

    for (let j = 0; j < modelsToTry.length; j++) {
      const currentModel = modelsToTry[j];

      if (j > 0 && onModelSwitch) {
        onModelSwitch(modelsToTry[j - 1], currentModel, currentProvider);
      }

      if (onStatus) {
        if (j > 0) {
          onStatus(`Mencoba model cadangan: ${currentModel} (${PROVIDER_LABELS[currentProvider]})...`);
        } else {
          onStatus(`Mencoba ${PROVIDER_LABELS[currentProvider]} (${currentModel})...`);
        }
      }

      try {
        const result = await sendMessage({
          provider: currentProvider,
          model: currentModel,
          messages: updatedMessages,
          options,
          onChunk,
          signal
        });

        return { ...result, providerUsed: currentProvider, modelUsed: currentModel };
      } catch (err) {
        if (err.name === "AbortError") throw err;
        
        lastError = err;
        console.warn(
          `[Fallback Engine] ${PROVIDER_LABELS[currentProvider]} (${currentModel}) gagal (${err.message}). Mencoba opsi berikutnya...`
        );
      }
    }
  }

  throw new Error(
    `Semua provider dan model AI gagal. Error terakhir: ${lastError ? lastError.message : "Unknown error"}`
  );
}

window.LifeHubAI = {
  AI_CONFIG,
  PROVIDER_ORDER,
  PROVIDER_LABELS,
  getEnabledProviders,
  isProviderReady,
  getModelsForProvider,
  providerSupportsVision,
  getDefaultModel,
  sendMessage,
  sendMessageWithFallback
};
