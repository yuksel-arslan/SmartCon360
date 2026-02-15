'use client';

import { use } from 'react';
import TopBar from '@/components/layout/TopBar';
import ProjectSetupWizard from '@/components/project-setup/ProjectSetupWizard';

export default function ProjectSetupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return (
    <>
      <TopBar title="Project Setup" />
      <ProjectSetupWizard projectId={id} />
    </>
  );
}
