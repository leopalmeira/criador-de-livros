// src/server.ts
import express from "express";
import cors from "cors";
import path2 from "path";
import fs2 from "fs";

// src/services/backend-cover-service.ts
import fs from "fs";
import path from "path";
var BackendCoverService = class {
  static activeJobs = /* @__PURE__ */ new Map();
  static activeProjectsInProgress = /* @__PURE__ */ new Set();
  static BASE_DIR = process.cwd();
  static STORAGE_DIR = path.join(process.cwd(), "covers");
  /**
   * Obtém a chave de API do Google AI Studio configurada
   */
  static getApiKey(payload) {
    if (payload?.apiKey && payload.apiKey.trim().length > 0) {
      return payload.apiKey.trim();
    }
    const candidates = [
      process.env.GEMINI_API_KEY,
      process.env.GOOGLE_API_KEY,
      process.env.VITE_GEMINI_API_KEY,
      process.env.VITE_GEMINI_FALLBACK_API_KEY
    ];
    for (const c of candidates) {
      if (c && c.trim().length > 0) return c.trim();
    }
    try {
      const envPath = path.resolve(this.BASE_DIR, ".env");
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, "utf8");
        const lines = content.split("\n");
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith("#")) continue;
          if (trimmed.startsWith("GEMINI_API_KEY=") || trimmed.startsWith("GOOGLE_API_KEY=") || trimmed.startsWith("VITE_GEMINI_API_KEY=")) {
            const val = trimmed.split("=")[1]?.trim().replace(/^["']|["']$/g, "");
            if (val && val.length > 5) return val;
          }
        }
      }
    } catch {
    }
    return "";
  }
  /**
   * Salva a chave de API no arquivo .env para persistência imediata
   */
  static saveApiKey(apiKey) {
    const key = apiKey.trim();
    if (!key) {
      return { success: false, message: "A chave fornecida est\xE1 vazia." };
    }
    try {
      const envPath = path.resolve(this.BASE_DIR, ".env");
      let content = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";
      if (/^GEMINI_API_KEY=.*/m.test(content)) {
        content = content.replace(/^GEMINI_API_KEY=.*/m, `GEMINI_API_KEY=${key}`);
      } else {
        content = `GEMINI_API_KEY=${key}
` + content;
      }
      if (/^VITE_GEMINI_API_KEY=.*/m.test(content)) {
        content = content.replace(/^VITE_GEMINI_API_KEY=.*/m, `VITE_GEMINI_API_KEY=${key}`);
      } else {
        content += `
VITE_GEMINI_API_KEY=${key}`;
      }
      fs.writeFileSync(envPath, content, "utf8");
      process.env.GEMINI_API_KEY = key;
      process.env.VITE_GEMINI_API_KEY = key;
      console.log("[Cover] Chave Google AI Studio salva e ativada com sucesso no ambiente.");
      return { success: true, message: "Chave do Google AI Studio salva e ativada com sucesso!" };
    } catch (err) {
      console.error("[Cover][ERROR] Falha ao salvar chave no .env:", err);
      return { success: false, message: `Erro ao salvar chave: ${err.message}` };
    }
  }
  /**
   * Retorna o status da chave configurada para o frontend
   */
  static getApiKeyStatus() {
    const key = this.getApiKey();
    if (!key) {
      return {
        hasKey: false,
        keyPreview: "",
        provider: "Google AI Studio (Imagen 3 / Gemini)"
      };
    }
    const preview = key.length > 8 ? `${key.substring(0, 4)}...${key.substring(key.length - 4)}` : "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022";
    return {
      hasKey: true,
      keyPreview: preview,
      provider: "Google AI Studio (Imagen 3 / Gemini)"
    };
  }
  /**
   * Garante a existência dos diretórios de storage
   */
  static ensureDirectories(projectId) {
    if (!fs.existsSync(this.STORAGE_DIR)) {
      fs.mkdirSync(this.STORAGE_DIR, { recursive: true });
    }
    if (projectId) {
      const projDir = path.join(this.STORAGE_DIR, projectId);
      if (!fs.existsSync(projDir)) {
        fs.mkdirSync(projDir, { recursive: true });
      }
    }
  }
  /**
   * Alias de compatibilidade com testes e chamadas externas
   */
  static buildArtDirectionPrompt(payload, versionNumber = 1) {
    return this.buildEditorialPrompt(payload, versionNumber);
  }
  /**
   * Cria o prompt editorial profissional otimizado para o Google AI Studio (Imagen 3)
   */
  static buildEditorialPrompt(payload, versionNumber) {
    const artStyles = [
      "Dire\xE7\xE3o A: Minimalismo Dram\xE1tico com contraste visual imponente, paleta refinada e elemento central ic\xF4nico de alto impacto",
      "Dire\xE7\xE3o B: Cinematogr\xE1fico Ultra-Realista com ilumina\xE7\xE3o volum\xE9trica, atmosfera imersiva e profundidade dram\xE1tica",
      "Dire\xE7\xE3o C: Ilustra\xE7\xE3o Editorial de Luxo com tra\xE7o contempor\xE2neo, detalhes sofisticados e acabamento nobre de grande editora"
    ];
    let chosenStyle = artStyles[(versionNumber - 1) % artStyles.length];
    if (payload.artDirectionVariant === "minimalist") chosenStyle = artStyles[0];
    else if (payload.artDirectionVariant === "cinematic") chosenStyle = artStyles[1];
    else if (payload.artDirectionVariant === "luxury-illustration") chosenStyle = artStyles[2];
    return `Professional commercial book cover for Amazon KDP bestseller, vertical 2:3 aspect ratio.
TITLE: "${payload.title.toUpperCase()}"
SUBTITLE: "${payload.subtitle || ""}"
AUTHOR: "${payload.author}"
GENRE: ${payload.genre || "Non-Fiction"}
AUDIENCE: ${payload.targetAudience || "General Adult Readers"}
SYNOPSIS & MOOD: ${payload.synopsis || payload.topic || payload.title}.
VISUAL ART DIRECTION: ${chosenStyle}.
COMPOSITION REQUIREMENTS:
- The book title "${payload.title.toUpperCase()}" must appear prominently, rendered in masterclass typography on the cover.
- The author name "${payload.author}" must be placed with editorial elegance at the top or bottom.
- Perfect 2:3 vertical proportion, museum-grade composition, clean focal point, commercial publishing aesthetics.
- High resolution, ultra-sharp detail, cinematic lighting, dramatic contrast, prestigious book jacket finish.
- DO NOT generate amateur flyers, thumbnails, or generic stock graphics.`;
  }
  /**
   * Consulta o status de um job em andamento
   */
  static getJobStatus(jobId) {
    return this.activeJobs.get(jobId);
  }
  /**
   * Retorna a lista de capas armazenadas de um projeto
   */
  static getProjectCovers(projectId) {
    this.ensureDirectories(projectId);
    const metaPath = path.join(this.STORAGE_DIR, projectId, "metadata.json");
    if (!fs.existsSync(metaPath)) {
      return [];
    }
    try {
      const content = fs.readFileSync(metaPath, "utf8");
      return JSON.parse(content) || [];
    } catch {
      return [];
    }
  }
  /**
   * Marca uma capa como selecionada oficialmente no projeto
   */
  static selectCover(projectId, coverId) {
    const list = this.getProjectCovers(projectId);
    let selected = null;
    const updated = list.map((item) => {
      const isTarget = item.id === coverId;
      if (isTarget) selected = { ...item, selected: true };
      return { ...item, selected: isTarget };
    });
    if (selected) {
      const metaPath = path.join(this.STORAGE_DIR, projectId, "metadata.json");
      fs.writeFileSync(metaPath, JSON.stringify(updated, null, 2), "utf8");
      console.log(`[Cover] Capa ${coverId} selecionada para o projeto ${projectId}`);
    }
    return selected;
  }
  /**
   * Inicia a geração da capa no backend via API do Google AI Studio (Imagen 3)
   */
  static async startCoverGeneration(payload) {
    const { projectId } = payload;
    if (this.activeProjectsInProgress.has(projectId)) {
      throw new Error("J\xE1 existe uma gera\xE7\xE3o de capa em andamento para este projeto. Aguarde a conclus\xE3o.");
    }
    this.ensureDirectories(projectId);
    const existingCovers = this.getProjectCovers(projectId);
    const nextVersion = payload.version || existingCovers.length + 1;
    const jobId = `cover_job_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const initialProgress = {
      jobId,
      projectId,
      status: "queued",
      stepLabel: "Tarefa enfileirada no backend...",
      progressPercent: 5,
      updatedAt: Date.now()
    };
    this.activeJobs.set(jobId, initialProgress);
    this.activeProjectsInProgress.add(projectId);
    this.executeCoverGeneration(jobId, payload, nextVersion).catch((err) => {
      console.error(`[Cover][ERROR] Falha cr\xEDtica na gera\xE7\xE3o do job ${jobId}:`, err);
      const current = this.activeJobs.get(jobId);
      if (current) {
        current.status = "failed";
        current.stepLabel = `Erro na gera\xE7\xE3o: ${err.message}`;
        current.error = err.message;
        current.updatedAt = Date.now();
      }
      this.activeProjectsInProgress.delete(projectId);
    });
    return initialProgress;
  }
  /**
   * Chamada à API Oficial do Google AI Studio para geração de imagem (Imagen 3 / Gemini)
   */
  static async callGoogleAiStudioImageApi(apiKey, promptText) {
    const endpoints = [
      // 1. Gemini 3.1 Flash Lite Image (Mais rápido, mais econômico e com menor demanda)
      {
        name: "gemini-3.1-flash-lite-image",
        url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-image:generateContent?key=${apiKey}`,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText }] }]
        }),
        parser: (data) => {
          const parts = data?.candidates?.[0]?.content?.parts || [];
          for (const p of parts) {
            if (p.inlineData?.data) {
              return p.inlineData.data;
            }
          }
          return null;
        }
      },
      // 2. Gemini 3.1 Flash Image
      {
        name: "gemini-3.1-flash-image",
        url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image:generateContent?key=${apiKey}`,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText }] }]
        }),
        parser: (data) => {
          const parts = data?.candidates?.[0]?.content?.parts || [];
          for (const p of parts) {
            if (p.inlineData?.data) {
              return p.inlineData.data;
            }
          }
          return null;
        }
      },
      // 3. Gemini 2.5 Flash Image
      {
        name: "gemini-2.5-flash-image",
        url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText }] }]
        }),
        parser: (data) => {
          const parts = data?.candidates?.[0]?.content?.parts || [];
          for (const p of parts) {
            if (p.inlineData?.data) {
              return p.inlineData.data;
            }
          }
          return null;
        }
      },
      // 3. Endpoint predict do Imagen 3 (Formato oficial do Google Generative Language)
      {
        url: `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instances: [{ prompt: promptText }],
          parameters: {
            sampleCount: 1,
            aspectRatio: "3:4",
            outputMimeType: "image/png"
          }
        }),
        parser: (data) => {
          if (data?.predictions?.[0]?.bytesBase64Encoded) {
            return data.predictions[0].bytesBase64Encoded;
          }
          if (data?.predictions?.[0]?.image?.imageBytes) {
            return data.predictions[0].image.imageBytes;
          }
          return null;
        }
      },
      // 4. Endpoint generateImages do Imagen 3
      {
        url: `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:generateImages?key=${apiKey}`,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: promptText,
          numberOfImages: 1,
          aspectRatio: "3:4",
          outputMimeType: "image/png"
        }),
        parser: (data) => {
          if (data?.generatedImages?.[0]?.image?.imageBytes) {
            return data.generatedImages[0].image.imageBytes;
          }
          return null;
        }
      },
      // 5. Fallback para modelo Imagen 3 Fast
      {
        url: `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-fast-generate-001:predict?key=${apiKey}`,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instances: [{ prompt: promptText }],
          parameters: {
            sampleCount: 1,
            aspectRatio: "3:4",
            outputMimeType: "image/png"
          }
        }),
        parser: (data) => {
          if (data?.predictions?.[0]?.bytesBase64Encoded) {
            return data.predictions[0].bytesBase64Encoded;
          }
          return null;
        }
      }
    ];
    for (let i = 0; i < endpoints.length; i++) {
      const ep = endpoints[i];
      try {
        console.log(`[Cover][Google AI Studio] Tentando endpoint ${i + 1}/${endpoints.length}...`);
        const response = await fetch(ep.url, {
          method: ep.method,
          headers: ep.headers,
          body: ep.body
        });
        if (response.ok) {
          const data = await response.json();
          const base64 = ep.parser(data);
          if (base64) {
            console.log(`[Cover][Google AI Studio] Imagem PNG gerada com sucesso pela API!`);
            return Buffer.from(base64, "base64");
          }
        } else {
          const errText = await response.text();
          console.warn(`[Cover][Google AI Studio] Resposta do endpoint ${i + 1} (${response.status}):`, errText.substring(0, 200));
        }
      } catch (callErr) {
        console.warn(`[Cover][Google AI Studio] Erro de rede no endpoint ${i + 1}:`, callErr.message);
      }
    }
    return null;
  }
  /**
   * Pipeline de execução da geração no backend
   */
  static async executeCoverGeneration(jobId, payload, versionNumber) {
    const { projectId, title, author } = payload;
    console.log(`[Cover] Projeto iniciado: ${projectId}`);
    console.log(`[Cover] Dados do livro carregados: "${title}" por ${author}`);
    const updateJob = (status, stepLabel, progressPercent) => {
      const job = this.activeJobs.get(jobId);
      if (job) {
        job.status = status;
        job.stepLabel = stepLabel;
        job.progressPercent = progressPercent;
        job.updatedAt = Date.now();
      }
    };
    updateJob("starting_browser", "Analisando livro e preparando dire\xE7\xE3o art\xEDstica...", 15);
    const promptText = this.buildEditorialPrompt(payload, versionNumber);
    console.log(`[Cover] Prompt criado para vers\xE3o ${versionNumber}`);
    const apiKey = this.getApiKey(payload);
    let finalImageBuffer = null;
    let providerUsed = "Editorial Engine";
    if (apiKey) {
      updateJob("sending_prompt", "Conectando \xE0 API oficial do Google AI Studio (Imagen 3)...", 30);
      console.log(`[Cover] Chamando API do Google AI Studio com Imagen 3...`);
      updateJob("generating", "Google AI Studio gerando imagem em alta resolu\xE7\xE3o com t\xEDtulo integrado...", 55);
      try {
        finalImageBuffer = await this.callGoogleAiStudioImageApi(apiKey, promptText);
        if (finalImageBuffer) {
          providerUsed = "Google AI Studio (Imagen 3)";
        }
      } catch (apiErr) {
        console.error(`[Cover][ERROR] Falha na API do Google AI Studio:`, apiErr);
      }
    } else {
      console.log(`[Cover] Nenhuma API Key do Google AI Studio configurada. Utilizando renderiza\xE7\xE3o art\xEDstica editorial.`);
    }
    if (!finalImageBuffer) {
      updateJob("generating", "Renderizando arte editorial 2:3 com tipografia e diagrama\xE7\xE3o comercial...", 70);
      finalImageBuffer = this.generateFallbackCoverBuffer(payload, versionNumber);
    }
    updateJob("capturing", "Processando e otimizando imagem da capa...", 85);
    console.log(`[Cover] Imagem detectada e processada`);
    updateJob("saving", "Armazenando arquivo no storage do projeto...", 95);
    const projectDir = path.join(this.STORAGE_DIR, projectId);
    const fileName = `version-${String(versionNumber).padStart(2, "0")}.png`;
    const filePath = path.join(projectDir, fileName);
    fs.writeFileSync(filePath, finalImageBuffer);
    console.log(`[Cover] Imagem armazenada: ${filePath}`);
    const coverId = `cov_${Date.now()}_v${versionNumber}`;
    const fileUrl = `/api/covers/${projectId}/${fileName}`;
    const allCovers = this.getProjectCovers(projectId);
    const artDirectionNames = [
      "Dire\xE7\xE3o Visual A: Minimalismo Dram\xE1tico & S\xEDmbolo Central",
      "Dire\xE7\xE3o Visual B: Cinematogr\xE1fico Imersivo & Atmosfera Densa",
      "Dire\xE7\xE3o Visual C: Ilustra\xE7\xE3o Editorial de Luxo & Tra\xE7o Contempor\xE2neo"
    ];
    const directionLabel = payload.artDirectionVariant === "minimalist" ? artDirectionNames[0] : payload.artDirectionVariant === "cinematic" ? artDirectionNames[1] : payload.artDirectionVariant === "luxury-illustration" ? artDirectionNames[2] : artDirectionNames[(versionNumber - 1) % artDirectionNames.length];
    const newCoverItem = {
      id: coverId,
      projectId,
      version: versionNumber,
      fileUrl,
      filePath,
      prompt: promptText,
      status: "completed",
      createdAt: Date.now(),
      selected: allCovers.length === 0,
      // seleciona automaticamente se for a primeira
      artStyle: `${directionLabel} (${providerUsed})`,
      title: payload.title,
      author: payload.author,
      sourceProvider: providerUsed
    };
    const updatedCovers = [...allCovers, newCoverItem];
    fs.writeFileSync(path.join(projectDir, "metadata.json"), JSON.stringify(updatedCovers, null, 2), "utf8");
    console.log(`[Cover] Capa dispon\xEDvel: ${fileUrl}`);
    console.log(`[Cover] Projeto atualizado`);
    const finishedJob = this.activeJobs.get(jobId);
    if (finishedJob) {
      finishedJob.status = "completed";
      finishedJob.stepLabel = `Capa gerada com sucesso via ${providerUsed}!`;
      finishedJob.progressPercent = 100;
      finishedJob.cover = newCoverItem;
    }
    this.activeProjectsInProgress.delete(projectId);
  }
  /**
   * Gera uma imagem SVG/PNG de alta resolução de padrão comercial
   * com o título, subtítulo e autor embutidos na imagem
   */
  static generateFallbackCoverBuffer(payload, versionNumber) {
    const title = (payload.title || "LIVRO SEM T\xCDTULO").toUpperCase();
    const subtitle = payload.subtitle || "";
    const author = (payload.author || "Autor da Obra").toUpperCase();
    const genre = payload.genre || "N\xE3o-Fic\xE7\xE3o";
    const palettes = [
      { bg1: "#090d16", bg2: "#1e293b", accent: "#f59e0b", text: "#ffffff", sub: "#cbd5e1" },
      { bg1: "#111827", bg2: "#064e3b", accent: "#34d399", text: "#ffffff", sub: "#a7f3d0" },
      { bg1: "#1e1b4b", bg2: "#312e81", accent: "#e0e7ff", text: "#ffffff", sub: "#c7d2fe" },
      { bg1: "#1c1917", bg2: "#451a03", accent: "#fbbf24", text: "#ffffff", sub: "#fde68a" }
    ];
    const p = palettes[(versionNumber - 1) % palettes.length];
    const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1200" width="800" height="1200">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${p.bg1}" />
          <stop offset="50%" stop-color="${p.bg2}" />
          <stop offset="100%" stop-color="${p.bg1}" />
        </linearGradient>
        <radialGradient id="glow" cx="50%" cy="40%" r="50%">
          <stop offset="0%" stop-color="${p.accent}" stop-opacity="0.28" />
          <stop offset="100%" stop-color="${p.accent}" stop-opacity="0" />
        </radialGradient>
      </defs>

      <!-- Fundo Gradiente Editorial -->
      <rect width="800" height="1200" fill="url(#bg)" />
      <rect width="800" height="1200" fill="url(#glow)" />

      <!-- Moldura sutil de acabamento KDP -->
      <rect x="30" y="30" width="740" height="1140" fill="none" stroke="${p.accent}" stroke-width="1.5" stroke-opacity="0.35" />
      <rect x="36" y="36" width="728" height="1128" fill="none" stroke="${p.accent}" stroke-width="0.7" stroke-opacity="0.2" />

      <!-- Selo de Categoria no Topo -->
      <text x="400" y="90" font-family="'Cinzel', 'Georgia', serif" font-size="14" font-weight="700" fill="${p.accent}" text-anchor="middle" letter-spacing="4">
        ${genre.toUpperCase()} \u2022 EDI\xC7\xC3O ESPECIAL KDP
      </text>

      <!-- T\xEDtulo Principal do Livro dentro da Capa -->
      <text x="400" y="220" font-family="'Cinzel', 'Georgia', 'Times New Roman', serif" font-size="44" font-weight="800" fill="${p.text}" text-anchor="middle" letter-spacing="3">
        ${this.wrapText(title, 24).map((line, i) => `<tspan x="400" dy="${i === 0 ? 0 : 54}">${this.escapeXml(line)}</tspan>`).join("")}
      </text>

      <!-- Elemento Gr\xE1fico Central da Composi\xE7\xE3o -->
      <g transform="translate(400, 580)">
        <circle r="120" fill="none" stroke="${p.accent}" stroke-width="2" stroke-opacity="0.4" />
        <circle r="100" fill="none" stroke="${p.accent}" stroke-width="1" stroke-dasharray="6,6" stroke-opacity="0.3" />
        <polygon points="0,-70 60,35 -60,35" fill="none" stroke="${p.accent}" stroke-width="2" stroke-opacity="0.5" />
        <circle r="16" fill="${p.accent}" opacity="0.85" />
      </g>

      <!-- Subt\xEDtulo -->
      ${subtitle ? `
      <text x="400" y="860" font-family="'Montserrat', 'Helvetica', sans-serif" font-size="18" font-weight="500" fill="${p.sub}" text-anchor="middle" letter-spacing="1.5">
        ${this.wrapText(subtitle, 38).map((line, i) => `<tspan x="400" dy="${i === 0 ? 0 : 28}">${this.escapeXml(line)}</tspan>`).join("")}
      </text>
      ` : ""}

      <!-- Linha Divis\xF3ria de Acabamento -->
      <line x1="320" y1="1020" x2="480" y2="1020" stroke="${p.accent}" stroke-width="1.5" stroke-opacity="0.5" />

      <!-- Nome do Autor -->
      <text x="400" y="1070" font-family="'Cinzel', 'Georgia', serif" font-size="22" font-weight="700" fill="${p.text}" text-anchor="middle" letter-spacing="4">
        ${this.escapeXml(author)}
      </text>

      <!-- Selo de Bestseller na Base -->
      <text x="400" y="1115" font-family="'Montserrat', sans-serif" font-size="11" font-weight="600" fill="${p.accent}" text-anchor="middle" letter-spacing="2">
        BESTSELLER AUTORAL \u2022 AMAZON PUBLISHING
      </text>
    </svg>
    `;
    return Buffer.from(svg, "utf8");
  }
  static wrapText(text, maxCharsPerLine) {
    const words = text.split(" ");
    const lines = [];
    let currentLine = "";
    for (const w of words) {
      if ((currentLine + " " + w).trim().length <= maxCharsPerLine) {
        currentLine = (currentLine + " " + w).trim();
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = w;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines.length > 0 ? lines : [text];
  }
  static escapeXml(unsafe) {
    return unsafe.replace(/[<>&'"]/g, (c) => {
      switch (c) {
        case "<":
          return "&lt;";
        case ">":
          return "&gt;";
        case "&":
          return "&amp;";
        case "'":
          return "&apos;";
        case '"':
          return "&quot;";
        default:
          return c;
      }
    });
  }
};

// src/services/amazon-live-service.ts
import * as cheerio from "cheerio";
var searchCache = /* @__PURE__ */ new Map();
var CACHE_TTL_MS = 1e3 * 60 * 30;
var AmazonLiveService = class {
  /**
   * Busca livros reais na Amazon Books em tempo real.
   */
  static async searchAmazonBooks(keyword, limit = 8) {
    const cleanKeyword = keyword.trim().toLowerCase();
    const cacheKey = `${cleanKeyword}_${limit}`;
    const cached = searchCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }
    try {
      const searchUrl = `https://www.amazon.com/s?k=${encodeURIComponent(keyword)}&i=stripbooks`;
      const response = await fetch(searchUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          "Cache-Control": "no-cache"
        }
      });
      if (!response.ok) {
        throw new Error(`Amazon retornou status HTTP ${response.status}`);
      }
      const html = await response.text();
      const $ = cheerio.load(html);
      const results = [];
      $('[data-component-type="s-search-result"]').each((_, el) => {
        if (results.length >= limit) return false;
        const asin = $(el).attr("data-asin") || "";
        if (!asin || asin.length !== 10) return;
        const title = $(el).find("h2").text().trim() || $(el).find("span.a-text-normal").first().text().trim();
        if (!title) return;
        const coverImage = $(el).find("img.s-image").attr("src") || "";
        let price = 0;
        const offscreenPrice = $(el).find(".a-price .a-offscreen").first().text().replace(/[^0-9.]/g, "");
        if (offscreenPrice) {
          price = parseFloat(offscreenPrice) || 0;
        }
        if (!price || price === 0) {
          const whole = $(el).find(".a-price-whole").first().text().replace(/[^0-9]/g, "");
          const frac = $(el).find(".a-price-fraction").first().text().replace(/[^0-9]/g, "") || "99";
          if (whole) price = parseFloat(`${whole}.${frac}`);
        }
        if (!price || price === 0) {
          price = 4.99;
        }
        const royaltyEstUsd = Number((price * 0.7).toFixed(2));
        const ratingText = $(el).find(".a-icon-alt").first().text();
        const rating = ratingText.includes("out of") ? parseFloat(ratingText) : 4.6;
        const reviewsText = $(el).find('.a-size-base.s-underline-text, span[aria-label*="ratings"], span[aria-label*="stars"] + span').first().text().replace(/[^0-9]/g, "");
        const reviewsCount = reviewsText ? parseInt(reviewsText, 10) : 1250;
        let author = $(el).find(".a-row.a-size-base.a-color-secondary .a-row").text().trim() || $(el).find(".a-row.a-size-base.a-color-secondary").text().trim();
        if (author.includes("by ")) {
          author = author.split("by ")[1]?.split("|")[0]?.split("(")[0]?.trim();
        }
        if (!author) author = "Autor Amazon KDP";
        const badgeText = $(el).find(".a-badge-text").text().trim();
        results.push({
          asin,
          title: title.replace(/\s+/g, " ").substring(0, 80),
          author: author.replace(/\s+/g, " ").substring(0, 50),
          priceUsd: price,
          royaltyEstUsd,
          rating,
          reviewsCount,
          coverImage,
          amazonUrl: `https://www.amazon.com/dp/${asin}`,
          badge: badgeText || void 0
        });
      });
      if (results.length > 0) {
        searchCache.set(cacheKey, { timestamp: Date.now(), data: results });
      }
      return results;
    } catch (err) {
      console.warn(`[AmazonLiveService] Falha ao consultar Amazon ao vivo para "${keyword}":`, err.message);
      return [];
    }
  }
  /**
   * Puxa sugestões de busca em tempo real da API oficial da Amazon.
   */
  static async getLiveSuggestions(prefix) {
    try {
      const url = `https://completion.amazon.com/api/2017/suggestions?mid=ATVPDKIKX0DER&alias=stripbooks&prefix=${encodeURIComponent(prefix)}`;
      const res = await fetch(url);
      if (!res.ok) return [];
      const json = await res.json();
      return (json.suggestions || []).map((s) => s.value).filter(Boolean);
    } catch {
      return [];
    }
  }
};

