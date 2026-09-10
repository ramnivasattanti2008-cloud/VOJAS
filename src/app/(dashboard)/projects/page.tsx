import { ProjectsClient } from './ProjectsClient';

export const metadata = {
  title: 'Projects | VOJAS',
  description: 'Browse and manage MPLAD projects across all 16 government sectors.',
};

export default function ProjectsPage() {
  return <ProjectsClient />;
}
