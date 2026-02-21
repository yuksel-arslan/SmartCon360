'use client';

import TopBar from '@/components/layout/TopBar';
import ProjectSetupWizard from '@/components/project-setup/ProjectSetupWizard';

export default function NewProjectPage() {
  return (
    <>
      <TopBar title="New Project" />
      <ProjectSetupWizard projectId="new" />
    </>
  );
}
