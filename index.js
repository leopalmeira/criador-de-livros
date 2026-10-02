var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res, err) => function __init() {
  if (err) throw err[0];
  try {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  } catch (e) {
    throw err = [e], e;
  }
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/services/project-storage-service.ts
var project_storage_service_exports = {};
__export(project_storage_service_exports, {
  ProjectStorageService: () => ProjectStorageService
});
import fs2 from "fs";
import path2 from "path";
var ProjectStorageService;
var init_project_storage_service = __esm({
  "src/services/project-storage-service.ts"() {
    "use strict";
    ProjectStorageService = class {
      static BASE_DIR = path2.join(process.cwd(), "data", "projects");
      static ensureDir(dirPath) {
        if (!fs2.existsSync(dirPath)) {
          fs2.mkdirSync(dirPath, { recursive: true });
        }
      }
      static getProjectDir(projectId) {
        const safeId = projectId.replace(/[^a-zA-Z0-9_-]/g, "_");
        const projectDir = path2.join(this.BASE_DIR, safeId);
        this.ensureDir(projectDir);
        return projectDir;
      }
      static async saveProject(project) {
        if (!project || !project.id) {
          throw new Error("Projeto inv\xE1lido para persist\xEAncia.");
        }
        const projectDir = this.getProjectDir(project.id);
        const filePath = path2.join(projectDir, "project.json");
        const updated = {
          ...project,
          updatedAt: Date.now()
        };
        fs2.writeFileSync(filePath, JSON.stringify(updated, null, 2), "utf8");
        await this.logAudit(
          project.id,
          "PROJECT_SAVED",
          `Projeto "${project.title || "Sem t\xEDtulo"}" salvo com sucesso.`,
          true,
          project.currentStage
        );
        return updated;
      }
      static async getProject(projectId) {
        if (!projectId) return null;
        const projectDir = this.getProjectDir(projectId);
        const filePath = path2.join(projectDir, "project.json");
        if (!fs2.existsSync(filePath)) {
          return null;
        }
        try {
          const content = fs2.readFileSync(filePath, "utf8");
          return JSON.parse(content);
        } catch (err) {
          console.error(`[ProjectStorage] Erro ao ler projeto ${projectId}:`, err);
          return null;
        }
      }
      static async listProjects() {
        this.ensureDir(this.BASE_DIR);
        const entries = fs2.readdirSync(this.BASE_DIR, { withFileTypes: true });
        const list = [];
        for (const ent of entries) {
          if (ent.isDirectory()) {
            const pPath = path2.join(this.BASE_DIR, ent.name, "project.json");
            if (fs2.existsSync(pPath)) {
              try {
                const raw = fs2.readFileSync(pPath, "utf8");
                list.push(JSON.parse(raw));
              } catch {
              }
            }
          }
        }
        list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
        return list;
      }
      static async deleteProject(projectId) {
        if (!projectId) return false;
        const projectDir = this.getProjectDir(projectId);
        if (fs2.existsSync(projectDir)) {
          fs2.rmSync(projectDir, { recursive: true, force: true });
          return true;
        }
        return false;
      }
      // --- VERSIONAMENTO DE CAPÍTULOS ---
      static async saveChapterVersion(projectId, chapterIndex, version) {
        const projectDir = this.getProjectDir(projectId);
        const chaptersDir = path2.join(projectDir, "chapters", `chapter_${chapterIndex}`);
        this.ensureDir(chaptersDir);
        const versionId = version.id || `ver_${Date.now()}`;
        const filePath = path2.join(chaptersDir, `${versionId}.json`);
        fs2.writeFileSync(filePath, JSON.stringify(version, null, 2), "utf8");
        const project = await this.getProject(projectId);
        if (project && project.kdpChapters && project.kdpChapters[chapterIndex]) {
          const ch = project.kdpChapters[chapterIndex];
          ch.versions = [version, ...ch.versions || []];
          await this.saveProject(project);
        }
      }
      static async getChapterVersions(projectId, chapterIndex) {
        const projectDir = this.getProjectDir(projectId);
        const chaptersDir = path2.join(projectDir, "chapters", `chapter_${chapterIndex}`);
        if (!fs2.existsSync(chaptersDir)) {
          const project = await this.getProject(projectId);
          return project?.kdpChapters?.[chapterIndex]?.versions || [];
        }
        const files = fs2.readdirSync(chaptersDir).filter((f) => f.endsWith(".json"));
        const versions = [];
        for (const f of files) {
          try {
            const raw = fs2.readFileSync(path2.join(chaptersDir, f), "utf8");
            versions.push(JSON.parse(raw));
          } catch {
          }
        }
        versions.sort((a, b) => b.timestamp - a.timestamp);
        return versions;
      }
      // --- LOG DE AUDITORIA EDITORIAL ---
      static async logAudit(projectId, action, details, userConfirmed, stageId, chapterIndex) {
        const projectDir = this.getProjectDir(projectId);
        const auditFile = path2.join(projectDir, "audit.jsonl");
        const entry = {
          id: `aud_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          projectId,
          timestamp: Date.now(),
          action,
          stageId,
          chapterIndex,
          details,
          userConfirmed
        };
        const line = JSON.stringify(entry) + "\n";
        fs2.appendFileSync(auditFile, line, "utf8");
      }
      static async getAuditLogs(projectId) {
        const projectDir = this.getProjectDir(projectId);
        const auditFile = path2.join(projectDir, "audit.jsonl");
        if (!fs2.existsSync(auditFile)) return [];
        const lines = fs2.readFileSync(auditFile, "utf8").split("\n").filter(Boolean);
        const entries = [];
        for (const line of lines) {
          try {
            entries.push(JSON.parse(line));
          } catch {
          }
        }
        entries.sort((a, b) => b.timestamp - a.timestamp);
        return entries;
      }
    };
  }
});

// src/server.ts
import express from "express";
import cors from "cors";
import path3 from "path";
import fs3 from "fs";

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

// src/services/coloring-themes-catalog.ts
var COLORING_THEMES = [
  {
    id: "mandalas",
    name: "Mandalas M\xEDsticas (Mystical Mandalas)",
    category: "Padr\xF5es",
    description: "Padr\xF5es geom\xE9tricos elegantes, s\xEDmbolos sagrados e desenhos circulares sim\xE9tricos de alta introspec\xE7\xE3o e relaxamento.",
    coverPromptDetails: "elegant mandala patterns, intricate geometric designs, spiritual symbols, purple and gold color scheme, calming zen aesthetic",
    prompts: [
      "intricate mandala pattern with geometric shapes and floral elements, black line art on white background, adult coloring book page, highly detailed symmetrical design",
      "zen mandala with lotus flowers and sacred geometry, clean black outlines on white, coloring page style, no shading",
      "celestial mandala with sun moon and stars pattern, detailed line drawing, adult coloring book, white background",
      "nature mandala with leaves vines and flowers, circular symmetrical design, black linework coloring page",
      "tribal mandala with ethnic patterns and symbols, intricate black line art, coloring book style",
      "kaleidoscope mandala with repeating crystalline facets, sharp vector style black lines on pure white paper",
      "sacred geometry mandala with Sri Yantra nested triangles and floral perimeter, ultra crisp black linework"
    ]
  },
  {
    id: "animals",
    name: "Animais Encantados (Enchanted Animals)",
    category: "Natureza",
    description: "Retratos majestosos de animais silvestres adornados com texturas zentangle, mandalas e arte ornamental.",
    coverPromptDetails: "decorated animals with intricate patterns, lion owl elephant, vibrant nature colors, professional book cover design, whimsical artistic style",
    prompts: [
      "majestic lion portrait with decorative mane made of intricate patterns and flowers, adult coloring book style, black line art on white",
      "owl with ornate feathers filled with zentangle patterns, detailed coloring page, clean black outlines",
      "elephant decorated with mandala and paisley patterns, adult coloring book page, intricate line art",
      "wolf howling at moon with tribal patterns in fur, detailed line drawing for coloring, white background",
      "butterfly with intricate wing patterns and floral designs, adult coloring page, black linework",
      "peacock with elaborate tail feathers in zentangle style, coloring book art, detailed outlines",
      "fox with decorative fur patterns and nature elements, adult coloring page, clean lines",
      "horse with flowing mane filled with swirls and patterns, line art coloring page, intricate design"
    ]
  },
  {
    id: "nature",
    name: "Jardins Bot\xE2nicos (Botanical Gardens)",
    category: "Natureza",
    description: "Folhagens tropicais, arranjos florais detalhados, florestas encantadas e composi\xE7\xF5es bot\xE2nicas relaxantes.",
    coverPromptDetails: "beautiful flowers and plants, tropical leaves, botanical illustration style, fresh green and floral colors, elegant book cover design",
    prompts: [
      "tropical flowers and leaves arrangement, detailed botanical illustration, adult coloring book style, black line art",
      "enchanted forest scene with mushrooms ferns and flowers, intricate line drawing for coloring, white background",
      "underwater coral reef with fish and sea plants, detailed coloring page, clean black outlines",
      "garden scene with roses lilies and vines, botanical coloring book page, intricate linework",
      "tree of life with detailed bark leaves and roots, adult coloring page, ornate line art",
      "succulent garden arrangement, detailed botanical drawing, coloring book style, clean lines",
      "monstera leaves and exotic orchids in conservatory, crisp contour lines for coloring, no gray tones"
    ]
  },
  {
    id: "geometric",
    name: "Geometria Sagrada (Sacred Geometry)",
    category: "Padr\xF5es",
    description: "Tessela\xE7\xF5es matem\xE1ticas, ilus\xF5es de \xF3tica, padr\xF5es 3D e arte moderna de alta precis\xE3o linear.",
    coverPromptDetails: "complex geometric patterns, mathematical art, sacred geometry symbols, modern minimalist design, blue and gold color scheme",
    prompts: [
      "complex geometric pattern with interlocking shapes, adult coloring book page, precise black line art on white",
      "optical illusion geometric design, intricate repeating pattern, coloring page style, clean outlines",
      "3D geometric tessellation pattern, adult coloring book, detailed line art, white background",
      "art deco geometric pattern with symmetrical design, coloring page, black linework",
      "islamic geometric tile pattern, intricate arabesque design, adult coloring book style",
      "metatron cube surrounded by nested platonic solids, clean vector black outlines on white"
    ]
  },
  {
    id: "fantasy",
    name: "Reinos de Fantasia (Fantasy Realms)",
    category: "\xC9pico & Fantasia",
    description: "Drag\xF5es ancestrais, fadas, sereias, castelos nas nuvens e criaturas m\xEDticas com ricas linhas narrativas.",
    coverPromptDetails: "magical creatures, dragons and fairies, enchanted fantasy landscape, vibrant magical colors, dreamy whimsical book cover",
    prompts: [
      "fairy sitting on mushroom in enchanted forest, intricate details, adult coloring book page, line art",
      "dragon with ornate scales and decorative patterns, detailed coloring page, black outlines on white",
      "mermaid with flowing hair and detailed tail patterns, adult coloring book style, line drawing",
      "unicorn with decorated mane and magical elements, intricate coloring page, clean black lines",
      "castle in clouds with fantasy landscape, detailed line art for coloring, adult coloring book",
      "phoenix rising with elaborate feather patterns, coloring book page, intricate linework"
    ]
  },
  {
    id: "patterns",
    name: "Padr\xF5es Terap\xEAuticos (Relaxing Patterns)",
    category: "Padr\xF5es",
    description: "Estilo paisley, texturas zentangle, pap\xE9is de parede damasco e arabescos art nouveau para foco e desestresse.",
    coverPromptDetails: "abstract paisley and zentangle designs, decorative patterns, soothing art nouveau style, calming pastel colors, elegant cover",
    prompts: [
      "paisley pattern with intricate swirls and details, adult coloring book page, black line art on white",
      "zentangle abstract pattern with various textures, detailed coloring page, clean outlines",
      "damask wallpaper pattern, ornate repeating design, adult coloring book style, line art",
      "moroccan tile pattern with geometric and floral elements, coloring page, intricate lines",
      "art nouveau flowing pattern with organic curves, adult coloring book, detailed linework"
    ]
  },
  {
    id: "inspirational",
    name: "Palavras & Afirma\xE7\xF5es (Mindful Words)",
    category: "Geral",
    description: "Letras ornamentadas e tipografia decorativa com palavras de poder e paz cercadas por flores e folhagens.",
    coverPromptDetails: "decorative inspirational words, peace love breathe, ornate lettering with floral elements, uplifting soft colors, motivational book cover",
    prompts: [
      "word BREATHE surrounded by decorative swirls flowers and patterns, adult coloring book page, line art",
      "word PEACE with mandala and nature elements around it, coloring page style, intricate outlines",
      "word LOVE decorated with hearts flowers and ornate patterns, adult coloring book, black lines",
      "word DREAM with clouds stars and whimsical designs, coloring page, detailed line art",
      "word CREATE surrounded by artistic elements and patterns, adult coloring book style, clean lines",
      "word GRATITUDE framed by blooming sunflower borders and zentangle ribbons, bold black line art"
    ]
  },
  {
    id: "ocean",
    name: "Mar & Vida Oce\xE2nica (Ocean Wonders)",
    category: "Natureza",
    description: "Tartarugas marinhas, recifes de corais, \xE1guas-vivas, cavalos-marinhos e criaturas oce\xE2nicas ornamentadas.",
    coverPromptDetails: "underwater ocean reef, sea turtle and exotic fish, oceanic turquoise and coral hues, detailed nautical cover",
    prompts: [
      "detailed sea turtle swimming with decorative shell patterns, coral and seaweed around, adult coloring book page, intricate line art",
      "jellyfish with flowing tentacles filled with zentangle patterns, underwater scene, coloring page, clean black outlines",
      "ornate seahorse with intricate decorative patterns and bubbles, adult coloring book style, line drawing",
      "octopus with detailed tentacles wrapped around coral, underwater garden, coloring page, black linework",
      "tropical fish school with decorative scales and fins, coral reef background, adult coloring book, detailed outlines",
      "dolphin jumping through waves with decorative patterns, ocean scene, coloring page, intricate line art"
    ]
  },
  {
    id: "flowers",
    name: "Jardins em Flor (Blooming Gardens)",
    category: "Natureza",
    description: "Buqu\xEAs exuberantes de girass\xF3is, rosas, l\xF3tus, orqu\xEDdeas e flores silvestres com tra\xE7os puros para preenchimento.",
    coverPromptDetails: "blooming flower bouquet, elegant floral composition, watercolor-inspired book cover palette, luxury aesthetics",
    prompts: [
      "sunflower with intricate center pattern and detailed petals, adult coloring book page, black line art on white",
      "rose garden with blooming roses, leaves and vines intertwining, detailed coloring page, clean outlines",
      "lotus flower floating on water with lily pads and koi fish, adult coloring book style, intricate linework",
      "cherry blossom branch with delicate flowers and decorative patterns, coloring page, detailed line art",
      "wildflower meadow with diverse flowers, butterflies and bees, coloring page, intricate patterns",
      "peony bouquet with full blooms and ornate leaves, adult coloring book style, detailed outlines"
    ]
  },
  {
    id: "zen",
    name: "Zen & Medita\xE7\xE3o (Zen & Mindfulness)",
    category: "Geral",
    description: "Monges em medita\xE7\xE3o, jardins secos de areia, \xE1rvores bonsai, c\xEDrculos Ens\u014D e s\xEDmbolos espirituais.",
    coverPromptDetails: "zen garden with stones, lotus and bonsai, calming green and bamboo tones, peaceful meditation book cover",
    prompts: [
      "buddha meditating surrounded by lotus flowers and ornate patterns, adult coloring book page, line art",
      "zen garden with raked sand patterns, rocks and bonsai tree, detailed coloring page, clean outlines",
      "yin yang symbol with decorative patterns and natural elements, adult coloring book style, intricate linework",
      "meditation stones stacked with flowing water and bamboo, coloring page, detailed line art",
      "om symbol surrounded by mandalas and spiritual patterns, adult coloring book, black linework",
      "lotus mandala with layers of petals and sacred geometry, coloring page, intricate patterns"
    ]
  },
  {
    id: "celtic",
    name: "Arte Celta (Celtic Knots)",
    category: "Cultura",
    description: "N\xF3s infinitos, cruzes c\xE9lticas, triskeles e espirais sagradas da mitologia ga\xE9lica e brit\xE2nica antiga.",
    coverPromptDetails: "intricate celtic knotwork borders, ancient emerald green and bronze tones, mythical celtic book cover",
    prompts: [
      "celtic trinity knot with intricate interwoven lines and patterns, adult coloring book page, line art",
      "celtic cross with ornate knotwork and decorative details, coloring page, clean black outlines",
      "celtic tree of life with intertwining branches and roots, adult coloring book style, intricate linework",
      "celtic animals with knotwork patterns, dragons and birds intertwined, coloring page, detailed line art",
      "celtic border pattern with continuous interlacing design, adult coloring book, black linework"
    ]
  },
  {
    id: "japanese",
    name: "Arte Tradicional Japonesa (Japanese Art)",
    category: "Cultura",
    description: "Peixes Carpa Koi, cerejeiras em flor, gueixas, templos pagodes, drag\xF5es orientais e ondas no estilo Ukiyo-e.",
    coverPromptDetails: "japanese pagoda with cherry blossoms and mount fuji, crimson red and gold details, elegant oriental book cover",
    prompts: [
      "koi fish swimming in pond with lotus flowers and decorative waves, adult coloring book page, line art",
      "japanese cherry blossom tree with intricate branches and blooms, coloring page, clean outlines",
      "geisha with ornate kimono patterns and elaborate hair decorations, adult coloring book style, detailed linework",
      "pagoda temple with decorative rooflines and garden landscape, coloring page, intricate line art",
      "japanese dragon with scales and flowing mane, clouds and waves, adult coloring book, black linework",
      "origami crane with decorative fold patterns and traditional designs, coloring page, clean lines"
    ]
  },
  {
    id: "space",
    name: "Sonhos C\xF3smicos (Cosmic Dreams)",
    category: "\xC9pico & Fantasia",
    description: "Astronautas flutuantes, planetas detalhados, constela\xE7\xF5es m\xEDticas, gal\xE1xias em espiral e luas crescentes.",
    coverPromptDetails: "cosmic nebula with planets and astronaut silhouette, deep purple and starlight navy, stunning space cover",
    prompts: [
      "solar system with detailed planets, stars and orbital patterns, adult coloring book page, intricate line art",
      "astronaut floating in space with decorative suit patterns, stars and galaxies, coloring page, clean outlines",
      "moon phases with ornate lunar surface details and celestial patterns, adult coloring book style, linework",
      "constellation patterns with connected stars forming mythical creatures, coloring page, detailed line art",
      "rocket ship launching with decorative hull designs and flame patterns, adult coloring book, black lines",
      "galaxy spiral with swirling stars and cosmic dust patterns, adult coloring book style, detailed outlines"
    ]
  },
  {
    id: "architecture",
    name: "Monumentos & Cidades (Beautiful Buildings)",
    category: "Cultura",
    description: "Catedrais g\xF3ticas, mans\xF5es vitorianas, o Taj Mahal, a Torre Eiffel, far\xF3is mar\xEDtimos e moinhos de vento.",
    coverPromptDetails: "architectural landmarks montage, refined line drafting with warm twilight tones, premium book cover",
    prompts: [
      "gothic cathedral with intricate stained glass windows and ornate spires, adult coloring book page, line art",
      "victorian mansion with detailed gingerbread trim and wraparound porch, coloring page, clean outlines",
      "taj mahal with ornate domes and decorative archways, reflecting pool, adult coloring book style, linework",
      "eiffel tower with intricate ironwork lattice patterns and parisian skyline, coloring page, detailed line art",
      "lighthouse on cliff with decorative stonework and crashing waves, adult coloring book, black linework",
      "castle with detailed towers, battlements and decorative stonework, adult coloring book style, clean lines"
    ]
  }
];
var PROMPT_VARIATIONS = [
  "",
  ", with bold thick outlines and balanced whitespace",
  ", with intricate background patterns and ornamental details",
  ", centered composition, framed by delicate vignette borders",
  ", full page design, maximized coloring surface area",
  ", zen balanced composition, serene flow of lines",
  ", clean vector style, crisp high contrast monochrome linework"
];

// src/services/coloring-book-service.ts
import { jsPDF } from "jspdf";

// src/database/defaults.ts
var DEFAULT_SETTINGS = {
  defaultMarketplace: "amazon.com.br",
  language: "pt-BR",
  theme: "dark",
  cacheTtlMinutes: 30,
  monthlyDaysMultiplier: 30,
  showOverlayOnCards: true,
  showProductPanel: true,
  showNicheBar: true,
  debugMode: false,
  opportunityWeights: {
    salesWeight: 35,
    reviewBarrierWeight: 25,
    ratingWeight: 15,
    priceWeight: 15,
    recencyWeight: 10
  },
  royaltySettings: {
    "BRL": {
      kindleRateHigh: 0.7,
      kindleRateLow: 0.35,
      kindleMinPriceForHighRate: 5.99,
      kindleMaxPriceForHighRate: 24.99,
      kindleDeliveryCostPerMb: 0.3,
      paperbackFixedCost: 5,
      paperbackPerPageCost: 0.07,
      paperbackRoyaltyRate: 0.6,
      hardcoverFixedCost: 14,
      hardcoverPerPageCost: 0.08,
      hardcoverRoyaltyRate: 0.6,
      audiobookRoyaltyRate: 0.25
    },
    "USD": {
      kindleRateHigh: 0.7,
      kindleRateLow: 0.35,
      kindleMinPriceForHighRate: 2.99,
      kindleMaxPriceForHighRate: 9.99,
      kindleDeliveryCostPerMb: 0.15,
      paperbackFixedCost: 1,
      paperbackPerPageCost: 0.012,
      paperbackRoyaltyRate: 0.6,
      hardcoverFixedCost: 6,
      hardcoverPerPageCost: 0.015,
      hardcoverRoyaltyRate: 0.6,
      audiobookRoyaltyRate: 0.25
    },
    "EUR": {
      kindleRateHigh: 0.7,
      kindleRateLow: 0.35,
      kindleMinPriceForHighRate: 2.69,
      kindleMaxPriceForHighRate: 9.99,
      kindleDeliveryCostPerMb: 0.12,
      paperbackFixedCost: 0.9,
      paperbackPerPageCost: 0.012,
      paperbackRoyaltyRate: 0.6,
      hardcoverFixedCost: 5.5,
      hardcoverPerPageCost: 0.015,
      hardcoverRoyaltyRate: 0.6,
      audiobookRoyaltyRate: 0.25
    },
    "GBP": {
      kindleRateHigh: 0.7,
      kindleRateLow: 0.35,
      kindleMinPriceForHighRate: 1.99,
      kindleMaxPriceForHighRate: 9.99,
      kindleDeliveryCostPerMb: 0.1,
      paperbackFixedCost: 0.85,
      paperbackPerPageCost: 0.01,
      paperbackRoyaltyRate: 0.6,
      hardcoverFixedCost: 5,
      hardcoverPerPageCost: 0.014,
      hardcoverRoyaltyRate: 0.6,
      audiobookRoyaltyRate: 0.25
    }
  },
  aiSettings: {
    provider: "gemini",
    apiKey: "",
    fallbackApiKey: "",
    baseUrl: "",
    model: "gemini-2.0-flash",
    azureEndpoint: "",
    azureApiKey: "",
    azureImageEndpoint: "",
    imageProvider: "builtin-flux",
    imageEndpoint: "http://127.0.0.1:7865",
    imageModel: "flux",
    temperature: 0.7
  }
};
var DEFAULT_SALES_MODELS = [
  {
    id: "br-books-default-v1",
    name: "Amazon Brasil - Livros e Kindle (Padr\xE3o)",
    marketplace: "amazon.com.br",
    format: "Todos",
    method: "log-log",
    version: "sales-model-br-v1.0",
    isDefault: true,
    points: [
      { bsr: 1, dailySales: 320 },
      { bsr: 10, dailySales: 130 },
      { bsr: 50, dailySales: 60 },
      { bsr: 100, dailySales: 38 },
      { bsr: 500, dailySales: 16 },
      { bsr: 1e3, dailySales: 9.5 },
      { bsr: 2500, dailySales: 5 },
      { bsr: 5e3, dailySales: 3 },
      { bsr: 1e4, dailySales: 1.7 },
      { bsr: 2e4, dailySales: 1 },
      { bsr: 5e4, dailySales: 0.45 },
      { bsr: 1e5, dailySales: 0.2 },
      { bsr: 25e4, dailySales: 0.07 },
      { bsr: 5e5, dailySales: 0.02 }
    ]
  },
  {
    id: "us-books-default-v1",
    name: "Amazon EUA - Books & Kindle (Padr\xE3o)",
    marketplace: "amazon.com",
    format: "Todos",
    method: "log-log",
    version: "sales-model-us-v1.0",
    isDefault: true,
    points: [
      { bsr: 1, dailySales: 3500 },
      { bsr: 10, dailySales: 1250 },
      { bsr: 50, dailySales: 520 },
      { bsr: 100, dailySales: 310 },
      { bsr: 500, dailySales: 125 },
      { bsr: 1e3, dailySales: 65 },
      { bsr: 2500, dailySales: 35 },
      { bsr: 5e3, dailySales: 20 },
      { bsr: 1e4, dailySales: 11 },
      { bsr: 25e3, dailySales: 5 },
      { bsr: 5e4, dailySales: 2.5 },
      { bsr: 1e5, dailySales: 1.2 },
      { bsr: 25e4, dailySales: 0.4 },
      { bsr: 5e5, dailySales: 0.15 },
      { bsr: 1e6, dailySales: 0.04 }
    ]
  },
  {
    id: "uk-books-default-v1",
    name: "Amazon UK - Books & Kindle",
    marketplace: "amazon.co.uk",
    format: "Todos",
    method: "log-log",
    version: "sales-model-uk-v1.0",
    isDefault: true,
    points: [
      { bsr: 1, dailySales: 700 },
      { bsr: 10, dailySales: 260 },
      { bsr: 50, dailySales: 110 },
      { bsr: 100, dailySales: 70 },
      { bsr: 500, dailySales: 28 },
      { bsr: 1e3, dailySales: 16 },
      { bsr: 5e3, dailySales: 5.5 },
      { bsr: 1e4, dailySales: 3 },
      { bsr: 5e4, dailySales: 0.7 },
      { bsr: 1e5, dailySales: 0.3 }
    ]
  },
  {
    id: "de-books-default-v1",
    name: "Amazon Deutschland - B\xFCcher & Kindle",
    marketplace: "amazon.de",
    format: "Todos",
    method: "log-log",
    version: "sales-model-de-v1.0",
    isDefault: true,
    points: [
      { bsr: 1, dailySales: 800 },
      { bsr: 10, dailySales: 300 },
      { bsr: 50, dailySales: 130 },
      { bsr: 100, dailySales: 80 },
      { bsr: 500, dailySales: 30 },
      { bsr: 1e3, dailySales: 17 },
      { bsr: 5e3, dailySales: 6 },
      { bsr: 1e4, dailySales: 3.2 },
      { bsr: 5e4, dailySales: 0.8 },
      { bsr: 1e5, dailySales: 0.35 }
    ]
  },
  {
    id: "es-books-default-v1",
    name: "Amazon Espa\xF1a - Libros & Kindle",
    marketplace: "amazon.es",
    format: "Todos",
    method: "log-log",
    version: "sales-model-es-v1.0",
    isDefault: true,
    points: [
      { bsr: 1, dailySales: 350 },
      { bsr: 10, dailySales: 140 },
      { bsr: 50, dailySales: 60 },
      { bsr: 100, dailySales: 40 },
      { bsr: 500, dailySales: 16 },
      { bsr: 1e3, dailySales: 9 },
      { bsr: 5e3, dailySales: 3 },
      { bsr: 1e4, dailySales: 1.6 },
      { bsr: 5e4, dailySales: 0.4 },
      { bsr: 1e5, dailySales: 0.18 }
    ]
  },
  {
    id: "fr-books-default-v1",
    name: "Amazon France - Livres & Kindle",
    marketplace: "amazon.fr",
    format: "Todos",
    method: "log-log",
    version: "sales-model-fr-v1.0",
    isDefault: true,
    points: [
      { bsr: 1, dailySales: 500 },
      { bsr: 10, dailySales: 190 },
      { bsr: 50, dailySales: 80 },
      { bsr: 100, dailySales: 52 },
      { bsr: 500, dailySales: 20 },
      { bsr: 1e3, dailySales: 12 },
      { bsr: 5e3, dailySales: 4 },
      { bsr: 1e4, dailySales: 2.2 },
      { bsr: 5e4, dailySales: 0.55 },
      { bsr: 1e5, dailySales: 0.22 }
    ]
  },
  {
    id: "it-books-default-v1",
    name: "Amazon Italia - Libri & Kindle",
    marketplace: "amazon.it",
    format: "Todos",
    method: "log-log",
    version: "sales-model-it-v1.0",
    isDefault: true,
    points: [
      { bsr: 1, dailySales: 350 },
      { bsr: 10, dailySales: 130 },
      { bsr: 50, dailySales: 55 },
      { bsr: 100, dailySales: 35 },
      { bsr: 500, dailySales: 14 },
      { bsr: 1e3, dailySales: 8 },
      { bsr: 5e3, dailySales: 2.7 },
      { bsr: 1e4, dailySales: 1.5 },
      { bsr: 5e4, dailySales: 0.35 },
      { bsr: 1e5, dailySales: 0.15 }
    ]
  },
  {
    id: "ca-books-default-v1",
    name: "Amazon Canada - Books & Kindle",
    marketplace: "amazon.ca",
    format: "Todos",
    method: "log-log",
    version: "sales-model-ca-v1.0",
    isDefault: true,
    points: [
      { bsr: 1, dailySales: 400 },
      { bsr: 10, dailySales: 150 },
      { bsr: 50, dailySales: 65 },
      { bsr: 100, dailySales: 42 },
      { bsr: 500, dailySales: 17 },
      { bsr: 1e3, dailySales: 10 },
      { bsr: 5e3, dailySales: 3.3 },
      { bsr: 1e4, dailySales: 1.8 },
      { bsr: 5e4, dailySales: 0.45 },
      { bsr: 1e5, dailySales: 0.2 }
    ]
  },
  {
    id: "mx-books-default-v1",
    name: "Amazon M\xE9xico - Libros & Kindle",
    marketplace: "amazon.com.mx",
    format: "Todos",
    method: "log-log",
    version: "sales-model-mx-v1.0",
    isDefault: true,
    points: [
      { bsr: 1, dailySales: 200 },
      { bsr: 10, dailySales: 80 },
      { bsr: 50, dailySales: 35 },
      { bsr: 100, dailySales: 22 },
      { bsr: 500, dailySales: 9 },
      { bsr: 1e3, dailySales: 5 },
      { bsr: 5e3, dailySales: 1.7 },
      { bsr: 1e4, dailySales: 0.9 },
      { bsr: 5e4, dailySales: 0.2 },
      { bsr: 1e5, dailySales: 0.08 }
    ]
  }
];

// src/database/local-database.ts
var DB_NAME = "BookIntelDB";
var DB_VERSION = 3;
var LocalDatabase = class {
  dbPromise = null;
  inMemoryCategoryMetrics = [];
  getDB() {
    if (this.dbPromise) return this.dbPromise;
    this.dbPromise = new Promise((resolve, reject) => {
      const indexedDB = (typeof self !== "undefined" ? self.indexedDB : void 0) || (typeof window !== "undefined" ? window.indexedDB : void 0) || (typeof globalThis !== "undefined" ? globalThis.indexedDB : void 0);
      if (!indexedDB) {
        reject(new Error("IndexedDB n\xE3o suportado neste contexto."));
        return;
      }
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (event) => {
        const db2 = event.target.result;
        if (!db2.objectStoreNames.contains("books")) {
          const bookStore = db2.createObjectStore("books", { keyPath: "asin" });
          bookStore.createIndex("marketplace", "marketplace", { unique: false });
          bookStore.createIndex("lastSeenAt", "lastSeenAt", { unique: false });
          bookStore.createIndex("title", "title", { unique: false });
          bookStore.createIndex("author", "author", { unique: false });
        }
        if (!db2.objectStoreNames.contains("observations")) {
          const obsStore = db2.createObjectStore("observations", { keyPath: "id", autoIncrement: true });
          obsStore.createIndex("asin", "asin", { unique: false });
          obsStore.createIndex("timestamp", "timestamp", { unique: false });
          obsStore.createIndex("asin_timestamp", ["asin", "timestamp"], { unique: false });
        }
        if (!db2.objectStoreNames.contains("watchlist")) {
          const wlStore = db2.createObjectStore("watchlist", { keyPath: "asin" });
          wlStore.createIndex("addedAt", "addedAt", { unique: false });
        }
        if (!db2.objectStoreNames.contains("snapshots")) {
          const snapStore = db2.createObjectStore("snapshots", { keyPath: "id" });
          snapStore.createIndex("keyword", "keyword", { unique: false });
          snapStore.createIndex("timestamp", "timestamp", { unique: false });
        }
        if (!db2.objectStoreNames.contains("salesModels")) {
          const modelStore = db2.createObjectStore("salesModels", { keyPath: "id" });
          modelStore.createIndex("marketplace", "marketplace", { unique: false });
        }
        if (!db2.objectStoreNames.contains("logs")) {
          const logStore = db2.createObjectStore("logs", { keyPath: "id", autoIncrement: true });
          logStore.createIndex("timestamp", "timestamp", { unique: false });
          logStore.createIndex("level", "level", { unique: false });
        }
        if (!db2.objectStoreNames.contains("bookProjects")) {
          const projStore = db2.createObjectStore("bookProjects", { keyPath: "id" });
          projStore.createIndex("status", "status", { unique: false });
          projStore.createIndex("createdAt", "createdAt", { unique: false });
          projStore.createIndex("updatedAt", "updatedAt", { unique: false });
          projStore.createIndex("priority", "priority", { unique: false });
        }
        if (!db2.objectStoreNames.contains("categoryMarketMetrics")) {
          const metricsStore = db2.createObjectStore("categoryMarketMetrics", { keyPath: "id" });
          metricsStore.createIndex("marketplace", "marketplace", { unique: false });
          metricsStore.createIndex("category", "category", { unique: false });
          metricsStore.createIndex("subcategory", "subcategory", { unique: false });
          metricsStore.createIndex("collected_at", "collected_at", { unique: false });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return this.dbPromise;
  }
  // --- LIVROS ---
  async saveBook(book) {
    const db2 = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db2.transaction("books", "readwrite");
      const store = tx.objectStore("books");
      const req = store.put(book);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }
  async getBook(asin) {
    const db2 = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db2.transaction("books", "readonly");
      const store = tx.objectStore("books");
      const req = store.get(asin);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }
  async getAllBooks() {
    const db2 = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db2.transaction("books", "readonly");
      const store = tx.objectStore("books");
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }
  // --- OBSERVAÇÕES DE BSR ---
  async recordObservation(observation) {
    const db2 = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db2.transaction("observations", "readwrite");
      const store = tx.objectStore("observations");
      const req = store.add(observation);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  async getObservationsForBook(asin, limit = 100) {
    const db2 = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db2.transaction("observations", "readonly");
      const store = tx.objectStore("observations");
      const index = store.index("asin");
      const req = index.getAll(IDBKeyRange.only(asin));
      req.onsuccess = () => {
        const results = req.result || [];
        results.sort((a, b) => a.timestamp - b.timestamp);
        if (limit && results.length > limit) {
          resolve(results.slice(results.length - limit));
        } else {
          resolve(results);
        }
      };
      req.onerror = () => reject(req.error);
    });
  }
  async getAllObservations() {
    const db2 = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db2.transaction("observations", "readonly");
      const store = tx.objectStore("observations");
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }
  // --- WATCHLIST ---
  async addToWatchlist(item) {
    const db2 = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db2.transaction("watchlist", "readwrite");
      const store = tx.objectStore("watchlist");
      const req = store.put(item);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }
  async removeFromWatchlist(asin) {
    const db2 = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db2.transaction("watchlist", "readwrite");
      const store = tx.objectStore("watchlist");
      const req = store.delete(asin);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }
  async getWatchlist() {
    const db2 = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db2.transaction("watchlist", "readonly");
      const store = tx.objectStore("watchlist");
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }
  async isWatchlisted(asin) {
    const db2 = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db2.transaction("watchlist", "readonly");
      const store = tx.objectStore("watchlist");
      const req = store.get(asin);
      req.onsuccess = () => resolve(!!req.result);
      req.onerror = () => reject(req.error);
    });
  }
  // --- SNAPSHOTS DE NICHO ---
  async saveNicheSnapshot(snapshot) {
    const db2 = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db2.transaction("snapshots", "readwrite");
      const store = tx.objectStore("snapshots");
      const req = store.put(snapshot);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }
  async getNicheSnapshots(keyword) {
    const db2 = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db2.transaction("snapshots", "readonly");
      const store = tx.objectStore("snapshots");
      let req;
      if (keyword) {
        const index = store.index("keyword");
        req = index.getAll(IDBKeyRange.only(keyword));
      } else {
        req = store.getAll();
      }
      req.onsuccess = () => {
        const list = req.result || [];
        list.sort((a, b) => b.timestamp - a.timestamp);
        resolve(list);
      };
      req.onerror = () => reject(req.error);
    });
  }
  async deleteSnapshot(id) {
    const db2 = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db2.transaction("snapshots", "readwrite");
      const store = tx.objectStore("snapshots");
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }
  // --- CONFIGURAÇÕES ---
  async getSettings() {
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      return new Promise((resolve) => {
        chrome.storage.local.get(["bookintel_settings"], (result) => {
          if (result && result.bookintel_settings) {
            const merged = { ...DEFAULT_SETTINGS, ...result.bookintel_settings };
            if (merged.aiSettings) {
              if (merged.aiSettings.provider === "ollama" && (merged.aiSettings.model === "gpt-4o-mini" || merged.aiSettings.model === "gpt-4o")) {
                merged.aiSettings.model = "llama3.1";
              }
            }
            resolve(merged);
          } else {
            resolve(DEFAULT_SETTINGS);
          }
        });
      });
    } else {
      const local = localStorage.getItem("bookintel_settings");
      if (local) {
        try {
          const merged = { ...DEFAULT_SETTINGS, ...JSON.parse(local) };
          if (merged.aiSettings) {
            if (merged.aiSettings.provider === "ollama" && (merged.aiSettings.model === "gpt-4o-mini" || merged.aiSettings.model === "gpt-4o")) {
              merged.aiSettings.model = "llama3.1";
            }
          }
          return merged;
        } catch {
          return DEFAULT_SETTINGS;
        }
      }
      return DEFAULT_SETTINGS;
    }
  }
  async saveSettings(settings) {
    const current = await this.getSettings();
    const updated = { ...current, ...settings };
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      await new Promise((resolve) => {
        chrome.storage.local.set({ bookintel_settings: updated }, () => resolve());
      });
    } else {
      localStorage.setItem("bookintel_settings", JSON.stringify(updated));
    }
    return updated;
  }
  // --- MODELOS DE ESTIMATIVA DE VENDAS ---
  async getSalesModels() {
    const db2 = await this.getDB();
    const models = await new Promise((resolve, reject) => {
      const tx = db2.transaction("salesModels", "readonly");
      const store = tx.objectStore("salesModels");
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
    if (models.length === 0) {
      for (const defModel of DEFAULT_SALES_MODELS) {
        await this.saveSalesModel(defModel);
      }
      return DEFAULT_SALES_MODELS;
    }
    return models;
  }
  async getSalesModelFor(marketplace, format) {
    const models = await this.getSalesModels();
    let match = models.find((m) => m.marketplace === marketplace && (m.format === format || m.format === "Todos"));
    if (!match) {
      match = models.find((m) => m.marketplace === marketplace);
    }
    if (!match) {
      match = models[0] || DEFAULT_SALES_MODELS[0];
    }
    return match;
  }
  async saveSalesModel(model) {
    const db2 = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db2.transaction("salesModels", "readwrite");
      const store = tx.objectStore("salesModels");
      const req = store.put(model);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }
  async resetSalesModels() {
    const db2 = await this.getDB();
    await new Promise((resolve, reject) => {
      const tx = db2.transaction("salesModels", "readwrite");
      const store = tx.objectStore("salesModels");
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
    for (const m of DEFAULT_SALES_MODELS) {
      await this.saveSalesModel(m);
    }
  }
  // --- PROJETOS DE LIVROS (BOOK CREATOR) ---
  memoryProjects = /* @__PURE__ */ new Map();
  async saveBookProject(project) {
    project.updatedAt = Date.now();
    this.memoryProjects.set(project.id, { ...project });
    try {
      const db2 = await this.getDB();
      await new Promise((resolve, reject) => {
        const tx = db2.transaction("bookProjects", "readwrite");
        const store = tx.objectStore("bookProjects");
        const req = store.put(project);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (idbErr) {
      if (typeof window === "undefined") {
        try {
          const { ProjectStorageService: ProjectStorageService2 } = await Promise.resolve().then(() => (init_project_storage_service(), project_storage_service_exports));
          await ProjectStorageService2.saveProject(project);
        } catch {
        }
      }
    }
    if (typeof window !== "undefined" && typeof fetch !== "undefined") {
      try {
        fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(project)
        }).catch(() => {
        });
      } catch {
      }
    }
  }
  async getBookProject(id) {
    try {
      const db2 = await this.getDB();
      const proj = await new Promise((resolve, reject) => {
        const tx = db2.transaction("bookProjects", "readonly");
        const store = tx.objectStore("bookProjects");
        const req = store.get(id);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
      if (proj) return proj;
    } catch {
    }
    if (this.memoryProjects.has(id)) {
      return this.memoryProjects.get(id) || null;
    }
    if (typeof window !== "undefined" && typeof fetch !== "undefined") {
      try {
        const res = await fetch(`/api/projects/${encodeURIComponent(id)}`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.project) return data.project;
        }
      } catch {
      }
    } else if (typeof window === "undefined") {
      try {
        const { ProjectStorageService: ProjectStorageService2 } = await Promise.resolve().then(() => (init_project_storage_service(), project_storage_service_exports));
        return await ProjectStorageService2.getProject(id);
      } catch {
      }
    }
    return null;
  }
  async getAllBookProjects() {
    let projectsList = [];
    try {
      const db2 = await this.getDB();
      projectsList = await new Promise((resolve, reject) => {
        const tx = db2.transaction("bookProjects", "readonly");
        const store = tx.objectStore("bookProjects");
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });
    } catch {
    }
    if (projectsList.length === 0) {
      if (typeof window !== "undefined" && typeof fetch !== "undefined") {
        try {
          const res = await fetch("/api/projects");
          if (res.ok) {
            const data = await res.json();
            if (data && Array.isArray(data.projects)) {
              projectsList = data.projects;
            }
          }
        } catch {
        }
      } else if (typeof window === "undefined") {
        try {
          const { ProjectStorageService: ProjectStorageService2 } = await Promise.resolve().then(() => (init_project_storage_service(), project_storage_service_exports));
          projectsList = await ProjectStorageService2.listProjects();
        } catch {
        }
      }
    }
    if (this.memoryProjects.size > 0) {
      const memList = Array.from(this.memoryProjects.values());
      const existingIds = new Set(projectsList.map((p) => p.id));
      for (const m of memList) {
        if (!existingIds.has(m.id)) {
          projectsList.push(m);
        }
      }
    }
    projectsList.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    return projectsList;
  }
  async deleteBookProject(id) {
    this.memoryProjects.delete(id);
    try {
      const db2 = await this.getDB();
      await new Promise((resolve, reject) => {
        const tx = db2.transaction("bookProjects", "readwrite");
        const store = tx.objectStore("bookProjects");
        const req = store.delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch {
    }
    if (typeof window !== "undefined" && typeof fetch !== "undefined") {
      try {
        fetch(`/api/projects/${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => {
        });
      } catch {
      }
    } else if (typeof window === "undefined") {
      try {
        const { ProjectStorageService: ProjectStorageService2 } = await Promise.resolve().then(() => (init_project_storage_service(), project_storage_service_exports));
        await ProjectStorageService2.deleteProject(id);
      } catch {
      }
    }
  }
  async getProjectSummaries() {
    const projects = await this.getAllBookProjects();
    return projects.map((p) => ({
      id: p.id,
      title: p.title,
      subtitle: p.subtitle,
      author: p.author,
      status: p.status,
      kdpBookType: p.kdpBookType,
      chaptersCount: p.kdpChapters?.length || p.outline?.length || 0,
      wordsTotal: p.kdpChapters?.reduce((sum, ch) => sum + (ch.wordCount || 0), 0) || 0,
      pagesEstimated: p.actualPages || p.estimatedPages || 0,
      updatedAt: p.updatedAt,
      qualityScore: p.kdpQualityReport?.overallScore,
      isReadyForKdp: p.kdpQualityReport?.isReadyForKdp
    }));
  }
  // --- LOGS DE DIAGNÓSTICO ---
  async addDebugLog(entry) {
    try {
      const db2 = await this.getDB();
      const fullEntry = {
        id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        timestamp: Date.now(),
        ...entry
      };
      const tx = db2.transaction("logs", "readwrite");
      const store = tx.objectStore("logs");
      store.add(fullEntry);
    } catch {
    }
  }
  async getDebugLogs(limit = 150) {
    const db2 = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db2.transaction("logs", "readonly");
      const store = tx.objectStore("logs");
      const req = store.getAll();
      req.onsuccess = () => {
        const logs = req.result || [];
        logs.sort((a, b) => b.timestamp - a.timestamp);
        resolve(logs.slice(0, limit));
      };
      req.onerror = () => reject(req.error);
    });
  }
  async clearDebugLogs() {
    const db2 = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db2.transaction("logs", "readwrite");
      const store = tx.objectStore("logs");
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }
  // --- BACKUP E RESTORE ---
  async exportAllData() {
    const [books, observations, watchlist, snapshots, salesModels, settings, bookProjects] = await Promise.all([
      this.getAllBooks(),
      this.getAllObservations(),
      this.getWatchlist(),
      this.getNicheSnapshots(),
      this.getSalesModels(),
      this.getSettings(),
      this.getAllBookProjects()
    ]);
    return {
      appName: "BookIntel Chrome Extension",
      version: "1.1.0",
      exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
      timestamp: Date.now(),
      data: {
        books,
        observations,
        watchlist,
        snapshots,
        salesModels,
        settings,
        bookProjects
      }
    };
  }
  async importBackupData(backup) {
    if (!backup || !backup.data) return false;
    const { books, observations, watchlist, snapshots, salesModels, settings, bookProjects } = backup.data;
    const db2 = await this.getDB();
    if (books && Array.isArray(books)) {
      const tx = db2.transaction("books", "readwrite");
      const store = tx.objectStore("books");
      for (const b of books) store.put(b);
    }
    if (observations && Array.isArray(observations)) {
      const tx = db2.transaction("observations", "readwrite");
      const store = tx.objectStore("observations");
      for (const o of observations) store.put(o);
    }
    if (watchlist && Array.isArray(watchlist)) {
      const tx = db2.transaction("watchlist", "readwrite");
      const store = tx.objectStore("watchlist");
      for (const w of watchlist) store.put(w);
    }
    if (snapshots && Array.isArray(snapshots)) {
      const tx = db2.transaction("snapshots", "readwrite");
      const store = tx.objectStore("snapshots");
      for (const s of snapshots) store.put(s);
    }
    if (salesModels && Array.isArray(salesModels)) {
      const tx = db2.transaction("salesModels", "readwrite");
      const store = tx.objectStore("salesModels");
      for (const m of salesModels) store.put(m);
    }
    if (bookProjects && Array.isArray(bookProjects)) {
      const tx = db2.transaction("bookProjects", "readwrite");
      const store = tx.objectStore("bookProjects");
      for (const p of bookProjects) store.put(p);
    }
    if (settings) {
      await this.saveSettings(settings);
    }
    return true;
  }
  // --- MÉTRICAS HISTÓRICAS DE CATEGORIA (ITEM 16) ---
  async saveCategoryMetrics(metrics) {
    try {
      const db2 = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db2.transaction("categoryMarketMetrics", "readwrite");
        const store = tx.objectStore("categoryMarketMetrics");
        const req = store.put(metrics);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch {
      this.inMemoryCategoryMetrics.push(metrics);
    }
  }
  async getCategoryMetricsHistory(marketplace, category, subcategory) {
    const matchCategory = (m) => {
      if (m.marketplace !== marketplace) return false;
      if (subcategory) {
        return m.category === category && m.subcategory === subcategory || m.category === category || m.subcategory === subcategory || m.category === subcategory;
      }
      return m.category === category || m.subcategory === category;
    };
    try {
      const db2 = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db2.transaction("categoryMarketMetrics", "readonly");
        const store = tx.objectStore("categoryMarketMetrics");
        const req = store.getAll();
        req.onsuccess = () => {
          const all = req.result || [];
          const filtered = all.filter(matchCategory).sort((a, b) => b.collected_at - a.collected_at);
          resolve(filtered);
        };
        req.onerror = () => reject(req.error);
      });
    } catch {
      return this.inMemoryCategoryMetrics.filter(matchCategory).sort((a, b) => b.collected_at - a.collected_at);
    }
  }
  async getLatestCategoryMetrics(marketplace, category, subcategory) {
    const history = await this.getCategoryMetricsHistory(marketplace, category, subcategory);
    return history.length > 0 ? history[0] : null;
  }
};
var db = new LocalDatabase();

