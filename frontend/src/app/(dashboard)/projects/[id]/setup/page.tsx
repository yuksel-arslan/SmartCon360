'use client';

import { use } from 'react';
import TopBar from '@/components/layout/TopBar';
import ProjectSetupWizard from '@/components/project-setup/ProjectSetupWizard';
import { useProjectStore } from '@/stores/projectStore';

export default function ProjectSetupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const project = useProjectStore((s) => s.projects.find((p) => p.id === id));
  const isEditMode = project?.status === 'active';

  return (
    <>
      <TopBar title={isEditMode ? 'Edit Project Setup' : 'Project Setup'} />
      <ProjectSetupWizard projectId={id} />
    </>
  );
}
