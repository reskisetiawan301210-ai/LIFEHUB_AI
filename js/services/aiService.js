/* ==========================================================================
   LifeHub AI™ — AI Service Layer
   File: aiservis.js
   --------------------------------------------------------------------------
   This file owns ALL communication with real AI provider APIs.
   ai.html never talks to a provider directly — it only calls the functions
   exposed here (window.LifeHubAI.*).

   Supported providers (official API formats, no invented endpoints):
     - DeepSeek  (OpenAI-compatible Chat Completions API)
     - Groq      (OpenAI-compatible Chat Completions API)
     - Gemini    (Google Generative Language API)

   ⚠️ FRONTEND API KEY SECURITY NOTICE ⚠️
   ----------------------------------------------------------------------
   This is a frontend-only (no backend) project. Any API key placed inside
   AI_CONFIG below is bundled into JavaScript that runs in the user's
   browser. That means:

     - Anyone who opens DevTools → Sources/Network can read the key.
     - Anyone who views the page source can read the key.
     - The key is NOT secure and should be treated as fully public.

   This is acceptable for local development, personal use, or a private/
   trusted environment, but it is NOT safe for a public production
   deployment. For production, route requests through a backend proxy
   server that holds the real API key server-side and forwards requests
   to the provider — never ship a paid API key to the public internet
   inside client-side JS.
   ========================================================================== */

/* ==========================================================================
   1. CONFIGURATION
   -------------------------------------------------------------------------
   👉 INSERT YOUR API KEYS BELOW, in the apiKey: "" fields.
   Leave a provider's apiKey empty (or enabled:false) to disable it — it will
   simply be skipped by the provider selector and the fallback system.
   ========================================================================== */

const AI_CONFIG = {
  deepseek: {
    enabled: true,
    apiKey: "", // <-- INSERT YOUR DEEPSEEK API KEY HERE (https://platform.deepseek.com)
    baseURL: "https://api.deepseek.com/v1/chat/completions",
    // OpenAI-compatible Chat Completions endpoint
    models: [
      { id: "deepseek-chat", label: "DeepSeek Chat", vision: false, context: 64000 },
      { id: "deepseek-reasoner", label: "DeepSeek Reasoner", vision: false, context: 64000 }
    ]
  },

  groq: {
    enabled: true,
    apiKey: "", // <-- INSERT YOUR GROQ API KEY HERE (https://console.groq.com)
    baseURL: "https://api.groq.com/openai/v1/chat/completions",
    // OpenAI-compatible Chat Completions endpoint
    models: [
      { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B", vision: false, context: 128000 },
      { id: "llama-3.1-8b-instant", label: "Llama 3.1 8B Instant", vision: false, context: 128000 },
      { id: "llama-3.2-90b-vision-preview", label: "Llama 3.2 90B Vision", vision: true, context: 128000 }
    ]
  },

  gemini: {
    enabled: true,
    apiKey: "", // <-- INSERT YOUR GEMINI API KEY HERE (https://aistudio.google.com/apikey)
    baseURL: "https://generativelanguage.googleapis.com/v1beta/models",
    models: [
      { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash", vision: true, context: 1000000 },
      { id: "gemini-1.5-pro", label: "Gemini 1.5 Pro", vision: true, context: 2000000 },
      { id: "gemini-1.5-flash", label: "Gemini 1.5 Flash", vision: true, context: 1000000 }
    ]
  }
};

// Order in which providers are attempted when the fallback system is used.
const PROVIDER_ORDER = ["deepseek", "groq", "gemini"];

const PROVIDER_LABELS = {
  deepseek: "DeepSeek",
  groq: "Groq",
  gemini: "Gemini"
};

/* ==========================================================================
   2. PUBLIC HELPERS
   ========================================================================== */

/** Returns provider keys that are enabled AND have a non-empty API key. */
function getEnabledProviders() {
  return PROVIDER_ORDER.filter((key) => {
    const cfg = AI_CONFIG[key];
    return cfg && cfg.enabled && typeof cfg.apiKey === "string" && cfg.apiKey.trim().length > 0;
  });
}

/** Returns true if a provider is enabled + has a key, regardless of order. */
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
   3. LOW-LEVEL PROVIDER CALLS
   -------------------------------------------------------------------------
   Each function throws a descriptive Error on failure. None of them ever
   return a fake/hardcoded response — a failure always surfaces as a
   rejected promise so the UI can show the real error.
   ========================================================================== */

/**
 * Converts LifeHub's internal message format into OpenAI-style "content"
 * (used by both DeepSeek and Groq, since both expose an OpenAI-compatible
 * Chat Completions API).
 *
 * Internal message shape:
 *   { role: 'user' | 'assistant' | 'system', content: string, images?: [{mimeType, data}] }
 *   images[].data is a base64 string WITHOUT the "data:...;base64," prefix.
 */
function toOpenAIMessages(messages) {
  return messages.map((m) => {
    if (!m.images || m.images.length === 0) {
      return { role: m.role, content: m.content };
    }
    // Multimodal message: array of content parts.
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

/**
 * Converts LifeHub's internal message format into Gemini's "contents" array.
 * Gemini uses role "user" / "model" (no "assistant"), and images are sent
 * as inlineData parts.
 */
function toGeminiContents(messages) {
  return messages
    .filter((m) => m.role !== "system")
    .map((m) => {
      const parts = [];
      if (m.content) parts.push({ text: m.content });
      if (m.images) {
        m.images.forEach((img) => {
          parts.push({ inlineData: { mimeType: img.mimeType, data: img.data } });
        });
      }
      return { role: m.role === "assistant" ? "model" : "user", parts };
    });
}

function extractSystemPrompt(messages) {
  const sys = messages.find((m) => m.role === "system");
  return sys ? sys.content : null;
}

/**
 * Calls an OpenAI-compatible Chat Completions endpoint (DeepSeek or Groq).
 * Supports streaming (SSE) via onChunk(deltaText) callback.
 */
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

  // ----- Streaming (SSE) -----
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
    buffer = lines.pop(); // keep incomplete line for next chunk

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
        // Ignore malformed SSE fragments (can happen on chunk boundaries)
      }
    }
  }

  return { text: fullText, usage };
}

/**
 * Calls the Gemini generateContent / streamGenerateContent endpoint.
 */
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

  // ----- Streaming (SSE) -----
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
        // Ignore malformed SSE fragments
      }
    }
  }

  return { text: fullText, usage };
}