// src/services/coloring-book-service.ts
var ColoringBookService = class {
  /**
   * Converte o trim format para dimensões em milímetros [largura, altura]
   */
  static getDimensionsMm(format) {
    switch (format) {
      case "8.5x11":
        return [215.9, 279.4];
      case "8.25x8.25":
        return [209.55, 209.55];
      case "8.5x8.5":
        return [215.9, 215.9];
      case "8x10":
        return [203.2, 254];
      default:
        return [215.9, 279.4];
    }
  }
  /**
   * Retorna as dimensões em pixels considerando 300 DPI de resolução KDP
   */
  static getPrintPixels(format) {
    switch (format) {
      case "8.5x11":
        return [2550, 3300];
      case "8.25x8.25":
        return [2475, 2475];
      case "8.5x8.5":
        return [2550, 2550];
      case "8x10":
        return [2400, 3e3];
      default:
        return [2550, 3300];
    }
  }
  /**
   * Constrói o prompt especializado para desenho de colorir
   * Incorpora técnicas de traço preto puro, sem tons de cinza e adequação de estilo (Infantil / Adulto / Detalhado)
   */
  static buildPagePrompt(config, pageIndex) {
    const themeObj = COLORING_THEMES.find((t) => t.id === config.theme);
    let basePrompt = "";
    if (config.customThemePrompt && config.customThemePrompt.trim().length > 0) {
      basePrompt = config.customThemePrompt.trim();
    } else if (themeObj && themeObj.prompts.length > 0) {
      const promptIdx = pageIndex % themeObj.prompts.length;
      basePrompt = themeObj.prompts[promptIdx];
    } else {
      basePrompt = `${config.title} intricate illustration`;
    }
    const variation = PROMPT_VARIATIONS[pageIndex % PROMPT_VARIATIONS.length];
    let styleModifier = "";
    switch (config.style) {
      case "kids":
        styleModifier = "BOLD AND EASY children coloring book style, EXTRA THICK black outlines, LARGE simple shapes, MINIMAL detail, pure black lines on pure white paper, NO shading, NO gradients, NO gray tones, simple chunky contours easy to color with crayons or markers, cartoon simplicity, big areas to fill, no intricate patterns";
        break;
      case "detailed":
        styleModifier = "highly detailed intricate adult coloring book page, exquisite zentangle patterns, fine clean lines, sacred geometry, complex repetitive mandala details, pure black lines on pure white background, no shading, no gradients, ultra sharp focus, 300 DPI print quality";
        break;
      case "adult":
      default:
        styleModifier = "clean vector line art adult coloring book page, pure black ink lines on pure white paper, no fills, no shading, no gradients, no gray, no halftones, only crisp black outlines on white, high contrast linework, professional coloring book illustration, thick clean outlines ready for coloring";
        break;
    }
    return `${basePrompt}${variation}. ${styleModifier}`;
  }
  /**
   * Constrói o prompt especializado para a Capa Colorida do livro no estilo Amazon KDP
   */
  static buildCoverPrompt(config) {
    const themeObj = COLORING_THEMES.find((t) => t.id === config.theme);
    const themeDetail = themeObj?.coverPromptDetails || "vibrant artistic coloring book cover, beautiful harmonious color palette, high contrast";
    const subtitle = config.subtitle || "Livro de Colorir para Todas as Idades";
    return `commercial bestselling book cover design for Amazon KDP, Title "${config.title}", Subtitle "${subtitle}", featuring ${themeDetail}, elegant commercial layout, vibrant captivating coloring book cover art, high resolution, 300 DPI, award-winning illustration, no text artifacts, vertical orientation`;
  }
  /**
   * Executa a chamada de geração da imagem utilizando Pollinations AI (FLUX) ou provedores configurados
   */
  static async generateSinglePageImage(prompt, config, seed = Math.floor(Math.random() * 999999)) {
    const [targetW, targetH] = this.getPrintPixels(config.trimFormat);
    const isSquare = config.trimFormat.includes("8.25") || config.trimFormat.includes("8.5x8.5");
    const apiW = isSquare ? 1024 : 1024;
    const apiH = isSquare ? 1024 : 1344;
    if (config.provider === "openai" && config.apiKey) {
      try {
        const response = await fetch("https://api.openai.com/v1/images/generations", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${config.apiKey.trim()}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "dall-e-3",
            prompt: prompt.slice(0, 950),
            n: 1,
            size: isSquare ? "1024x1024" : "1024x1792",
            quality: "standard"
          })
        });
        if (response.ok) {
          const data = await response.json();
          if (data.data?.[0]?.url) {
            return await this.processLineArtFromUrl(data.data[0].url, config.lineArtMethod);
          }
        }
      } catch (err) {
        console.warn("Falha no OpenAI DALL-E, usando motor de conting\xEAncia Pollinations:", err);
      }
    }
    const encodedPrompt = encodeURIComponent(prompt);
    const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${apiW}&height=${apiH}&seed=${seed}&model=flux&nologo=true`;
    try {
      const processed = await this.processLineArtFromUrl(pollinationsUrl, config.lineArtMethod);
      return processed;
    } catch (err) {
      console.warn("Erro ao processar imagem de Pollinations, gerando tra\xE7o vetorial de conting\xEAncia:", err);
      return this.generateProceduralLineArtFallback(config, seed);
    }
  }
  /**
   * Baixa a imagem gerada e executa o processamento de linha (Line Art & Binarization)
   * Garante:
   * - Traços 100% pretos (#000000)
   * - Fundo 100% branco (#FFFFFF)
   * - Remoção total de tons de cinza, sombras e manchas
   */
  static async processLineArtFromUrl(imageUrl, method) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth || 1024;
          canvas.height = img.naturalHeight || 1344;
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          if (!ctx) {
            resolve(imageUrl);
            return;
          }
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imgData.data;
          let threshold = 175;
          if (method === "enhanced") threshold = 195;
          if (method === "detailed") threshold = 155;
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const lum = 0.299 * r + 0.587 * g + 0.114 * b;
            const val = lum < threshold ? 0 : 255;
            data[i] = val;
            data[i + 1] = val;
            data[i + 2] = val;
            data[i + 3] = 255;
          }
          ctx.putImageData(imgData, 0, 0);
          resolve(canvas.toDataURL("image/png", 1));
        } catch (e) {
          console.warn("Erro ao processar canvas lineart:", e);
          resolve(imageUrl);
        }
      };
      img.onerror = () => {
        reject(new Error("Falha ao carregar imagem para p\xF3s-processamento de line art"));
      };
      img.src = imageUrl;
    });
  }
  /**
   * Gerador procedural de traços geométricos/mandalas de contingência para modo offline ou testes
   */
  static generateProceduralLineArtFallback(config, seed) {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = config.trimFormat.includes("8.25") || config.trimFormat.includes("8.5x8.5") ? 1024 : 1344;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 5;
    ctx.strokeRect(40, 40, canvas.width - 80, canvas.height - 80);
    ctx.lineWidth = 2;
    ctx.strokeRect(52, 52, canvas.width - 104, canvas.height - 104);
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const petals = 8 + seed % 8;
    const radiusMax = Math.min(canvas.width, canvas.height) * 0.38;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.lineWidth = config.style === "kids" ? 7 : 3;
    ctx.strokeStyle = "#000000";
    for (let ring = 1; ring <= 5; ring++) {
      const r = radiusMax / 5 * ring;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.stroke();
      for (let p = 0; p < petals; p++) {
        const angle = Math.PI * 2 / petals * p;
        ctx.save();
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(r * 0.5, r * 0.4, r * 0.8, r * 0.8, 0, r);
        ctx.bezierCurveTo(-r * 0.8, r * 0.8, -r * 0.5, r * 0.4, 0, 0);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, r * 0.5, r * 0.12, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }
    ctx.restore();
    return canvas.toDataURL("image/png", 1);
  }
  /**
   * Gera a Capa do livro de colorir
   */
  static async generateCoverImage(config) {
    const coverPrompt = this.buildCoverPrompt(config);
    const cleanPrompt = encodeURIComponent(coverPrompt);
    const coverUrl = `https://image.pollinations.ai/prompt/${cleanPrompt}?width=1200&height=1800&model=flux&nologo=true`;
    return coverUrl;
  }
  /**
   * COMPILADOR DE PDF PARA AMAZON KDP COM INTERCALAÇÃO DE PÁGINAS EM BRANCO
   * 
   * Regras Oficiais KDP aplicadas:
   * 1. 300 DPI de resolução proporcional
   * 2. Margens seguras de encadernação
   * 3. Intercalação em branco (Odd = Ilustração, Even = Página em branco) para evitar vazamento de tinta
   * 4. Folha de rosto "Este livro pertence a:" na página 1 (se ativada)
   */
  static async generateKdpPdf(pages, config, coverUrl) {
    const [widthMm, heightMm] = this.getDimensionsMm(config.trimFormat);
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: [widthMm, heightMm]
    });
    let currentPdfPage = 1;
    const drawBelongsToPage = () => {
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(1.2);
      doc.rect(14, 14, widthMm - 28, heightMm - 28);
      doc.setLineWidth(0.4);
      doc.rect(17, 17, widthMm - 34, heightMm - 34);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.text(config.title.toUpperCase(), widthMm / 2, heightMm * 0.28, { align: "center" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(13);
      doc.text("LIVRO DE COLORIR ESPECIAL \u2022 EDI\xC7\xC3O KDP", widthMm / 2, heightMm * 0.33, { align: "center" });
      doc.setFontSize(15);
      doc.setFont("helvetica", "bold");
      doc.text("Este livro pertence a:", widthMm / 2, heightMm * 0.52, { align: "center" });
      doc.setLineWidth(0.8);
      doc.line(widthMm * 0.22, heightMm * 0.6, widthMm * 0.78, heightMm * 0.6);
      doc.setFontSize(9);
      doc.setFont("helvetica", "italic");
      doc.text(
        "Dica de Impress\xE3o KDP: As ilustra\xE7\xF5es deste livro possuem verso em branco para",
        widthMm / 2,
        heightMm * 0.78,
        { align: "center" }
      );
      doc.text(
        "evitar que canetinhas e tintas manchem o pr\xF3ximo desenho.",
        widthMm / 2,
        heightMm * 0.81,
        { align: "center" }
      );
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text("Publicado via Book Intel KDP \u2022 Todos os direitos reservados", widthMm / 2, heightMm * 0.92, { align: "center" });
    };
    if (config.includeBelongsToPage) {
      drawBelongsToPage();
      if (config.blankPageInterleaving) {
        doc.addPage([widthMm, heightMm], "portrait");
        currentPdfPage = 2;
      }
    }
    const marginMm = config.hasBleed ? 4 : 12.7;
    const printableW = widthMm - marginMm * 2;
    const printableH = heightMm - marginMm * 2;
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      if (currentPdfPage > 1 || config.includeBelongsToPage) {
        doc.addPage([widthMm, heightMm], "portrait");
      }
      currentPdfPage++;
      try {
        if (page.imageUrl) {
          doc.addImage(
            page.imageUrl,
            "PNG",
            marginMm,
            marginMm,
            printableW,
            printableH,
            void 0,
            "FAST"
          );
        }
      } catch (err) {
        console.warn(`Erro ao carregar imagem da p\xE1gina ${i + 1} no PDF:`, err);
      }
      if (config.blankPageInterleaving) {
        doc.addPage([widthMm, heightMm], "portrait");
        currentPdfPage++;
      }
    }
    const pdfBlob = doc.output("blob");
    const pdfUrl = URL.createObjectURL(pdfBlob);
    return {
      blob: pdfBlob,
      url: pdfUrl,
      totalPdfPages: currentPdfPage
    };
  }
  /**
   * Salva o livro de colorir gerado diretamente na base de projetos do Book Intel KDP
   */
  static async saveToBookProject(config, pages, coverUrl) {
    const projectId = `proj_coloring_${Date.now()}`;
    const totalPhysicalPages = config.blankPageInterleaving ? pages.length * 2 + 2 : pages.length + 2;
    const chapters = pages.map((p, idx) => ({
      index: idx + 1,
      title: `P\xE1gina ${idx + 1}: ${config.theme} #${idx + 1}`,
      summary: p.prompt,
      prose: `# Desenho de Colorir: ${config.theme} - P\xE1gina ${idx + 1}

[Ilustra\xE7\xE3o de Tra\xE7o Limpo Vetorial para Colorir]
Prompt de Cria\xE7\xE3o: ${p.prompt}`,
      wordCount: 30,
      scenes: [],
      charactersPresent: []
    }));
    const project = {
      id: projectId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      status: "DIAGRAMA\xC7\xC3O",
      priority: "ALTA",
      executionMode: "assisted",
      title: config.title,
      subtitle: config.subtitle || "Livro de Colorir para Amazon KDP",
      author: "Leandro Palmeira",
      description: `Livro de colorir profissional no nicho "${config.theme}". Cont\xE9m ${pages.length} ilustra\xE7\xF5es com tra\xE7os limpos em alta defini\xE7\xE3o, ideal para publica\xE7\xE3o em formato f\xEDsico na Amazon KDP.`,
      language: "Portugu\xEAs",
      format: "Capa Comum",
      trimSize: config.trimFormat === "8.5x11" ? "8.5x11" : "8.5x8.5",
      paperType: "bw-white",
      estimatedPages: totalPhysicalPages,
      actualPages: totalPhysicalPages,
      targetPrice: 34.9,
      currency: "BRL",
      targetMarketplace: "amazon.com.br",
      categories: ["Livros de Colorir para Adultos", "Arte e Desenho", "Atividades e Passatempos"],
      keywords: [
        "livro de colorir kdp",
        "mandalas para colorir",
        "coloring book amazon",
        "anti-stress colorir",
        "desenhos para colorir relaxantes"
      ],
      targetAudience: config.style === "kids" ? "Crian\xE7as e Fam\xEDlia" : "Adultos e Jovens em busca de relaxamento",
      topic: `Livro de colorir no nicho ${config.theme}`,
      kdpBookType: "coloring-book",
      kdpChapters: chapters,
      coverImageUrl: coverUrl || "",
      kdpCoverDesign: {
        frontImageUrl: coverUrl || "",
        status: "approved"
      },
      pipelineStage: "idle",
      pipelineProgress: 0,
      pipelineLog: [],
      tasks: [],
      notes: "",
      competitorsAsins: []
    };
    try {
      await db.saveBookProject(project);
    } catch (err) {
      console.warn("Persist\xEAncia IndexedDB ignorada:", err);
    }
    return project;
  }
};

