import { createConstraint } from './store';

const DEMO_PROJECT_ID = '00000000-0000-0000-0000-000000000001';

export function seedDemoData() {
  // Seed demo constraints for testing
  const demoConstraints = [
    {
      projectId: DEMO_PROJECT_ID,
      category: 'material' as const,
      title: 'Steel beams delivery delayed',
      description: 'Supplier confirmed 2-week delay on structural steel delivery',
      status: 'open' as const,
      priority: 'critical' as const,
      raisedBy: 'John Smith',
      assignedTo: 'Procurement Team',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
      tags: ['steel', 'structural', 'supplier-issue'],
    },
    {
      projectId: DEMO_PROJECT_ID,
      category: 'design' as const,
      title: 'MEP clash in Zone B-12',
      description: 'HVAC duct conflicts with electrical conduit, RFI submitted',
      status: 'in_progress' as const,
      priority: 'high' as const,
      raisedBy: 'MEP Coordinator',
      assignedTo: 'Design Team',
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
      tags: ['mep', 'clash', 'rfi'],
    },
    {
      projectId: DEMO_PROJECT_ID,
      category: 'labor' as const,
      title: 'Certified welder shortage',
      description: 'Need 3 additional certified welders for steel erection',
      status: 'open' as const,
      priority: 'high' as const,
      raisedBy: 'Site Manager',
      assignedTo: 'HR Department',
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2 weeks
      tags: ['welding', 'manpower', 'certification'],
    },
    {
      projectId: DEMO_PROJECT_ID,
      category: 'predecessor' as const,
      title: 'Foundation curing incomplete',
      description: 'Concrete foundation requires 7 more days before formwork removal',
      status: 'open' as const,
      priority: 'medium' as const,
      raisedBy: 'Structure Engineer',
      assignedTo: 'Concrete Team',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      tags: ['concrete', 'curing', 'foundation'],
    },
    {
      projectId: DEMO_PROJECT_ID,
      category: 'permit' as const,
      title: 'Hot work permit pending',
      description: 'Fire department approval required for welding operations in Zone C',
      status: 'in_progress' as const,
      priority: 'critical' as const,
      raisedBy: 'Safety Officer',
      assignedTo: 'Admin Team',
      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days
      tags: ['permit', 'safety', 'hot-work'],
    },
    {
      projectId: DEMO_PROJECT_ID,
      category: 'equipment' as const,
      title: 'Tower crane maintenance scheduled',
      description: 'Tower crane #2 will be offline for 3 days for annual inspection',
      status: 'open' as const,
      priority: 'medium' as const,
      raisedBy: 'Equipment Manager',
      assignedTo: 'Equipment Team',
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      tags: ['crane', 'maintenance', 'inspection'],
    },
    {
      projectId: DEMO_PROJECT_ID,
      category: 'space' as const,
      title: 'Material staging area congestion',
      description: 'Zone A laydown area at capacity, need to relocate rebar stock',
      status: 'in_progress' as const,
      priority: 'high' as const,
      raisedBy: 'Logistics Coordinator',
      assignedTo: 'Site Team',
      dueDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
      tags: ['logistics', 'staging', 'space'],
    },
    {
      projectId: DEMO_PROJECT_ID,
      category: 'information' as const,
      title: 'Facade panel specs pending',
      description: 'Awaiting architect decision on facade panel color and finish',
      status: 'open' as const,
      priority: 'medium' as const,
      raisedBy: 'Facade Contractor',
      assignedTo: 'Design Team',
      dueDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000), // 3 weeks
      tags: ['facade', 'specification', 'decision-pending'],
    },
    // Resolved constraint
    {
      projectId: DEMO_PROJECT_ID,
      category: 'material' as const,
      title: 'Cement shortage resolved',
      description: 'Alternative supplier secured for cement delivery',
      status: 'resolved' as const,
      priority: 'high' as const,
      raisedBy: 'Procurement Officer',
      assignedTo: 'Procurement Team',
      dueDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
      resolvedDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      resolutionNotes: 'Secured 200 tons from ABC Cement Co. at competitive price',
      tags: ['cement', 'procurement', 'resolved'],
    },
  ];

  demoConstraints.forEach((data) => {
    createConstraint(data);
  });

  console.log(`✅ Seeded ${demoConstraints.length} demo constraints`);
}
