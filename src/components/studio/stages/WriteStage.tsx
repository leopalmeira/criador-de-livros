import React from 'react';
import { BookProject } from '../../../types/book-project';
import { VisualBookEditor } from '../VisualBookEditor';

interface Props {
  project: BookProject;
  onUpdateProject: (p: BookProject) => void;
  onOpenMemoryModal: () => void;
  onOpenPreview: () => void;
  initialChapterIndex?: number;
}

export const WriteStage: React.FC<Props> = ({ project, onUpdateProject, onOpenMemoryModal, onOpenPreview, initialChapterIndex }) => {
  return (
    <div className="stage-wrapper stage-wrapper-full">
      <VisualBookEditor
        project={project}
        onUpdateProject={onUpdateProject}
        onOpenMemoryModal={onOpenMemoryModal}
        onOpenPreview={onOpenPreview}
        initialChapterIndex={initialChapterIndex}
      />
    </div>
  );
};
