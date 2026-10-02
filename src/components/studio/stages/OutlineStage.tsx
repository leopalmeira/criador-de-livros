import React from 'react';
import { BookProject } from '../../../types/book-project';
import { AiService } from '../../../services/ai-service';
import { OutlinePlanningView } from '../OutlinePlanningView';

interface Props {
  project: BookProject;
  onUpdateProject: (p: BookProject) => void;
  aiService: AiService;
  onNavigateToWrite: (chapterIndex?: number) => void;
}

export const OutlineStage: React.FC<Props> = ({ project, onUpdateProject, aiService, onNavigateToWrite }) => {
  return (
    <div className="stage-wrapper">
      <OutlinePlanningView
        project={project}
        onUpdateProject={onUpdateProject}
        onNavigateToEditorChapter={(chapterIndex) => onNavigateToWrite(chapterIndex)}
        aiService={aiService}
      />
    </div>
  );
};