/* ==========================================================================
   4. UNIFIED PROVIDER ABSTRACTION
   -------------------------------------------------------------------------
   The frontend calls ONLY these two functions. It never needs to know how
   each provider's API actually works.
   ========================================================================== */

/**
 * sendMessage — sends a chat request to exactly ONE named provider.
 *
 * @param {Object} params
 * @param {'deepseek'|'groq'|'gemini'} params.provider
 * @param {string} params.model
 * @param {Array}  params.messages   [{role, content, images?}]
 * @param {Object} [params.options]  {temperature, maxTokens, stream}
 * @param {Function} [params.onChunk]  called with each streamed text delta
 * @param {AbortSignal} [params.signal]
 * @returns {Promise<{text: string, usage: Object|null}>}
 */
async function sendMessage({ provider, model, messages, options = {}, onChunk, signal }) {
  if (!provider) throw new Error("No AI provider specified.");
  if (!AI_CONFIG[provider]) throw new Error(`Unknown provider: ${provider}`);
  if (!AI_CONFIG[provider].enabled) throw new Error(`${PROVIDER_LABELS[provider]} is disabled in AI_CONFIG.`);

  if (provider === "gemini") {
    return callGemini({ model, messages, options, onChunk, signal });
  }
  // deepseek + groq share the OpenAI-compatible implementation
  return callOpenAICompatible(provider, { model, messages, options, onChunk, signal });
}

/**
 * sendMessageWithFallback — tries the requested provider first; if it
 * fails (network error, API error, missing key), automatically tries the
 * next enabled provider in PROVIDER_ORDER. Only throws if ALL enabled
 * providers fail.
 *
 * @param {Object} params - same as sendMessage, plus:
 * @param {Function} [params.onProviderSwitch] - called with (fromProvider, toProvider) when falling back
 * @param {Function} [params.onStatus] - called with a human-readable status string
 */
async function sendMessageWithFallback({
  provider,
  model,
  messages,
  options = {},
  onChunk,
  onProviderSwitch,
  onStatus,
  signal
}) {
  const enabled = getEnabledProviders();
  if (enabled.length === 0) {
    throw new Error(
      "No AI provider is configured. Insert at least one API key into AI_CONFIG in aiservis.js."
    );
  }

  // Build attempt order: requested provider first (if ready), then the rest.
  const order = [provider, ...enabled.filter((p) => p !== provider)].filter((p) =>
    enabled.includes(p)
  );
  // De-duplicate while preserving order
  const attemptOrder = [...new Set(order)];

  let lastError = null;

  for (let i = 0; i < attemptOrder.length; i++) {
    const currentProvider = attemptOrder[i];
    const currentModel = currentProvider === provider ? model : getDefaultModel(currentProvider);

    if (i > 0 && onProviderSwitch) {
      onProviderSwitch(attemptOrder[i - 1], currentProvider);
    }
    if (i > 0 && onStatus) {
      onStatus(`Switching to another AI provider... (${PROVIDER_LABELS[currentProvider]})`);
    }

    try {
      const result = await sendMessage({
        provider: currentProvider,
        model: currentModel,
        messages,
        options,
        onChunk,
        signal
      });
      return { ...result, providerUsed: currentProvider, modelUsed: currentModel };
    } catch (err) {
      if (err.name === "AbortError") throw err; // user pressed Stop — do not fall back
      lastError = err;
      // continue to next provider
    }
  }

  throw new Error(
    `All AI providers failed. Last error: ${lastError ? lastError.message : "unknown error"}`
  );
}

/* ==========================================================================
   5. EXPORT
   ========================================================================== */

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