import { BookProject, StageProgress, StageContent, StageVersion, StageApproval, EditorialStageKey } from '../types';

export class MigrationService {
  static readonly CURRENT_VERSION = 2;

  static migrateProject(project: any): BookProject {
    const migrated = { ...project } as BookProject;

    // Initialize stage system if missing
    if (!migrated.currentStage) {
      migrated.currentStage = 'research';
    }

    if (!migrated.stageProgress || !Array.isArray(migrated.stageProgress)) {
      migrated.stageProgress = this.initializeStageProgress(migrated);
    }

    if (!migrated.stageContents || !Array.isArray(migrated.stageContents)) {
      migrated.stageContents = this.initializeStageContents(migrated);
    }

    if (!migrated.stageVersions || !Array.isArray(migrated.stageVersions)) {
      migrated.stageVersions = [];
    }

    if (!migrated.stageApprovals || !Array.isArray(migrated.stageApprovals)) {
      migrated.stageApprovals = this.initializeStageApprovals(migrated);
    }

    // Ensure all stageProgress entries have required fields
    migrated.stageProgress = migrated.stageProgress.map(sp => ({
      stageKey: sp.stageKey,
      status: sp.status || 'NOT_STARTED',
      progress: typeof sp.progress === 'number' ? sp.progress : 0,
      lastUpdated: sp.lastUpdated || Date.now(),
      contentHash: sp.contentHash
    }));

    return migrated;
  }

  private static initializeStageProgress(project: BookProject): StageProgress[] {
    const stages: EditorialStageKey[] = [
      'research', 'analytics', 'titles', 'resources',
      'persona', 'purpose', 'details', 'bio',
      'outline', 'write', 'description', 'cover', 'finish'
    ];

    const now = Date.now();
    const hasConcept = !!project.kdpConcept?.title?.trim();
    const hasBible = !!project.kdpBible || !!project.bookMemory;
    const hasOutline = (project.kdpChapters?.length || 0) > 0;
    const hasChapters = hasOutline;
    const writtenChapters = project.kdpChapters?.filter(c => c.prose && c.prose.trim().length > 100).length || 0;
    const allChaptersWritten = hasChapters && writtenChapters === project.kdpChapters!.length;
    const hasEditorReport = !!project.kdpEditorReport;
    const hasVisualPages = (project.visualPages?.length || 0) > 0;
    const hasCover = !!project.kdpCoverDesign?.geometry;
    const hasMetadata = !!project.kdpMetadata?.keywords7 && project.kdpMetadata.keywords7.length === 7;
    const hasQualityReport = !!project.kdpQualityReport?.passed;
    const hasPackage = !!project.kdpPackageGeneratedAt;

    const stageStatusMap: Record<EditorialStageKey, { status: StageProgress['status']; progress: number }> = {
      research: hasConcept ? { status: 'COMPLETED', progress: 100 } : { status: 'NOT_STARTED', progress: 0 },
      analytics: hasConcept ? { status: 'COMPLETED', progress: 100 } : { status: 'NOT_STARTED', progress: 0 },
      titles: hasConcept ? { status: 'COMPLETED', progress: 100 } : { status: 'NOT_STARTED', progress: 0 },
      resources: { status: 'NOT_STARTED', progress: 0 },
      persona: hasBible ? { status: 'COMPLETED', progress: 100 } : { status: 'NOT_STARTED', progress: 0 },
      purpose: hasConcept ? { status: 'COMPLETED', progress: 100 } : { status: 'NOT_STARTED', progress: 0 },
      details: { status: 'COMPLETED', progress: 100 }, // Already captured in Wizard
      bio: hasConcept ? { status: 'COMPLETED', progress: 100 } : { status: 'NOT_STARTED', progress: 0 },
      outline: hasOutline ? { status: 'COMPLETED', progress: 100 } : { status: 'NOT_STARTED', progress: 0 },
      write: allChaptersWritten ? { status: 'COMPLETED', progress: 100 } : hasChapters ? { status: 'IN_PROGRESS', progress: Math.round((writtenChapters / project.kdpChapters!.length) * 100) } : { status: 'NOT_STARTED', progress: 0 },
      description: hasMetadata ? { status: 'COMPLETED', progress: 100 } : { status: 'NOT_STARTED', progress: 0 },
      cover: hasCover ? { status: 'COMPLETED', progress: 100 } : { status: 'NOT_STARTED', progress: 0 },
      finish: hasPackage ? { status: 'COMPLETED', progress: 100 } : hasQualityReport ? { status: 'REVIEW', progress: 80 } : { status: 'NOT_STARTED', progress: 0 }
    };

    return stages.map(key => ({
      stageKey: key,
      ...stageStatusMap[key],
      lastUpdated: now
    }));
  }

