'use client';

import TopBar from '@/components/layout/TopBar';
import ProjectWizard from '@/components/wizard/ProjectWizard';

export default function NewProjectPage() {
  return (
    <>
      <TopBar title="New Project" />
      <ProjectWizard />
    </>
  );
}