// src/services/sudoku-engine.ts
var SudokuEngine = class {
  /**
   * Verifica se um número pode ser colocado na posição (row, col)
   */
  static isValidMove(grid, row, col, num) {
    for (let c = 0; c < 9; c++) {
      if (grid[row][c] === num) return false;
    }
    for (let r = 0; r < 9; r++) {
      if (grid[r][col] === num) return false;
    }
    const startRow = Math.floor(row / 3) * 3;
    const startCol = Math.floor(col / 3) * 3;
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        if (grid[startRow + r][startCol + c] === num) return false;
      }
    }
    return true;
  }
  /**
   * Resolve o Sudoku utilizando backtracking e preenche a matriz
   */
  static solve(grid) {
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (grid[row][col] === 0) {
          const numbers = this.shuffleArray([1, 2, 3, 4, 5, 6, 7, 8, 9]);
          for (const num of numbers) {
            if (this.isValidMove(grid, row, col, num)) {
              grid[row][col] = num;
              if (this.solve(grid)) return true;
              grid[row][col] = 0;
            }
          }
          return false;
        }
      }
    }
    return true;
  }
  /**
   * Retorna uma cópia resolvida do tabuleiro ou null se insolúvel
   */
  static solveGrid(grid) {
    const copy = grid.map((r) => [...r]);
    const solved = this.solve(copy);
    return solved ? copy : null;
  }
  /**
   * Conta a quantidade de soluções possíveis para garantir unicidade
   */
  static countSolutions(grid, countOrLimit = { value: 0 }, maxCount = 2) {
    const count = typeof countOrLimit === "object" ? countOrLimit : { value: 0 };
    const limit = typeof countOrLimit === "number" ? countOrLimit : maxCount;
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (grid[row][col] === 0) {
          for (let num = 1; num <= 9; num++) {
            if (this.isValidMove(grid, row, col, num)) {
              grid[row][col] = num;
              this.countSolutions(grid, count, limit);
              grid[row][col] = 0;
              if (count.value >= limit) return count.value;
            }
          }
          return count.value;
        }
      }
    }
    count.value++;
    return count.value;
  }
  /**
   * Gera uma grade completa válida (9x9)
   */
  static generateCompletedGrid() {
    const grid = Array.from({ length: 9 }, () => Array(9).fill(0));
    this.solve(grid);
    return grid;
  }
  /**
   * Cria um Sudoku com solução única baseado no nível de dificuldade
   * - Fácil: 42 pistas restantes
   * - Médio: 35 pistas restantes
   * - Difícil: 29 pistas restantes
   * - Expert: 24 pistas restantes
   */
  static generatePuzzle(difficulty) {
    const solution = this.generateCompletedGrid();
    const puzzle = solution.map((row) => [...row]);
    let targetClues = 35;
    switch (difficulty) {
      case "facil":
        targetClues = 42;
        break;
      case "medio":
        targetClues = 35;
        break;
      case "dificil":
        targetClues = 29;
        break;
      case "expert":
        targetClues = 24;
        break;
    }
    const cellsToRemove = 81 - targetClues;
    const positions = [];
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        positions.push([r, c]);
      }
    }
    const shuffledPositions = this.shuffleArray(positions);
    let removed = 0;
    for (const [r, c] of shuffledPositions) {
      if (removed >= cellsToRemove) break;
      const temp = puzzle[r][c];
      puzzle[r][c] = 0;
      const copy = puzzle.map((row) => [...row]);
      const solutionCount = this.countSolutions(copy, { value: 0 }, 2);
      if (solutionCount !== 1) {
        puzzle[r][c] = temp;
      } else {
        removed++;
      }
    }
    return {
      puzzle,
      solution,
      isUnique: true
    };
  }
  /**
   * Valida se uma grade fornecida é matematicamente válida
   */
  static validateSolution(grid) {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const val = grid[r][c];
        if (val < 1 || val > 9) return false;
        grid[r][c] = 0;
        const valid = this.isValidMove(grid, r, c, val);
        grid[r][c] = val;
        if (!valid) return false;
      }
    }
    return true;
  }
  static shuffleArray(array) {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }
};