  private static initializeStageContents(project: BookProject): StageContent[] {
    const stages: EditorialStageKey[] = [
      'research', 'analytics', 'titles', 'resources',
      'persona', 'purpose', 'details', 'bio',
      'outline', 'write', 'description', 'cover', 'finish'
    ];

    const now = Date.now();
    const contents: StageContent[] = [];

    // Research - from kdpConcept and topic
    if (project.kdpConcept || project.topic) {
      contents.push({
        stageKey: 'research',
        data: {
          topic: project.topic || project.kdpConcept?.title || '',
          niche: project.kdpConcept?.title || '',
          audience: project.targetAudience,
          language: project.language,
          country: 'Brasil',
          genre: project.kdpBookType,
          objective: project.description,
        },
        updatedAt: now,
        updatedBy: 'user',
        version: 1
      });
    }

    // Analytics - from existing analytics data
    contents.push({
      stageKey: 'analytics',
      data: {
        marketReferences: [],
        bsrFilter: 80,
        ratingFilter: 4.1
      },
      updatedAt: now,
      updatedBy: 'user',
      version: 1
    });

    // Titles - from kdpConcept
    if (project.kdpConcept?.titleOptions?.length) {
      contents.push({
        stageKey: 'titles',
        data: {
          titleOptions: project.kdpConcept.titleOptions,
          selectedTitleId: project.kdpConcept.titleOptions[0]?.id || ''
        },
        updatedAt: now,
        updatedBy: 'user',
        version: 1
      });
    }

    // Persona - from bookMemory/kdpBible
    if (project.bookMemory?.characters?.length || project.kdpBible?.characters?.length) {
      contents.push({
        stageKey: 'persona',
        data: {
          name: project.author,
          experience: '',
          personality: '',
          style: '',
          tone: project.kdpConcept?.tone || '',
          voice: '',
          vocabulary: '',
          positioning: '',
          audience: project.targetAudience,
          characteristics: []
        },
        updatedAt: now,
        updatedBy: 'user',
        version: 1
      });
    }

    // Purpose - from kdpConcept
    if (project.kdpConcept?.promise) {
      contents.push({
        stageKey: 'purpose',
        data: {
          objective: project.kdpConcept.promise,
          promise: project.kdpConcept.promise,
          problem: '',
          transformation: project.kdpConcept.promise,
          expectedResult: '',
          audience: project.targetAudience,
          valueProposition: project.kdpConcept.differentiator
        },
        updatedAt: now,
        updatedBy: 'user',
        version: 1
      });
    }

    // Details - from Wizard/project basics
    contents.push({
      stageKey: 'details',
      data: {
        bookType: project.kdpBookType,
        trimSize: project.trimSize,
        paperType: project.paperType,
        estimatedPages: project.estimatedPages,
        chapterCount: project.kdpChapters?.length || 0
      },
      updatedAt: now,
      updatedBy: 'user',
      version: 1
    });

    // Bio - from editorialElements
    if (project.editorialElements?.aboutAuthor) {
      contents.push({
        stageKey: 'bio',
        data: {
          bio: project.editorialElements.aboutAuthor
        },
        updatedAt: now,
        updatedBy: 'user',
        version: 1
      });
    }

    // Outline - from kdpChapters
    if (project.kdpChapters?.length) {
      contents.push({
        stageKey: 'outline',
        data: {
          chapters: project.kdpChapters.map(c => ({
            index: c.index,
            title: c.title,
            summary: c.summary,
            targetWordCount: c.targetWordCount
          })),
          structureNotes: ''
        },
        updatedAt: now,
        updatedBy: 'user',
        version: 1
      });
    }

    // Write - from kdpChapters prose
    if (project.kdpChapters?.length) {
      contents.push({
        stageKey: 'write',
        data: {
          chapters: project.kdpChapters.map(c => ({
            index: c.index,
            prose: c.prose || '',
            wordCount: c.wordCount || 0,
            status: c.status
          }))
        },
        updatedAt: now,
        updatedBy: 'user',
        version: 1
      });
    }

    // Description - from kdpMetadata
    if (project.kdpMetadata) {
      contents.push({
        stageKey: 'description',
        data: {
          commercialDescription: project.kdpMetadata.commercialLongDescription,
          summary: project.kdpMetadata.commercialShortDescription,
          keywords: project.kdpMetadata.keywords7,
          categories: project.kdpMetadata.categoriesPrimary,
          positioning: '',
          audience: project.kdpMetadata.targetAudience
        },
        updatedAt: now,
        updatedBy: 'user',
        version: 1
      });
    }

    // Cover - from kdpCoverDesign
    if (project.kdpCoverDesign) {
      contents.push({
        stageKey: 'cover',
        data: {
          concepts: project.kdpCoverDesign.frontPrompt ? [{
            concept: 'Principal',
            prompt: project.kdpCoverDesign.frontPrompt
          }] : [],
          approvedConceptIndex: 0
        },
        updatedAt: now,
        updatedBy: 'user',
        version: 1
      });
    }

    // Finish
    contents.push({
      stageKey: 'finish',
      data: {
        checklist: []
      },
      updatedAt: now,
      updatedBy: 'user',
      version: 1
    });

    return contents;
  }

