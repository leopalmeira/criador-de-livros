// ================================================================
// TIPOS PARA O MÓDULO GERADOR DE E-BOOKS DE CURSOS PROFISSIONAIS
// BookEngin — Cursos Digitais Ilustrados com IA, Hotmart e Replicate
// ================================================================

export type CourseDifficultyLevel = 'iniciante' | 'intermediario' | 'avancado' | 'todos-os-niveis';

export type CourseImageProfile = 'economico' | 'equilibrado' | 'ilustrado';

export type CourseVisualArtStyle = 
  | 'fotografia-tecnica-instrucional'
  | 'workshop-profissional-realista'
  | 'manual-didatico-moderno'
  | 'diagrama-infografico-vetorial'
  | 'estudio-culinario-iluminado'
  | 'macro-detalhes-passo-a-passo'
  | 'fotografia-comercial-clean';

export interface CourseTheme {
  id: string;
  category: string;
  title: string;
  description: string;
  targetAudience: string;
  difficultyLevel: CourseDifficultyLevel;
  taughtSkill: string;
  learningObjective: string;
  suggestedModules: string[];
  suggestedFormat: string;
  commercialReferences: string[];
  marketIndicators?: {
    demandLevel?: 'alta' | 'muito-alta' | 'moderada';
    practicalFocus?: 'pratico' | 'teorico-pratico' | 'especializado';
    estimatedHours?: number;
  };
  updatedAt: string;
}

export interface HotmartMarketReference {
  productId: string | number;
  title: string;
  slug?: string;
  publicUrl: string;
  description: string;
  producerName: string;
  category: string;
  topic?: string;
  rating?: number;
  totalReviews?: number;
  totalHours?: number;
  tags?: string[];
  avatarUrl?: string;
  queryDate: string;
  // Classificação estrita de dados (Conformidade com a Seção 5)
  verifiedData: {
    title: string;
    producer: string;
    publicUrl: string;
    category: string;
    publicRating?: string;
    publicReviewsCount?: number;
  };
  publicSignals: {
    hasCertification?: boolean;
    hasVideoTeaser?: boolean;
    tagsList?: string[];
  };
  unavailableData: {
    salesVolume: string; // "Confidencial / Não divulgado pela plataforma"
    revenue: string;     // "Confidencial / Não divulgado pela plataforma"
    rankPosition: string;// "Não aferível diretamente em busca pública"
  };
  aiOpportunityAnalysis?: {
    recurringNeeds: string[];
    problemsSolved: string[];
    valuedSkills: string[];
    marketGaps: string[];
    suggestedDifferentiators: string[];
    recommendedCourseAngle: string;
  };
}

export interface CourseImagePlan {
  id: string;
  lessonId: string;
  stepNumber: number;
  title: string;
  pedagogicalObjective: string;
  sceneDescription: string;
  actionExecuted: string;
  materialsAndTools: string[];
  visualPrompt: string;
  negativePrompt?: string;
  aspectRatio: '3:4' | '16:9' | '1:1' | '2:3';
  status: 'pending' | 'generating' | 'completed' | 'failed';
  imageUrl?: string;
  imageDataUrl?: string;
  modelUsed?: string;
  errorMessage?: string;
  generatedAt?: number;
}

export interface CourseStepInstruction {
  stepNumber: number;
  title: string;
  instruction: string;
  materialsNeeded?: string[];
  technicalNote?: string;
  safetyCaution?: string;
  imagePlanId?: string;
}

export interface CourseLesson {
  id: string;
  lessonNumber: number;
  title: string;
  objective: string;
  introduction: string;
  didacticExplanation: string;
  requiredMaterials: string[];
  stepByStepInstructions: CourseStepInstruction[];
  images: CourseImagePlan[];
  practicalExamples: string[];
  commonMistakes: string[];
  practicalTips: string[];
  safetyPrecautions: string[];
  summary: string;
  exercise: {
    title: string;
    description: string;
    expectedOutcome: string;
  };
  completionCriteria: string[];
  beforeAfterComparison?: {
    enabled?: boolean;
    title?: string;
    beforeImageUrl?: string;
    beforeImageDataUrl?: string;
    beforeDescription?: string;
    afterImageUrl?: string;
    afterImageDataUrl?: string;
    afterDescription?: string;
  };
  audioNarration?: {
    audioUrl?: string;
    durationSeconds?: number;
    voiceName?: string;
  };
}

export interface CourseModule {
  id: string;
  moduleNumber: number;
  title: string;
  objective: string;
  lessons: CourseLesson[];
}

export interface CoursePedagogicalPlan {
  courseTitle: string;
  courseSubtitle: string;
  themeCategory: string;
  targetAudience: string;
  difficultyLevel: CourseDifficultyLevel;
  primarySkill: string;
  learningObjective: string;
  prerequisites: string;
  language: string;
  toneStyle: string;
  requiredToolsAndMaterials: string[];
  modules: CourseModule[];
  practicalProjects: string[];
  checklists: Array<{
    title: string;
    items: string[];
  }>;
  assessmentMethods: string[];
  glossary: Array<{
    term: string;
    definition: string;
  }>;
  conclusion: string;
  nextSteps: string;
  references: string[];
}

export interface CourseAuditIssue {
  id: string;
  moduleNumber?: number;
  lessonNumber?: number;
  category: 'coerencia' | 'sequencia' | 'seguranca' | 'exercicio' | 'imagem' | 'completude';
  severity: 'critico' | 'atencao' | 'informativo';
  description: string;
  suggestedFix: string;
  resolved: boolean;
}

export interface CourseAuditReport {
  overallScore: number;
  passed: boolean;
  hasCriticalIssues: boolean;
  criticalCount: number;
  warningCount: number;
  issues: CourseAuditIssue[];
  auditedAt: number;
  summaryNote: string;
}

export interface CourseEbookData {
  id: string;
  themeId?: string;
  themeTitle: string;
  category: string;
  difficultyLevel: CourseDifficultyLevel;
  targetAudience: string;
  primarySkill: string;
  learningObjective: string;
  prerequisites: string;
  language: string;
  toneStyle: string;
  
  // Configuração Estrutural
  modulesCount: number;
  approximateLessonsCount: number;
  imageProfile: CourseImageProfile;
  visualStyle: CourseVisualArtStyle;
  estimatedImagesCount: number;
  estimatedReplicateCostUsd: number;
  
  // Referências de Mercado
  marketReferences: HotmartMarketReference[];
  marketSearchQuery?: string;
  marketResearchStatus?: 'idle' | 'searching' | 'completed' | 'skipped' | 'failed';
  marketOpportunitySummary?: string;
  
  // Plano Pedagógico e Conteúdo
  pedagogicalPlan?: CoursePedagogicalPlan;
  coverImageUrl?: string;
  coverImageDataUrl?: string;
  
  // Auditoria
  auditReport?: CourseAuditReport;
  
  // Estados de Fluxo (1 a 10)
  currentStep: number;
  generationStage: 'config' | 'planning' | 'writing' | 'imaging' | 'review' | 'auditing' | 'exporting';
  progressPercentage: number;
  statusMessage: string;
  
  createdAt: number;
  updatedAt: number;
}