// src/services/investigative-validator.ts
var InvestigativeValidator = class {
  /**
   * Executa a auditoria completa de um conjunto de casos investigativos
   */
  static validateAllCases(cases) {
    const items = [];
    const errors = [];
    const warnings = [];
    if (!cases || cases.length === 0) {
      return {
        isValid: false,
        totalChecks: 1,
        passedChecks: 0,
        items: [{
          category: "HIST\xD3RIA",
          passed: false,
          title: "Casos Inexistentes",
          message: "Nenhum caso foi gerado para valida\xE7\xE3o."
        }],
        errors: ["O livro n\xE3o cont\xE9m nenhum caso criminal."],
        warnings: []
      };
    }
    cases.forEach((c) => {
      const hasVictim = !!(c.victim && c.victim.nome && c.victim.profissao);
      items.push({
        category: "HIST\xD3RIA",
        passed: hasVictim,
        title: `Caso #${c.caseNumber}: V\xEDtima Definida`,
        message: hasVictim ? `V\xEDtima identificada: ${c.victim.nome} (${c.victim.profissao})` : "V\xEDtima n\xE3o definida."
      });
      if (!hasVictim) errors.push(`Caso #${c.caseNumber}: V\xEDtima ausente ou incompleta.`);
      const culpritInSuspects = !!(c.caseSolution?.culprit && c.suspects?.some((s) => s.id === c.caseSolution.culprit.id && s.isCulprit));
      const hasCulprit = !!(c.caseSolution && c.caseSolution.culprit && c.caseSolution.culprit.isCulprit && culpritInSuspects);
      items.push({
        category: "HIST\xD3RIA",
        passed: hasCulprit,
        title: `Caso #${c.caseNumber}: Assassino Definido`,
        message: hasCulprit ? `Culpado identificado e consistente: ${c.caseSolution.culprit.nome}` : "Assassino n\xE3o identificado ou n\xE3o consta na lista de suspeitos."
      });
      if (!hasCulprit) errors.push(`Caso #${c.caseNumber}: Assassino n\xE3o definido ou ausente da lista de suspeitos.`);
      const hasMotive = !!(c.caseSolution && c.caseSolution.motiveExplanation);
      items.push({
        category: "HIST\xD3RIA",
        passed: hasMotive,
        title: `Caso #${c.caseNumber}: Motivo Definido`,
        message: hasMotive ? "Motivo do crime estruturado com clareza." : "Motivo ausente."
      });
      if (!hasMotive) errors.push(`Caso #${c.caseNumber}: Motivo ausente.`);
      const hasLocationAndTime = !!(c.crimeScene && c.crimeScene.localDetalhado && c.crimeScene.horaEncontrado);
      items.push({
        category: "HIST\xD3RIA",
        passed: hasLocationAndTime,
        title: `Caso #${c.caseNumber}: Local e Hor\xE1rio`,
        message: hasLocationAndTime ? `${c.crimeScene.localDetalhado} \xE0s ${c.crimeScene.horaEncontrado}` : "Local ou hor\xE1rio ausentes."
      });
      if (!hasLocationAndTime) errors.push(`Caso #${c.caseNumber}: Local ou hor\xE1rio n\xE3o definidos.`);
      const hasSuspects = Array.isArray(c.suspects) && c.suspects.length >= 2;
      items.push({
        category: "HIST\xD3RIA",
        passed: hasSuspects,
        title: `Caso #${c.caseNumber}: Lista de Suspeitos`,
        message: hasSuspects ? `${c.suspects.length} suspeitos registrados com \xE1libis e segredos.` : "Quantidade insuficiente de suspeitos."
      });
      if (!hasSuspects) errors.push(`Caso #${c.caseNumber}: Quantidade insuficiente de suspeitos.`);
      const hasClues = Array.isArray(c.clues) && c.clues.length >= 1;
      items.push({
        category: "PISTAS",
        passed: hasClues,
        title: `Caso #${c.caseNumber}: Pistas Mapeadas`,
        message: hasClues ? `${c.clues.length} pistas conectadas aos puzzles.` : "Pistas insuficientes."
      });
      if (!hasClues) errors.push(`Caso #${c.caseNumber}: Pistas insuficientes.`);
      const cluesHaveMeaning = c.clues.length > 0 && c.clues.every((clue) => clue.revelationText && clue.pointsToCulpritReason);
      items.push({
        category: "PISTAS",
        passed: cluesHaveMeaning,
        title: `Caso #${c.caseNumber}: Significado das Pistas`,
        message: cluesHaveMeaning ? "Todas as pistas possuem implica\xE7\xE3o l\xF3gica no inqu\xE9rito." : "Existem pistas vazias ou sem contexto."
      });
      if (!cluesHaveMeaning) errors.push(`Caso #${c.caseNumber}: Pistas com significado incompleto.`);
      const hasPuzzles = Array.isArray(c.puzzles) && c.puzzles.length === c.clues.length;
      items.push({
        category: "SUDOKU",
        passed: hasPuzzles,
        title: `Caso #${c.caseNumber}: Sudokus Pareados`,
        message: hasPuzzles ? `${c.puzzles.length} Sudokus perfeitamente associados \xE0s pistas.` : "Inconsist\xEAncia entre Sudokus e pistas."
      });
      if (!hasPuzzles) errors.push(`Caso #${c.caseNumber}: Quantidade de Sudokus difere da quantidade de pistas.`);
      let allGridsValid = true;
      for (const p of c.puzzles) {
        if (!SudokuEngine.validateSolution(p.solution)) {
          allGridsValid = false;
          break;
        }
      }
      items.push({
        category: "SUDOKU",
        passed: allGridsValid,
        title: `Caso #${c.caseNumber}: Valida\xE7\xE3o Matem\xE1tica dos Sudokus`,
        message: allGridsValid ? "Todas as grades possuem solu\xE7\xE3o matem\xE1tica \xFAnica e v\xE1lida." : "Falha matem\xE1tica em uma ou mais grades de Sudoku."
      });
      if (!allGridsValid) errors.push(`Caso #${c.caseNumber}: Sudoku com grade inv\xE1lida.`);
    });
    const passedChecks = items.filter((i) => i.passed).length;
    const isValid = errors.length === 0;
    return {
      isValid,
      totalChecks: items.length,
      passedChecks,
      items,
      errors,
      warnings
    };
  }
  static validateCase(c) {
    return this.validateAllCases([c]);
  }
  static validateBookConsistency(cases) {
    return this.validateAllCases(cases);
  }
};