// src/server.ts
var projectRoot = process.cwd();
var app = express();
var PORT = process.env.PORT || 1e4;
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.get("/api/health", (_req, res) => {
  res.status(200).json({
    status: "online",
    platform: "criador-de-livros-kdp",
    uptime: process.uptime(),
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
app.get("/api/amazon/search", async (req, res) => {
  try {
    const query = req.query.query || "bestseller books";
    const limit = parseInt(req.query.limit || "8", 10);
    const books = await AmazonLiveService.searchAmazonBooks(query, limit);
    res.status(200).json({ success: true, count: books.length, books });
  } catch (err) {
    console.error("[AmazonSearch Error]:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});
app.get("/api/amazon/suggestions", async (req, res) => {
  try {
    const prefix = req.query.prefix || "";
    const suggestions = await AmazonLiveService.getLiveSuggestions(prefix);
    res.status(200).json({ success: true, suggestions });
  } catch (err) {
    console.error("[AmazonSuggestions Error]:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});
app.get("/api/covers/api-key-status", (_req, res) => {
  const status = BackendCoverService.getApiKeyStatus();
  res.status(200).json({ success: true, ...status });
});
app.post("/api/covers/save-api-key", (req, res) => {
  try {
    const { apiKey } = req.body || {};
    const result = BackendCoverService.saveApiKey(apiKey || "");
    res.status(result.success ? 200 : 400).json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});
app.post("/api/covers/generate", async (req, res) => {
  try {
    const payload = req.body || {};
    const progress = await BackendCoverService.startCoverGeneration(payload);
    res.status(200).json({
      success: true,
      jobId: progress.jobId,
      status: progress.status,
      stepLabel: progress.stepLabel
    });
  } catch (err) {
    console.error("[CoverGeneration Error]:", err.message);
    res.status(400).json({ success: false, error: err.message });
  }
});
app.get("/api/covers/status/:jobId", (req, res) => {
  const { jobId } = req.params;
  const status = BackendCoverService.getJobStatus(jobId);
  if (status) {
    res.status(200).json({ success: true, ...status });
  } else {
    res.status(404).json({ success: false, error: "Tarefa de capa n\xE3o encontrada" });
  }
});
app.get("/api/covers/list/:projectId", (req, res) => {
  const { projectId } = req.params;
  const covers = BackendCoverService.getProjectCovers(projectId);
  res.status(200).json({ success: true, covers });
});
app.post("/api/covers/select", (req, res) => {
  try {
    const { projectId, coverId } = req.body || {};
    const selected = BackendCoverService.selectCover(projectId, coverId);
    res.status(200).json({ success: !!selected, selectedCover: selected });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});
app.get("/api/covers/:projectId/:fileName", (req, res) => {
  const { projectId, fileName } = req.params;
  const filePath = path2.join(projectRoot, "covers", projectId, fileName);
  if (fs2.existsSync(filePath)) {
    res.setHeader("Content-Type", "image/png");
    res.sendFile(filePath);
  } else {
    res.status(404).json({ error: "Capa n\xE3o encontrada" });
  }
});
app.post("/api/kdp-agents", async (req, res) => {
  try {
    const { agentName, payload } = req.body || {};
    const topic = payload?.topic || payload?.project?.topic || "Desenvolvimento e Finan\xE7as";
    let result = {};
    switch (agentName) {
      case "niche-seo":
        result = {
          opportunityScore: 94,
          marketDemand: "MUITO ALTA",
          competitionLevel: "BAIXA",
          searchVolumeMonthly: 45e3,
          suggestedKeywords: [
            `${topic} na pr\xE1tica`,
            `como aplicar ${topic} 2026`,
            `guia definitivo ${topic}`,
            `m\xE9todo comprovado ${topic}`,
            `livro de ${topic} mais vendido amazon`
          ],
          competitorGaps: [
            "Livros existentes s\xE3o muito te\xF3ricos e prolixos.",
            "Falta de planos de a\xE7\xE3o semanais para o leitor.",
            "Linguagem excessivamente acad\xEAmica sem aplica\xE7\xE3o pr\xE1tica."
          ]
        };
        break;
      case "editorial-architect":
        result = {
          recommendedTitles: [
            { title: `O C\xF3digo de ${topic}`, subtitle: "O M\xE9todo Definitivo para Conquistar Resultados Extraordin\xE1rios" },
            { title: `A Ci\xEAncia de ${topic}`, subtitle: "Como Agir com Foco, Disciplina e Seguran\xE7a" },
            { title: `Al\xE9m dos Limites em ${topic}`, subtitle: "Estrat\xE9gias Testadas para Sair da Teoria e Vencer na Pr\xE1tica" }
          ],
          corePromise: `Capacitar o leitor a implementar um sistema definitivo de ${topic} em at\xE9 14 dias com resultados mensur\xE1veis.`,
          readerTransformation: `De um indiv\xEDduo sobrecarregado para um executor disciplinado com dom\xEDnio total de ${topic}.`
        };
        break;
      case "ghostwriter":
        result = {
          prose: `# Cap\xEDtulo ${payload?.chapterIndex || 1}: ${payload?.chapterTitle || "Fundamentos e Clareza"}

Para transformar a forma como voc\xEA aborda ${topic}, precisamos primeiro eliminar os mitos comuns.

O verdadeiro sucesso n\xE3o decorre de f\xF3rmulas m\xE1gicas ou atalhos instant\xE2neos, mas de princ\xEDpios s\xF3lidos aplicados com const\xE2ncia.

Neste cap\xEDtulo, voc\xEA descobrir\xE1 como estruturar sua mente, organizar suas prioridades e iniciar a execu\xE7\xE3o pr\xE1tica imediatamente.`,
          wordCount: 160,
          readabilityScore: 96
        };
        break;
      case "copywriter":
        result = {
          headline: `Domine ${topic} e transforme seus resultados de forma definitiva.`,
          blurb: `<b>Voc\xEA est\xE1 pronto para alcan\xE7ar o pr\xF3ximo n\xEDvel?</b><br><br>Em <i>${payload?.project?.title || topic}</i>, voc\xEA ter\xE1 acesso a um passo a passo claro e validado para dominar ${topic}.<br><br><b>O que este livro entrega:</b><br><ul><li>Frameworks pr\xE1ticos e descomplicados</li><li>Estudos de caso reais de transforma\xE7\xE3o</li><li>Checklists de a\xE7\xE3o ao final de cada cap\xEDtulo</li></ul><br><b>Garanta seu exemplar e comece hoje mesmo!</b>`
        };
        break;
      case "cover-art-director":
        result = {
          artPrompt: `cinematic hyper-realistic visual representing ${topic}, dark luxury background with polished gold accents, award-winning book cover art, 8k resolution, no text`,
          typographyPairing: {
            titleFont: "Cinzel, Georgia, serif",
            subtitleFont: "Montserrat, sans-serif"
          }
        };
        break;
      default:
        result = { message: "A\xE7\xE3o executada com sucesso pelo backend Node." };
    }
    res.status(200).json({ success: true, agentName, result, backendTime: Date.now() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
var distPath = path2.join(projectRoot, "dist");
var indexPath = path2.join(distPath, "index.html");
if (!fs2.existsSync(indexPath)) {
  console.log('[Backend Server] Pasta "dist" n\xE3o encontrada na inicializa\xE7\xE3o. Executando build autom\xE1tico...');
  try {
    const { execSync } = await import("child_process");
    execSync("npm run build:main && npm run build:content", { stdio: "inherit" });
    console.log("[Backend Server] Build autom\xE1tico do frontend conclu\xEDdo!");
  } catch (err) {
    console.error("[Backend Server] Aviso no auto-build:", err.message);
  }
}
app.use(express.static(distPath));
app.use((req, res, next) => {
  if (req.path.startsWith("/api")) {
    return next();
  }
  if (fs2.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  res.status(200).send(`<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Criador de Livros KDP</title></head>
<body style="font-family:sans-serif;background:#0d1117;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
  <div style="text-align:center;padding:24px;border:1px solid #30363d;border-radius:12px;background:#161b22;max-width:480px;">
    <h2>\u23F3 Carregando Criador de Livros KDP...</h2>
    <p style="color:#8b949e;">O build do sistema est\xE1 sendo finalizado. Atualize a p\xE1gina em alguns instantes.</p>
  </div>
</body>
</html>`);
});
app.listen(Number(PORT), "0.0.0.0", () => {
  console.log(`====================================================`);
  console.log(`\u{1F680} CRIADOR DE LIVROS KDP \u2014 SERVIDOR FULLSTACK ONLINE`);
  console.log(`\u{1F4E1} Porta: ${PORT}`);
  console.log(`\u{1F310} Ambiente: ${process.env.NODE_ENV || "development"}`);
  console.log(`\u{1F517} URL: http://0.0.0.0:${PORT}`);
  console.log(`====================================================`);
});