  private static initializeStageApprovals(project: BookProject): StageApproval[] {
    const stages: EditorialStageKey[] = [
      'research', 'analytics', 'titles', 'resources',
      'persona', 'purpose', 'details', 'bio',
      'outline', 'write', 'description', 'cover', 'finish'
    ];

    const hasConcept = !!project.kdpConcept?.title?.trim();
    const hasBible = !!project.kdpBible || !!project.bookMemory;
    const hasOutline = (project.kdpChapters?.length || 0) > 0;
    const writtenChapters = project.kdpChapters?.filter(c => c.prose && c.prose.trim().length > 100).length || 0;
    const allChaptersWritten = hasOutline && writtenChapters === project.kdpChapters!.length;
    const hasCover = !!project.kdpCoverDesign?.geometry;
    const hasMetadata = !!project.kdpMetadata?.keywords7 && project.kdpMetadata.keywords7.length === 7;
    const hasPackage = !!project.kdpPackageGeneratedAt;

    return stages.map(key => {
      let status: StageApproval['status'] = 'NOT_STARTED';
      let previousStatus: StageApproval['previousStatus'] = 'NOT_STARTED';

      switch (key) {
        case 'research':
        case 'analytics':
        case 'titles':
        case 'purpose':
        case 'details':
        case 'bio':
          status = hasConcept ? 'APPROVED' : 'NOT_STARTED';
          previousStatus = 'NOT_STARTED';
          break;
        case 'persona':
          status = hasBible ? 'APPROVED' : 'NOT_STARTED';
          previousStatus = 'NOT_STARTED';
          break;
        case 'outline':
          status = hasOutline ? 'APPROVED' : 'NOT_STARTED';
          previousStatus = 'NOT_STARTED';
          break;
        case 'write':
          if (allChaptersWritten) status = 'COMPLETED';
          else if (hasOutline) status = 'IN_PROGRESS';
          else status = 'NOT_STARTED';
          previousStatus = 'NOT_STARTED';
          break;
        case 'description':
          status = hasMetadata ? 'APPROVED' : 'NOT_STARTED';
          previousStatus = 'NOT_STARTED';
          break;
        case 'cover':
          status = hasCover ? 'APPROVED' : 'NOT_STARTED';
          previousStatus = 'NOT_STARTED';
          break;
        case 'finish':
          if (hasPackage) status = 'COMPLETED';
          else if (hasMetadata && hasCover) status = 'REVIEW';
          else status = 'NOT_STARTED';
          previousStatus = 'NOT_STARTED';
          break;
        case 'resources':
        default:
          status = 'NOT_STARTED';
          previousStatus = 'NOT_STARTED';
      }

      return {
        stageKey: key,
        status,
        previousStatus
      };
    });
  }

  static needsMigration(project: any): boolean {
    return !project.currentStage || !project.stageProgress || !project.stageContents;
  }
}