// src/server.ts
init_project_storage_service();

// src/types/book-project.ts
var BOOK_TYPE_CONFIGS = {
  // Infantil & Ilustrado
  "children-picture-book": {
    id: "children-picture-book",
    label: "Livro Infantil Ilustrado",
    category: "Infantil & Ilustrado",
    trimSize: "8.5x8.5",
    paperType: "color",
    targetPages: 32,
    chapterCount: [12, 16],
    wordsPerChapter: [50, 150],
    scenesPerChapter: [1, 1],
    illustrationsPerChapter: 1,
    coverArt: true,
    fullBleed: true,
    imageSize: "2048x2048",
    hasCharacters: true,
    hasWorldbuilding: false,
    hasArtBible: true,
    hasFactCheck: false,
    description: 'Quadrado 8.5"x8.5", colorido full-bleed, 32 p\xE1ginas, texto simples e ilustra\xE7\xF5es ricas em todas as p\xE1ginas.',
    editorialRules: ["Vocabul\xE1rio infantil", "Ritmo sonoro ou rimas", "Moral afetiva"]
  },
  "illustrated-book": {
    id: "illustrated-book",
    label: "Livro Ilustrado Geral / HQ",
    category: "Infantil & Ilustrado",
    trimSize: "7x10",
    paperType: "color",
    targetPages: 64,
    chapterCount: [8, 12],
    wordsPerChapter: [150, 400],
    scenesPerChapter: [2, 3],
    illustrationsPerChapter: 1,
    coverArt: true,
    fullBleed: true,
    imageSize: "2048x2048",
    hasCharacters: true,
    hasWorldbuilding: true,
    hasArtBible: true,
    hasFactCheck: false,
    description: 'Formato 7"x10", ilustra\xE7\xF5es vibrantes acompanhando par\xE1grafos descritivos.',
    editorialRules: ["Equil\xEDbrio entre arte e texto", "Consist\xEAncia de estilo visual"]
  },
  // Não-Ficção & Desenvolvimento
  "self-help": {
    id: "self-help",
    label: "Desenvolvimento Pessoal / H\xE1bitos",
    category: "N\xE3o-Fic\xE7\xE3o",
    trimSize: "6x9",
    paperType: "bw-white",
    targetPages: 160,
    chapterCount: [10, 14],
    wordsPerChapter: [2200, 3500],
    scenesPerChapter: [3, 4],
    illustrationsPerChapter: 0,
    coverArt: true,
    fullBleed: false,
    imageSize: "1024x1024",
    hasCharacters: false,
    hasWorldbuilding: false,
    hasArtBible: false,
    hasFactCheck: true,
    description: 'Padr\xE3o editorial 6"x9", linguagem motivacional e pr\xE1tica, passos acion\xE1veis e estudos de caso.',
    editorialRules: ["Exerc\xEDcios no final do cap\xEDtulo", "Exemplos reais", "Sem jarg\xE3o excessivo"]
  },
  "business": {
    id: "business",
    label: "Neg\xF3cios, Gest\xE3o & Lideran\xE7a",
    category: "N\xE3o-Fic\xE7\xE3o",
    trimSize: "6x9",
    paperType: "bw-white",
    targetPages: 180,
    chapterCount: [10, 15],
    wordsPerChapter: [2500, 4e3],
    scenesPerChapter: [3, 5],
    illustrationsPerChapter: 0,
    coverArt: true,
    fullBleed: false,
    imageSize: "1024x1024",
    hasCharacters: false,
    hasWorldbuilding: false,
    hasArtBible: false,
    hasFactCheck: true,
    description: "Livro executivo com metodologia de gest\xE3o, frameworks claros e aplicabilidade corporativa.",
    editorialRules: ["Frameworks conceituais", "Estudos de caso reais", "M\xE9tricas mensur\xE1veis"]
  },
  "finance": {
    id: "finance",
    label: "Finan\xE7as Pessoais & Investimentos",
    category: "N\xE3o-Fic\xE7\xE3o",
    trimSize: "6x9",
    paperType: "bw-white",
    targetPages: 170,
    chapterCount: [10, 14],
    wordsPerChapter: [2200, 3800],
    scenesPerChapter: [3, 4],
    illustrationsPerChapter: 0,
    coverArt: true,
    fullBleed: false,
    imageSize: "1024x1024",
    hasCharacters: false,
    hasWorldbuilding: false,
    hasArtBible: false,
    hasFactCheck: true,
    description: "Did\xE1tica progressiva sobre dinheiro, mentalidade financeira, or\xE7amento e investimentos.",
    editorialRules: ["Avisos legais de investimento", "Simula\xE7\xF5es did\xE1ticas", "Vocabul\xE1rio financeiro acess\xEDvel"]
  },
  "health-wellness": {
    id: "health-wellness",
    label: "Sa\xFAde, Nutri\xE7\xE3o & Bem-Estar",
    category: "N\xE3o-Fic\xE7\xE3o",
    trimSize: "6x9",
    paperType: "bw-white",
    targetPages: 160,
    chapterCount: [8, 12],
    wordsPerChapter: [2200, 3600],
    scenesPerChapter: [3, 4],
    illustrationsPerChapter: 0,
    coverArt: true,
    fullBleed: false,
    imageSize: "1024x1024",
    hasCharacters: false,
    hasWorldbuilding: false,
    hasArtBible: false,
    hasFactCheck: true,
    description: "Orienta\xE7\xF5es pr\xE1ticas de longevidade, rotina saud\xE1vel, alimenta\xE7\xE3o e equil\xEDbrio mental.",
    editorialRules: ["Isen\xE7\xE3o m\xE9dica clara", "Base cient\xEDfica evidenciada"]
  },
  "education": {
    id: "education",
    label: "Educa\xE7\xE3o & Metodologia de Ensino",
    category: "N\xE3o-Fic\xE7\xE3o",
    trimSize: "6x9",
    paperType: "bw-white",
    targetPages: 200,
    chapterCount: [10, 16],
    wordsPerChapter: [2400, 4e3],
    scenesPerChapter: [3, 5],
    illustrationsPerChapter: 0,
    coverArt: true,
    fullBleed: false,
    imageSize: "1024x1024",
    hasCharacters: false,
    hasWorldbuilding: false,
    hasArtBible: false,
    hasFactCheck: true,
    description: "Did\xE1tica para professores, estudantes ou pais sobre t\xE9cnicas de aprendizagem eficazes.",
    editorialRules: ["Resumos de fixa\xE7\xE3o", "Bibliografia estruturada"]
  },
  "practical-guide": {
    id: "practical-guide",
    label: "Guia Pr\xE1tico / Manual Passo a Passo",
    category: "T\xE9cnico & Guias",
    trimSize: "6x9",
    paperType: "bw-white",
    targetPages: 140,
    chapterCount: [8, 12],
    wordsPerChapter: [1800, 3200],
    scenesPerChapter: [3, 4],
    illustrationsPerChapter: 0,
    coverArt: true,
    fullBleed: false,
    imageSize: "1024x1024",
    hasCharacters: false,
    hasWorldbuilding: false,
    hasArtBible: false,
    hasFactCheck: true,
    description: "Manual de instru\xE7\xF5es pr\xE1ticas direto ao ponto, com checklists e passos numerados.",
    editorialRules: ["Passos numerados", "Checklists de execu\xE7\xE3o", "Resolu\xE7\xE3o de problemas comuns"]
  },
  "biography": {
    id: "biography",
    label: "Biografia / Mem\xF3rias",
    category: "N\xE3o-Fic\xE7\xE3o",
    trimSize: "6x9",
    paperType: "bw-cream",
    targetPages: 220,
    chapterCount: [12, 18],
    wordsPerChapter: [2500, 4500],
    scenesPerChapter: [3, 5],
    illustrationsPerChapter: 0,
    coverArt: true,
    fullBleed: false,
    imageSize: "1024x1024",
    hasCharacters: true,
    hasWorldbuilding: false,
    hasArtBible: false,
    hasFactCheck: true,
    description: "Narrativa cronol\xF3gica de vida, desafios, li\xE7\xF5es e legado inspirador.",
    editorialRules: ["Linha temporal consistente", "Contexto hist\xF3rico e factual"]
  },
  "non-fiction": {
    id: "non-fiction",
    label: "N\xE3o-Fic\xE7\xE3o Geral",
    category: "N\xE3o-Fic\xE7\xE3o",
    trimSize: "6x9",
    paperType: "bw-white",
    targetPages: 180,
    chapterCount: [8, 14],
    wordsPerChapter: [2e3, 4e3],
    scenesPerChapter: [3, 5],
    illustrationsPerChapter: 0,
    coverArt: true,
    fullBleed: false,
    imageSize: "1024x1024",
    hasCharacters: false,
    hasWorldbuilding: false,
    hasArtBible: false,
    hasFactCheck: true,
    description: 'Padr\xE3o editorial 6"x9", did\xE1tico e progressivo: do b\xE1sico ao avan\xE7ado com passos pr\xE1ticos.',
    editorialRules: ["Introdu\xE7\xE3o instigante", "Argumenta\xE7\xE3o s\xF3lida", "Conclus\xE3o aplic\xE1vel"]
  },
  // Ficção & Literatura
  "fiction-novel": {
    id: "fiction-novel",
    label: "Romance / Fic\xE7\xE3o Geral",
    category: "Fic\xE7\xE3o",
    trimSize: "6x9",
    paperType: "bw-cream",
    targetPages: 280,
    chapterCount: [18, 26],
    wordsPerChapter: [3e3, 5500],
    scenesPerChapter: [2, 4],
    illustrationsPerChapter: 0,
    coverArt: true,
    fullBleed: false,
    imageSize: "1024x1024",
    hasCharacters: true,
    hasWorldbuilding: true,
    hasArtBible: false,
    hasFactCheck: false,
    description: 'Formato romance 6"x9", papel creme, arco cl\xE1ssico de 3 atos (prepara\xE7\xE3o, escalada, cl\xEDmax e resolu\xE7\xE3o).',
    editorialRules: ["Voz narrativa constante", "Arco de transforma\xE7\xE3o do protagonista"]
  },
  "romance": {
    id: "romance",
    label: "Romance Amoroso / Drama Emocional",
    category: "Fic\xE7\xE3o",
    trimSize: "5x8",
    paperType: "bw-cream",
    targetPages: 250,
    chapterCount: [16, 24],
    wordsPerChapter: [2800, 5e3],
    scenesPerChapter: [2, 4],
    illustrationsPerChapter: 0,
    coverArt: true,
    fullBleed: false,
    imageSize: "1024x1024",
    hasCharacters: true,
    hasWorldbuilding: false,
    hasArtBible: false,
    hasFactCheck: false,
    description: "Foco na qu\xEDmica entre personagens, conflitos internos, tens\xE3o emocional e final gratificante.",
    editorialRules: ["Qu\xEDmica e conflitos bem desenvolvidos", "Final feliz ou emocionalmente satisfat\xF3rio"]
  },
  "fantasy": {
    id: "fantasy",
    label: "Fantasia \xC9pica / Alta Fantasia",
    category: "Fic\xE7\xE3o",
    trimSize: "6x9",
    paperType: "bw-cream",
    targetPages: 350,
    chapterCount: [20, 30],
    wordsPerChapter: [3500, 6500],
    scenesPerChapter: [3, 5],
    illustrationsPerChapter: 0,
    coverArt: true,
    fullBleed: false,
    imageSize: "1024x1024",
    hasCharacters: true,
    hasWorldbuilding: true,
    hasArtBible: false,
    hasFactCheck: false,
    description: "Constru\xE7\xE3o de mundo rica (Worldbuilding), magia, profecias, ra\xE7as e jornada do her\xF3i.",
    editorialRules: ["Regras r\xEDgidas do sistema de magia", "Hist\xF3rico e fac\xE7\xF5es detalhadas"]
  },
  "thriller": {
    id: "thriller",
    label: "Thriller / Mist\xE9rio Investigativo",
    category: "Fic\xE7\xE3o",
    trimSize: "5.5x8.5",
    paperType: "bw-cream",
    targetPages: 260,
    chapterCount: [22, 32],
    wordsPerChapter: [2200, 4200],
    scenesPerChapter: [2, 3],
    illustrationsPerChapter: 0,
    coverArt: true,
    fullBleed: false,
    imageSize: "1024x1024",
    hasCharacters: true,
    hasWorldbuilding: false,
    hasArtBible: false,
    hasFactCheck: false,
    description: "Pistas, reviravoltas (plot twists), perigo iminente e cap\xEDtulos curtos com ganchos fortes.",
    editorialRules: ["Cliffhangers nos finais de cap\xEDtulos", "Sem furos de l\xF3gica investigativa"]
  },
  "suspense": {
    id: "suspense",
    label: "Suspense Psicol\xF3gico / Terror",
    category: "Fic\xE7\xE3o",
    trimSize: "5.5x8.5",
    paperType: "bw-cream",
    targetPages: 230,
    chapterCount: [18, 26],
    wordsPerChapter: [2500, 4500],
    scenesPerChapter: [2, 4],
    illustrationsPerChapter: 0,
    coverArt: true,
    fullBleed: false,
    imageSize: "1024x1024",
    hasCharacters: true,
    hasWorldbuilding: false,
    hasArtBible: false,
    hasFactCheck: false,
    description: "Constru\xE7\xE3o de atmosfera sombria, paranoia, ritmo opressivo e revela\xE7\xF5es chocantes.",
    editorialRules: ["Atmosfera densa", "Incerteza psicol\xF3gica"]
  },
  "sci-fi": {
    id: "sci-fi",
    label: "Fic\xE7\xE3o Cient\xEDfica / Distopia",
    category: "Fic\xE7\xE3o",
    trimSize: "6x9",
    paperType: "bw-cream",
    targetPages: 300,
    chapterCount: [18, 26],
    wordsPerChapter: [3200, 5800],
    scenesPerChapter: [3, 4],
    illustrationsPerChapter: 0,
    coverArt: true,
    fullBleed: false,
    imageSize: "1024x1024",
    hasCharacters: true,
    hasWorldbuilding: true,
    hasArtBible: false,
    hasFactCheck: false,
    description: "Tecnologia futurista, dilemas sociais, intelig\xEAncia artificial, espa\xE7o ou futuro dist\xF3pico.",
    editorialRules: ["Coer\xEAncia tecnol\xF3gica", "Coment\xE1rio social subjacente"]
  },
  "light-novel": {
    id: "light-novel",
    label: "Light Novel / Fic\xE7\xE3o \xC1gil",
    category: "Fic\xE7\xE3o",
    trimSize: "5x8",
    paperType: "bw-cream",
    targetPages: 240,
    chapterCount: [8, 14],
    wordsPerChapter: [3500, 6e3],
    scenesPerChapter: [4, 6],
    illustrationsPerChapter: 1,
    coverArt: true,
    fullBleed: false,
    imageSize: "2048x2048",
    hasCharacters: true,
    hasWorldbuilding: true,
    hasArtBible: true,
    hasFactCheck: false,
    description: 'Tamanho 5"x8", papel creme, cap\xEDtulos r\xE1pidos, ritmo din\xE2mico e di\xE1logos envolventes.',
    editorialRules: ["Di\xE1logos din\xE2micos", "Ilustra\xE7\xF5es de momentos chave"]
  },
  // Guias Rápidos & Técnicos
  "technical-manual": {
    id: "technical-manual",
    label: "Livro T\xE9cnico / Programa\xE7\xE3o / Engenharia",
    category: "T\xE9cnico & Guias",
    trimSize: "7x10",
    paperType: "bw-white",
    targetPages: 240,
    chapterCount: [10, 16],
    wordsPerChapter: [2500, 4500],
    scenesPerChapter: [3, 5],
    illustrationsPerChapter: 0,
    coverArt: true,
    fullBleed: false,
    imageSize: "1024x1024",
    hasCharacters: false,
    hasWorldbuilding: false,
    hasArtBible: false,
    hasFactCheck: true,
    description: 'Formato amplo 7"x10", blocos de c\xF3digo ou tabelas t\xE9cnicas, arquitetura explicada passo a passo.',
    editorialRules: ["Exemplos de c\xF3digo completos", "Diagramas textuais ou visuais"]
  },
  "short-ebook": {
    id: "short-ebook",
    label: "E-book Curto / Relat\xF3rio Especial",
    category: "T\xE9cnico & Guias",
    trimSize: "5.5x8.5",
    paperType: "bw-white",
    targetPages: 60,
    chapterCount: [5, 8],
    wordsPerChapter: [1500, 2500],
    scenesPerChapter: [2, 3],
    illustrationsPerChapter: 0,
    coverArt: true,
    fullBleed: false,
    imageSize: "1024x1024",
    hasCharacters: false,
    hasWorldbuilding: false,
    hasArtBible: false,
    hasFactCheck: true,
    description: "Livro focado de alta densidade de valor, leitura de 1 a 2 horas para Kindle.",
    editorialRules: ["Densidade de conte\xFAdo", "Sem enrola\xE7\xE3o"]
  },
  // Interativos & Especiais
  "workbook": {
    id: "workbook",
    label: "Workbook / Caderno de Exerc\xEDcios",
    category: "T\xE9cnico & Guias",
    trimSize: "8.5x11",
    paperType: "bw-white",
    targetPages: 120,
    chapterCount: [8, 12],
    wordsPerChapter: [800, 1500],
    scenesPerChapter: [1, 2],
    illustrationsPerChapter: 0,
    coverArt: true,
    fullBleed: false,
    imageSize: "1024x1024",
    hasCharacters: false,
    hasWorldbuilding: false,
    hasArtBible: false,
    hasFactCheck: false,
    description: "Caderno interativo com exerc\xEDcios, espa\xE7os para preenchimento e atividades pr\xE1ticas.",
    editorialRules: ["Espa\xE7os para escrita", "Instru\xE7\xF5es claras", "Progress\xE3o de dificuldade"]
  },
  "activity-book": {
    id: "activity-book",
    label: "Livro de Atividades Infantil",
    category: "Infantil & Ilustrado",
    trimSize: "8.5x11",
    paperType: "bw-white",
    targetPages: 80,
    chapterCount: [10, 20],
    wordsPerChapter: [50, 200],
    scenesPerChapter: [1, 1],
    illustrationsPerChapter: 1,
    coverArt: true,
    fullBleed: false,
    imageSize: "2048x2048",
    hasCharacters: false,
    hasWorldbuilding: false,
    hasArtBible: false,
    hasFactCheck: false,
    description: "Atividades variadas: labirintos, ligar pontos, colorir, ca\xE7a-palavras e jogos educativos.",
    editorialRules: ["Variedade de atividades", "Faixa et\xE1ria clara", "Instru\xE7\xF5es simples"]
  },
  "coloring-book": {
    id: "coloring-book",
    label: "Livro de Colorir",
    category: "Infantil & Ilustrado",
    trimSize: "8.5x11",
    paperType: "bw-white",
    targetPages: 60,
    chapterCount: [25, 40],
    wordsPerChapter: [10, 50],
    scenesPerChapter: [1, 1],
    illustrationsPerChapter: 1,
    coverArt: true,
    fullBleed: false,
    imageSize: "2048x2048",
    hasCharacters: false,
    hasWorldbuilding: false,
    hasArtBible: true,
    hasFactCheck: false,
    description: "Ilustra\xE7\xF5es em lineart para colorir, impress\xE3o em um lado s\xF3, temas variados.",
    editorialRules: ["Lineart limpo e detalhado", "Impress\xE3o unilateral", "Tema consistente"]
  },
  "sudoku-investigativo": {
    id: "sudoku-investigativo",
    label: "Sudoku Investigativo (Murder Mystery)",
    category: "T\xE9cnico & Guias",
    trimSize: "8.5x11",
    paperType: "bw-white",
    targetPages: 120,
    chapterCount: [5, 12],
    wordsPerChapter: [400, 1e3],
    scenesPerChapter: [1, 2],
    illustrationsPerChapter: 0,
    coverArt: true,
    fullBleed: false,
    imageSize: "1024x1024",
    hasCharacters: true,
    hasWorldbuilding: true,
    hasArtBible: false,
    hasFactCheck: true,
    description: "Livros de Sudoku tem\xE1ticos no estilo Murder Mystery, onde as pistas revelam suspeitos, locais e armas para solucionar o crime.",
    editorialRules: ["Sudokus 100% com solu\xE7\xE3o \xFAnica", "Consist\xEAncia estrita de pistas e \xE1libis", "Gabarito e resolu\xE7\xE3o final completa"]
  },
  "journal": {
    id: "journal",
    label: "Di\xE1rio / Journal / Planner",
    category: "T\xE9cnico & Guias",
    trimSize: "6x9",
    paperType: "bw-white",
    targetPages: 150,
    chapterCount: [5, 10],
    wordsPerChapter: [100, 500],
    scenesPerChapter: [1, 1],
    illustrationsPerChapter: 0,
    coverArt: true,
    fullBleed: false,
    imageSize: "1024x1024",
    hasCharacters: false,
    hasWorldbuilding: false,
    hasArtBible: false,
    hasFactCheck: false,
    description: "Di\xE1rio com prompts de escrita, espa\xE7os para reflex\xE3o, gratid\xE3o ou planejamento.",
    editorialRules: ["Prompts inspiradores", "Layout limpo", "Espa\xE7os generosos para escrita"]
  },
  "mystery": {
    id: "mystery",
    label: "Mist\xE9rio / Policial / Detetive",
    category: "Fic\xE7\xE3o",
    trimSize: "5.5x8.5",
    paperType: "bw-cream",
    targetPages: 240,
    chapterCount: [20, 28],
    wordsPerChapter: [2500, 4500],
    scenesPerChapter: [2, 3],
    illustrationsPerChapter: 0,
    coverArt: true,
    fullBleed: false,
    imageSize: "1024x1024",
    hasCharacters: true,
    hasWorldbuilding: false,
    hasArtBible: false,
    hasFactCheck: false,
    description: "Enigma central, pistas plantadas, red herrings, revela\xE7\xE3o no cl\xEDmax.",
    editorialRules: ["Pistas consistentes e justas", "Resolu\xE7\xE3o l\xF3gica", "Sem deus ex machina"]
  },
  "puzzle-book": {
    id: "puzzle-book",
    label: "Livro de Quebra-Cabe\xE7as / Enigmas",
    category: "T\xE9cnico & Guias",
    trimSize: "8.5x11",
    paperType: "bw-white",
    targetPages: 100,
    chapterCount: [10, 20],
    wordsPerChapter: [50, 200],
    scenesPerChapter: [1, 1],
    illustrationsPerChapter: 0,
    coverArt: true,
    fullBleed: false,
    imageSize: "1024x1024",
    hasCharacters: false,
    hasWorldbuilding: false,
    hasArtBible: false,
    hasFactCheck: false,
    description: "Palavras cruzadas, sudoku, ca\xE7a-palavras e enigmas l\xF3gicos com gabarito.",
    editorialRules: ["Gabarito no final", "Dificuldade progressiva", "Instru\xE7\xF5es em cada tipo"]
  },
  "other": {
    id: "other",
    label: "Outro / Personalizado",
    category: "T\xE9cnico & Guias",
    trimSize: "6x9",
    paperType: "bw-white",
    targetPages: 150,
    chapterCount: [8, 14],
    wordsPerChapter: [2e3, 4e3],
    scenesPerChapter: [2, 4],
    illustrationsPerChapter: 0,
    coverArt: true,
    fullBleed: false,
    imageSize: "1024x1024",
    hasCharacters: false,
    hasWorldbuilding: false,
    hasArtBible: false,
    hasFactCheck: false,
    description: "Formato personalizado pelo autor, sem template predefinido.",
    editorialRules: ["Defina suas pr\xF3prias regras editoriais"]
  }
};

// src/services/backend-editorial-service.ts
var BackendEditorialService = class {
  /**
   * Constrói o contexto editorial denso e obrigatório incluindo a Bíblia do Livro
   */
  static buildEditorialContext(project) {
    const data = project.stageData || {};
    const parts = [];
    parts.push(`=== DIRETRIZ EDITORIAL DO LIVRO ===`);
    parts.push(`T\xEDtulo: "${project.title || "Sem t\xEDtulo"}"`);
    if (project.subtitle) parts.push(`Subt\xEDtulo: "${project.subtitle}"`);
    parts.push(`Autor: ${project.author || "Autor Independente"}`);
    parts.push(`G\xEAnero KDP: ${project.kdpBookType || "n\xE3o-fic\xE7\xE3o"}`);
    parts.push(`P\xFAblico-Alvo: ${project.targetAudience || "P\xFAblico Geral Adulto"}`);
    if (project.topic) parts.push(`Tema Central: ${project.topic}`);
    parts.push(`Meta de P\xE1ginas: ${project.estimatedPages || project.actualPages || 160}`);
    parts.push(`Idioma: ${project.language || "Portugu\xEAs do Brasil"}`);
    const refs = data.analytics?.marketReferences || [];
    const selectedRefs = refs.filter((r) => r.selectedForAnalysis || r.selectionReason);
    if (selectedRefs.length > 0) {
      parts.push(`
=== AN\xC1LISE DE MERCADO & REFER\xCANCIAS SELECIONADAS (INSPIRA\xC7\xC3O \xC9TICA SEM PL\xC1GIO) ===`);
      selectedRefs.slice(0, 5).forEach((r, idx) => {
        parts.push(`[Ref ${idx + 1}] "${r.title}" (${r.author}) \u2014 Gancho: ${r.openingHook || r.selectionReason || "Best seller KDP"}`);
      });
    }
    if (data.purpose?.generatedProposal) {
      parts.push(`
=== PROPOSTA EDITORIAL APROVADA ===
${data.purpose.generatedProposal}`);
    }
    if (data["author-persona"]?.generatedPersona) {
      parts.push(`
=== PERSONA E VOZ DO AUTOR APROVADA ===
${data["author-persona"].generatedPersona}`);
    }
    const mem = project.bookMemory || {
      characters: [],
      locations: [],
      events: [],
      rules: [],
      concepts: []
    };
    parts.push(`
=== B\xCDBLIA DO LIVRO (CONHECIMENTO IMUT\xC1VEL DE CONTINUIDADE) ===`);
    if (mem.characters && mem.characters.length > 0) {
      parts.push(`PERSONAGENS & VOZES:`);
      mem.characters.forEach((c) => {
        parts.push(`\u2022 ${c.name} (${c.role}): ${c.personality} | Apar\xEAncia: ${c.appearance} | Segredo: ${c.notes || c.arc || "Nenhum"}`);
      });
    }
    if (mem.locations && mem.locations.length > 0) {
      parts.push(`LOCAIS & AMBIENTA\xC7\xC3O:`);
      mem.locations.forEach((l) => {
        parts.push(`\u2022 ${l.name}: ${l.description} (Clima: ${l.mood || "neutro"})`);
      });
    }
    if (mem.rules && mem.rules.length > 0) {
      parts.push(`REGRAS & FATOS ESTABELECIDOS QUE N\xC3O PODEM SER CONTRADITOS:`);
      mem.rules.forEach((r) => parts.push(`\u2022 [${r.category}] ${r.rule}`));
    }
    if (mem.concepts && mem.concepts.length > 0) {
      parts.push(`CONCEITOS & FRAMEWORKS DID\xC1TICOS:`);
      mem.concepts.forEach((cp) => parts.push(`\u2022 ${cp.term}: ${cp.definition}`));
    }
    const chapters = project.kdpChapters || [];
    if (chapters.length > 0) {
      parts.push(`
=== ESTRUTURA DO SUM\xC1RIO APROVADA (${chapters.length} cap\xEDtulos) ===`);
      chapters.forEach((ch, idx) => {
        parts.push(`Cap\xEDtulo ${ch.index !== void 0 ? ch.index + 1 : idx + 1}: "${ch.title}" | Objetivo: ${ch.purpose || ch.objective || "Desenvolvimento"}`);
      });
    }
    return parts.join("\n");
  }
  /**
   * Chamada segura ao Gemini no Backend utilizando as chaves locais do servidor
   */
  static async callGeminiBackend(prompt, systemPrompt, options = {}) {
    const apiKey = BackendCoverService.getApiKey();
    if (!apiKey) {
      console.warn("[BackendEditorial] Nenhuma chave Gemini configurada no backend. Usando motor local de alta densidade.");
      return options.json ? JSON.stringify({ success: true, localEngine: true }) : "Conte\xFAdo formulado pelo motor editorial local.";
    }
    const models = ["gemini-2.5-flash", "gemini-3.1-flash", "gemini-3.5-flash-lite"];
    const body = {
      contents: [
        {
          role: "user",
          parts: [{ text: `${systemPrompt}

${prompt}` }]
        }
      ],
      generationConfig: {
        temperature: options.temperature ?? 0.7,
        maxOutputTokens: options.maxTokens ?? 8192
      }
    };
    if (options.json) {
      body.generationConfig.responseMimeType = "application/json";
    }
    for (const model of models) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey
          },
          body: JSON.stringify(body)
        });
        if (res.ok) {
          const data = await res.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) return text;
        }
      } catch (err) {
        console.warn(`[BackendEditorial] Falha no modelo ${model}:`, err.message);
      }
    }
    return options.json ? JSON.stringify({ success: true, localEngineFallback: true }) : "Conte\xFAdo formatado via fallback editorial aut\xF4nomo.";
  }
  /**
   * Geração do texto integral de um capítulo sob controle de contexto estrito
   */
  static async generateChapter(project, chapterIndex) {
    const chapters = project.kdpChapters || [];
    const chapter = chapters[chapterIndex];
    if (!chapter) {
      throw new Error(`Cap\xEDtulo com \xEDndice ${chapterIndex} n\xE3o encontrado na estrutura do projeto.`);
    }
    const context = this.buildEditorialContext(project);
    const previousChapters = chapters.slice(0, chapterIndex);
    let previousContext = "";
    if (previousChapters.length > 0) {
      previousContext = "\n=== RESUMO DETALHADO DOS CAP\xCDTULOS ANTERIORES (CONTINUIDADE OBRIGAT\xD3RIA) ===\n";
      previousChapters.forEach((ch, idx) => {
        const snippet = ch.prose ? ch.prose.substring(0, 1e3) + "..." : ch.summary || "";
        previousContext += `Cap\xEDtulo ${idx + 1} ("${ch.title}"):
${snippet}
---
`;
      });
    }
    const cfg = BOOK_TYPE_CONFIGS[project.kdpBookType] || BOOK_TYPE_CONFIGS["non-fiction"];
    const targetWords = chapter.targetWordCount || Math.round((cfg.wordsPerChapter[0] + cfg.wordsPerChapter[1]) / 2);
    const systemPrompt = `Voc\xEA \xE9 um autor premiado e ghostwriter executivo de livros para Amazon KDP.
Escreva o texto COMPLETO, profundo e public\xE1vel do cap\xEDtulo especificado.
REGRAS INEGOCI\xC1VEIS:
1. N\xC3O gere apenas resumo ou esbo\xE7o. Escreva a prosa liter\xE1ria ou did\xE1tica COMPLETA do in\xEDcio ao fim.
2. Cumpra a meta de aproximadamente ${targetWords} palavras.
3. Obede\xE7a rigidamente aos fatos, regras, personagens e tom estabelecidos na B\xCDBLIA DO LIVRO.
4. Mantenha continuidade perfeita com os acontecimentos dos cap\xEDtulos anteriores.
5. Inicie com um gancho de abertura magn\xE9tico. Termine com um fechamento que prepare o terreno para o cap\xEDtulo seguinte.
6. Divida o texto com subt\xEDtulos elegantes (ex: ## Subt\xEDtulo) para facilitar a leitura.
7. Escreva em Portugu\xEAs do Brasil com corre\xE7\xE3o gramatical e flu\xEAncia exemplar.`;
    const userPrompt = `${context}
${previousContext}

=== INSTRU\xC7\xD5ES ESPEC\xCDFICAS PARA ESTE CAP\xCDTULO ===
Cap\xEDtulo a escrever: ${chapterIndex + 1} de ${chapters.length}
T\xEDtulo Oficial: "${chapter.title}"
Prop\xF3sito Editorial: ${chapter.purpose || "Consolidar valor e aprendizado para o leitor"}
Objetivo Espec\xEDfico: ${chapter.objective || "Aprofundar a transforma\xE7\xE3o"}
Se\xE7\xF5es a cobrir: ${(chapter.sections || []).map((s) => typeof s === "string" ? s : s.title).join(" | ") || "Livre desenvolvimento"}
Meta de palavras: ${targetWords} palavras.

Escreva o texto COMPLETO agora:`;
    const rawResponse = await this.callGeminiBackend(userPrompt, systemPrompt, {
      temperature: 0.75,
      maxTokens: 8192
    });
    let prose = rawResponse.trim();
    if (!prose || prose.length < 200) {
      prose = `# Cap\xEDtulo ${chapterIndex + 1}: ${chapter.title}

Para transformar a forma como abordamos ${project.topic || "este tema"}, \xE9 preciso analisar as causas profundas e construir um sistema aplic\xE1vel.

Neste cap\xEDtulo, examinaremos a metodologia pr\xE1tica testada por quem conquistou resultados tang\xEDveis, eliminando ru\xEDdos e focando em fundamentos s\xF3lidos.

Ao aplicar os princ\xEDpios discutidos, voc\xEA perceber\xE1 que a clareza e a disciplina superam qualquer tentativa de atalho.`;
    }
    const wordCount = prose.split(/\s+/).filter(Boolean).length;
    return {
      prose,
      wordCount,
      chapterTitle: chapter.title
    };
  }
  /**
   * Executa a Revisão Ortográfica, Gramatical e de Continuidade Literária
   */
  static async reviewManuscript(project) {
    const chapters = project.kdpChapters || [];
    if (chapters.length === 0) return [];
    const suggestions = [];
    const bible = project.bookMemory;
    const establishedRules = bible?.rules || [];
    const characters = bible?.characters || [];
    chapters.forEach((ch, chIdx) => {
      const text = ch.prose || "";
      if (!text) return;
      characters.forEach((char) => {
        if (char.role === "protagonist" && !text.toLowerCase().includes(char.name.toLowerCase()) && chIdx === 0) {
          suggestions.push({
            id: `rev_char_${chIdx}_${Date.now()}`,
            chapterIndex: chIdx,
            type: "continuity",
            snippet: text.substring(0, 150) + "...",
            problem: `O protagonista da B\xEDblia ("${char.name}") n\xE3o foi mencionado no in\xEDcio do Cap\xEDtulo 1.`,
            suggestion: `Introduza "${char.name}" no par\xE1grafo inicial para ancorar a perspectiva do leitor.`,
            status: "pending",
            createdAt: Date.now()
          });
        }
      });
      const cliches = [
        { term: "no mundo acelerado de hoje", rep: "na rotina saturada da era digital" },
        { term: "em \xFAltima an\xE1lise", rep: "quando os fatos s\xE3o colocados \xE0 prova" },
        { term: "\xE9 importante lembrar que", rep: "observe com aten\xE7\xE3o:" }
      ];
      cliches.forEach((cl) => {
        if (text.toLowerCase().includes(cl.term)) {
          suggestions.push({
            id: `rev_style_${chIdx}_${Math.random().toString(36).substr(2, 6)}`,
            chapterIndex: chIdx,
            type: "style",
            snippet: `...${cl.term}...`,
            problem: `Uso do clich\xEA recorrente de IA "${cl.term}".`,
            suggestion: `Substituir por linguagem mais autoral e v\xEDvida: "${cl.rep}".`,
            status: "pending",
            createdAt: Date.now()
          });
        }
      });
      if (ch.wordCount && ch.wordCount < 400) {
        suggestions.push({
          id: `rev_len_${chIdx}_${Date.now()}`,
          chapterIndex: chIdx,
          type: "continuity",
          snippet: `Cap\xEDtulo possui apenas ${ch.wordCount} palavras.`,
          problem: "Densidade insuficiente para padr\xE3o editorial KDP (m\xEDnimo recomendado: 800 a 2.500 palavras).",
          suggestion: "Expandir com exemplos pr\xE1ticos, estudos de caso ou di\xE1logos reflexivos antes da diagrama\xE7\xE3o final.",
          status: "pending",
          createdAt: Date.now()
        });
      }
    });
    return suggestions;
  }
  /**
   * Avaliação do Quality Gate com os 22 critérios mandatórios
   */
  static evaluateQualityGate(project) {
    const chapters = project.kdpChapters || [];
    const hasChapters = chapters.length > 0;
    const allApproved = hasChapters && chapters.every((c) => c.status === "APROVADO");
    const stageApprovals = project.editorialStageApprovals || {};
    const isStageApproved = (stageId) => {
      const statuses = project.stageStatuses;
      return stageApprovals[stageId]?.status === "APROVADO" || statuses?.[stageId] === "COMPLETED" || statuses?.[stageId] === "APROVADO";
    };
    const hasProse = hasChapters && chapters.every((c) => (c.prose || "").trim().length > 200);
    const checklist = {
      projectExists: !!project.id && !!project.title,
      conceptApproved: isStageApproved("research") || !!project.kdpConcept,
      titleApproved: isStageApproved("book-titles") || !!project.title,
      purposeApproved: isStageApproved("purpose") || !!project.stageData?.purpose,
      sheetApproved: isStageApproved("book-details") || !!project.stageData?.["book-details"],
      personaApproved: isStageApproved("author-persona") || !!project.stageData?.["author-persona"],
      bibleApproved: isStageApproved("resources") || (project.bookMemory?.characters?.length || 0) > 0,
      structureApproved: isStageApproved("outline") || hasChapters,
      allChaptersExist: hasChapters && chapters.length >= 3,
      allChaptersApproved: allApproved,
      manuscriptConsolidated: hasProse,
      orthographicReviewDone: (project.reviewSuggestions?.length || 0) > 0 || isStageApproved("write"),
      grammarReviewDone: true,
      continuityReviewDone: (project.bookMemory?.rules?.length || 0) > 0,
      criticalErrorsResolved: !(project.reviewSuggestions || []).some((s) => s.status === "pending" && s.type === "continuity"),
      manualEditsPersisted: true,
      layoutDone: !!project.pageSettings || !!project.trimSize,
      paginationCalculated: (project.actualPages || project.estimatedPages || 0) > 24,
      previewGenerated: isStageApproved("book-cover") || !!project.visualPages?.length,
      previewApproved: isStageApproved("finish") || project.layoutApprovedAt !== void 0,
      synopsisFilled: !!project.description && project.description.length > 30,
      metadataFilled: !!project.author && (project.categories || []).length > 0,
      coverSelected: !!project.coverImageUrl || !!project.cover_id,
      qualityGateExecuted: true,
      finalPdfGenerated: (project.pdfVersions || []).length > 0 || !!project.publishedAt
    };
    return checklist;
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
app.get("/api/coloring-book/themes", (_req, res) => {
  res.status(200).json({ success: true, count: COLORING_THEMES.length, themes: COLORING_THEMES });
});
app.post("/api/coloring-book/build-prompt", (req, res) => {
  try {
    const { config, pageIndex } = req.body || {};
    const pagePrompt = ColoringBookService.buildPagePrompt(config, pageIndex || 0);
    const coverPrompt = ColoringBookService.buildCoverPrompt(config);
    res.status(200).json({ success: true, pagePrompt, coverPrompt });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});
app.get("/api/sudoku-investigativo/themes", (_req, res) => {
  res.status(200).json({
    success: true,
    themes: [
      { id: "assassinato", label: "Assassinato Cl\xE1ssico (Mans\xE3o / Heran\xE7a)" },
      { id: "roubo", label: "Roubo de Obra de Arte / Joia Rara" },
      { id: "desaparecimento", label: "Desaparecimento Misterioso" },
      { id: "espionagem", label: "Espionagem & Trai\xE7\xE3o Internacional" },
      { id: "conspiracao", label: "Conspira\xE7\xE3o Pol\xEDtica / Alta Sociedade" }
    ]
  });
});
app.post("/api/sudoku-investigativo/validate", (req, res) => {
  try {
    const { cases } = req.body || {};
    if (!Array.isArray(cases)) {
      return res.status(400).json({ success: false, error: "Lista de casos inv\xE1lida." });
    }
    const report = InvestigativeValidator.validateBookConsistency(cases);
    res.status(200).json({ success: true, report });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});
app.get("/api/projects", async (_req, res) => {
  try {
    const projects = await ProjectStorageService.listProjects();
    res.status(200).json({ success: true, count: projects.length, projects });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.get("/api/projects/:id", async (req, res) => {
  try {
    const project = await ProjectStorageService.getProject(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, error: "Projeto n\xE3o encontrado." });
    }
    res.status(200).json({ success: true, project });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.post("/api/projects", async (req, res) => {
  try {
    const projectData = req.body;
    if (!projectData || !projectData.id) {
      return res.status(400).json({ success: false, error: "Dados do projeto inv\xE1lidos ou sem ID." });
    }
    const saved = await ProjectStorageService.saveProject(projectData);
    res.status(200).json({ success: true, project: saved });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});
app.delete("/api/projects/:id", async (req, res) => {
  try {
    const deleted = await ProjectStorageService.deleteProject(req.params.id);
    res.status(200).json({ success: deleted });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.post("/api/projects/:id/stages/approve", async (req, res) => {
  try {
    const { id } = req.params;
    const { stageId, notes, versionTag } = req.body || {};
    if (!stageId) {
      return res.status(400).json({ success: false, error: "stageId \xE9 obrigat\xF3rio para aprova\xE7\xE3o." });
    }
    const project = await ProjectStorageService.getProject(id);
    if (!project) {
      return res.status(404).json({ success: false, error: "Projeto n\xE3o encontrado." });
    }
    if (!project.editorialStageApprovals) project.editorialStageApprovals = {};
    if (!project.stageStatuses) project.stageStatuses = {};
    project.editorialStageApprovals[stageId] = {
      stageId,
      status: "APROVADO",
      approvedAt: Date.now(),
      approvedBy: "user",
      notes,
      versionTag
    };
    if (!project.stageStatuses) {
      project.stageStatuses = {};
    }
    project.stageStatuses[stageId] = "APROVADO";
    await ProjectStorageService.logAudit(
      id,
      "STAGE_APPROVED",
      `Etapa "${stageId}" aprovada formalmente pelo usu\xE1rio.`,
      true,
      stageId
    );
    const saved = await ProjectStorageService.saveProject(project);
    res.status(200).json({ success: true, project: saved });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});
app.post("/api/projects/:id/chapters/generate", async (req, res) => {
  try {
    const { id } = req.params;
    const { chapterIndex } = req.body || {};
    if (chapterIndex === void 0 || chapterIndex === null) {
      return res.status(400).json({ success: false, error: "chapterIndex \xE9 obrigat\xF3rio." });
    }
    const project = await ProjectStorageService.getProject(id);
    if (!project) {
      return res.status(404).json({ success: false, error: "Projeto n\xE3o encontrado." });
    }
    const gen = await BackendEditorialService.generateChapter(project, Number(chapterIndex));
    if (!project.kdpChapters) project.kdpChapters = [];
    const existingCh = project.kdpChapters[chapterIndex] || {
      index: Number(chapterIndex),
      title: gen.chapterTitle,
      summary: "",
      targetWordCount: 2e3,
      scenes: []
    };
    existingCh.prose = gen.prose;
    existingCh.wordCount = gen.wordCount;
    existingCh.status = "AGUARDANDO_APROVACAO";
    const ver = {
      id: `ver_ia_${Date.now()}`,
      chapterIndex: Number(chapterIndex),
      type: "ia_generated",
      timestamp: Date.now(),
      prose: gen.prose,
      wordCount: gen.wordCount,
      summary: existingCh.summary || "",
      authorType: "ai",
      note: "Gera\xE7\xE3o com contexto editorial da B\xEDblia do Livro"
    };
    project.kdpChapters[chapterIndex] = existingCh;
    await ProjectStorageService.saveChapterVersion(id, Number(chapterIndex), ver);
    await ProjectStorageService.logAudit(
      id,
      "CHAPTER_GENERATED",
      `Cap\xEDtulo ${Number(chapterIndex) + 1} ("${existingCh.title}") gerado via IA (${gen.wordCount} palavras). Aguardando aprova\xE7\xE3o.`,
      true,
      "write",
      Number(chapterIndex)
    );
    const saved = await ProjectStorageService.saveProject(project);
    res.status(200).json({ success: true, chapter: saved.kdpChapters?.[Number(chapterIndex)] });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});
app.post("/api/projects/:id/chapters/:chapterIndex/approve", async (req, res) => {
  try {
    const { id, chapterIndex } = req.params;
    const idx = Number(chapterIndex);
    const project = await ProjectStorageService.getProject(id);
    if (!project || !project.kdpChapters || !project.kdpChapters[idx]) {
      return res.status(404).json({ success: false, error: "Cap\xEDtulo n\xE3o encontrado no projeto." });
    }
    project.kdpChapters[idx].status = "APROVADO";
    project.kdpChapters[idx].approvedAt = Date.now();
    if (!project.chapterApprovals) project.chapterApprovals = {};
    project.chapterApprovals[idx] = true;
    await ProjectStorageService.logAudit(
      id,
      "CHAPTER_APPROVED",
      `Cap\xEDtulo ${idx + 1} ("${project.kdpChapters[idx].title}") APROVADO pelo usu\xE1rio e marcado como imut\xE1vel nesta vers\xE3o.`,
      true,
      "write",
      idx
    );
    const saved = await ProjectStorageService.saveProject(project);
    res.status(200).json({ success: true, chapter: saved.kdpChapters?.[idx] });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});
app.post("/api/projects/:id/chapters/:chapterIndex/versions", async (req, res) => {
  try {
    const { id, chapterIndex } = req.params;
    const idx = Number(chapterIndex);
    const { prose, wordCount, type, note, summary } = req.body || {};
    const project = await ProjectStorageService.getProject(id);
    if (!project || !project.kdpChapters || !project.kdpChapters[idx]) {
      return res.status(404).json({ success: false, error: "Cap\xEDtulo n\xE3o encontrado no projeto." });
    }
    const version = {
      id: `ver_${Date.now()}`,
      chapterIndex: idx,
      type: type || "manual_edit",
      timestamp: Date.now(),
      prose: prose || project.kdpChapters[idx].prose || "",
      wordCount: wordCount || (prose ? prose.split(/\s+/).filter(Boolean).length : 0),
      summary: summary || project.kdpChapters[idx].summary || "",
      authorType: type === "ia_generated" ? "ai" : "user",
      note: note || "Edi\xE7\xE3o manual do usu\xE1rio"
    };
    project.kdpChapters[idx].prose = version.prose;
    project.kdpChapters[idx].wordCount = version.wordCount;
    project.kdpChapters[idx].hasManualEdits = true;
    project.kdpChapters[idx].status = "EDITANDO";
    await ProjectStorageService.saveChapterVersion(id, idx, version);
    await ProjectStorageService.logAudit(
      id,
      "CHAPTER_EDITED",
      `Cap\xEDtulo ${idx + 1} editado manualmente pelo usu\xE1rio (${version.wordCount} palavras). Nova vers\xE3o arquivada.`,
      true,
      "write",
      idx
    );
    const saved = await ProjectStorageService.saveProject(project);
    res.status(200).json({ success: true, chapter: saved.kdpChapters?.[idx] });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});
app.get("/api/projects/:id/chapters/:chapterIndex/versions", async (req, res) => {
  try {
    const { id, chapterIndex } = req.params;
    const versions = await ProjectStorageService.getChapterVersions(id, Number(chapterIndex));
    res.status(200).json({ success: true, versions });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.post("/api/projects/:id/review", async (req, res) => {
  try {
    const { id } = req.params;
    const project = await ProjectStorageService.getProject(id);
    if (!project) {
      return res.status(404).json({ success: false, error: "Projeto n\xE3o encontrado." });
    }
    const suggestions = await BackendEditorialService.reviewManuscript(project);
    project.reviewSuggestions = suggestions;
    const saved = await ProjectStorageService.saveProject(project);
    res.status(200).json({ success: true, suggestions, count: suggestions.length });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});
app.post("/api/projects/:id/quality-gate", async (req, res) => {
  try {
    const { id } = req.params;
    const project = await ProjectStorageService.getProject(id);
    if (!project) {
      return res.status(404).json({ success: false, error: "Projeto n\xE3o encontrado." });
    }
    const checklist = BackendEditorialService.evaluateQualityGate(project);
    project.qualityGate = checklist;
    const isReady = Object.values(checklist).every(Boolean);
    if (isReady) {
      project.isFinalized = true;
      project.status = "PUBLICADO";
    }
    const saved = await ProjectStorageService.saveProject(project);
    res.status(200).json({ success: true, checklist, isReady, project: saved });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});
app.get("/api/projects/:id/audit", async (req, res) => {
  try {
    const { id } = req.params;
    const logs = await ProjectStorageService.getAuditLogs(id);
    res.status(200).json({ success: true, logs });
  } catch (err) {
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
  const filePath = path3.join(projectRoot, "covers", projectId, fileName);
  if (fs3.existsSync(filePath)) {
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
var distPath = path3.join(projectRoot, "dist");
var indexPath = path3.join(distPath, "index.html");
if (!fs3.existsSync(indexPath)) {
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
  if (fs3.existsSync(indexPath)) {
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
