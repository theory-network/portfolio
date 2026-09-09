import { Injectable, computed, signal } from '@angular/core';
import {
  ActiveTaskScope,
  ChatMessage,
  CommunityPipeline,
  ConversationStore,
  LastScopeMap,
  ListGroup,
  PipelineInstance,
  Project,
  SlotAssignment,
  SlotSide,
} from './models';

// Seed data ported 1:1 from command-center-mockup-v2.html's listGroups /
// pipelines / communityPipelines constants, so the Angular version starts
// from the exact same demo state as the HTML mockup.
const SEED_LIST_GROUPS: Record<string, ListGroup> = {
  personal: {
    key: 'personal',
    label: 'Personal',
    src: 'Roam',
    accent: 'personal',
    icon: '🏠',
    projects: [
      {
        name: 'Home Renovation', icon: '🏠', count: 7, todoPipelineId: 'roam-personal',
        tasks: [
          { id: 't1', title: 'Order tile for the mudroom', status: 'open' },
          { id: 't2', title: "Confirm contractor's Thursday slot", status: 'open' },
          { id: 't3', title: 'Pick paint colors', status: 'open' },
          { id: 't4', title: 'Schedule electrician', status: 'done' },
        ],
      },
      {
        name: 'Kids Homeschool Plan', icon: '📘', count: 3, todoPipelineId: 'roam-personal',
        tasks: [
          { id: 't1', title: 'Curriculum review', status: 'open' },
          { id: 't2', title: 'Science unit reading list', status: 'open' },
          { id: 't3', title: 'Plan field trip', status: 'done' },
        ],
      },
      {
        name: 'Novel Draft', icon: '✍️', count: 0, todoPipelineId: 'roam-personal',
        tasks: [
          { id: 't1', title: 'Outline chapter 6', status: 'open' },
          { id: 't2', title: 'Rewrite chapter 4 pacing', status: 'open' },
        ],
      },
      {
        name: 'Dojo / Training', icon: '🥋', count: 1, todoPipelineId: 'roam-personal',
        tasks: [{ id: 't1', title: 'Renew mat rental agreement', status: 'open' }],
      },
    ],
    replies: {
      'Home Renovation': "Two open items: order the tile for the mudroom, and confirm the contractor's Thursday slot.",
      'Kids Homeschool Plan': 'Curriculum review is due Friday, and the science unit reading list still needs three more titles.',
      'Novel Draft': 'Chapter 6 outline is still open, and you flagged the pacing in chapter 4 for a rewrite.',
      'Dojo / Training': 'Just one open item — renew the mat rental agreement before the 1st.',
    },
  },
  pro: {
    key: 'pro',
    label: 'Pro',
    src: 'Linear',
    accent: 'pro',
    icon: '⛓️',
    projects: [
      {
        name: 'XRPL Rewards Platform', icon: '⛓️', count: 12, todoPipelineId: 'linear-theory',
        tasks: [
          { id: 't1', title: 'Design review: hybrid custody export path', status: 'open' },
          { id: 't2', title: 'Amendment voting mechanics writeup', status: 'open' },
          { id: 't3', title: 'MPT export schema finalize', status: 'done' },
        ],
      },
      {
        name: 'Settlement Worker', icon: '⚙️', count: 5, todoPipelineId: 'linear-theory',
        tasks: [
          { id: 't1', title: 'Retry handling for failed MPT exports', status: 'open' },
          { id: 't2', title: 'Idempotency key design', status: 'open' },
          { id: 't3', title: 'Dead-letter queue alerting', status: 'done' },
        ],
      },
      {
        name: 'Design System Consolidation', icon: '🎨', count: 0, todoPipelineId: 'linear-theory',
        tasks: [
          { id: 't1', title: 'Figma vs Storybook vs Chromatic comparison', status: 'open' },
          { id: 't2', title: 'spartan/ui integration spike', status: 'open' },
        ],
      },
    ],
    replies: {
      'XRPL Rewards Platform': '12 open issues. Highest priority: the hybrid custody export path needs a design review before the sprint closes.',
      'Settlement Worker': '5 open issues, including the unassigned ticket on retry handling for failed MPT exports — now reassigned to you.',
      'Design System Consolidation': '4 open issues comparing Figma, Storybook, and Chromatic — the spartan/ui integration spike is still unstarted.',
    },
  },
  freelance: {
    key: 'freelance',
    label: 'Freelance',
    src: 'Linear',
    accent: 'pro',
    icon: '💼',
    projects: [
      {
        name: 'Freelance Pipeline', icon: '💼', count: 2, todoPipelineId: 'linear-theory',
        tasks: [
          { id: 't1', title: 'Angular/Nx contract inquiry — reply', status: 'open' },
          { id: 't2', title: 'XRPL integration consult — scope call', status: 'open' },
        ],
      },
      {
        name: 'Client Leads', icon: '📇', count: 4, todoPipelineId: 'linear-theory',
        tasks: [
          { id: 't1', title: 'Follow up: Acme Corp', status: 'open' },
          { id: 't2', title: 'Follow up: Riverside Studio', status: 'open' },
          { id: 't3', title: 'Send proposal: Nomad Labs', status: 'done' },
          { id: 't4', title: 'Send proposal: Ember Co', status: 'open' },
        ],
      },
    ],
    replies: {
      'Freelance Pipeline': '2 open leads — one Angular/Nx contract inquiry, one XRPL integration consult.',
      'Client Leads': '4 leads in the funnel — two are waiting on a follow-up email from you.',
    },
  },
};

const SEED_PIPELINES: PipelineInstance[] = [
  { id: 'roam-personal', type: 'roam', label: 'Roam · andre-planning', config: { apiToken: '••••••••3f1a', graphName: 'andre-planning' } },
  { id: 'linear-theory', type: 'linear', label: 'Linear · Theory Network', config: { apiKey: '••••••••9c02' } },
  { id: 'github-personal', type: 'github', label: 'GitHub · andre', config: { token: '••••••••77bd' } },
];

const SEED_COMMUNITY_PIPELINES: CommunityPipeline[] = [
  { type: 'roam', name: 'Roam Research', author: 'Anthropic', description: 'Read and write blocks on a Roam graph — daily notes, backlinks, block references.', available: true },
  { type: 'linear', name: 'Linear', author: 'Anthropic', description: 'Issues, projects, and cycles across a Linear workspace.', available: true },
  { type: 'github', name: 'GitHub', author: 'Anthropic', description: 'Pull requests, issues, and repo activity.', available: true },
  { type: 'gitlab', name: 'GitLab', author: 'Anthropic', description: 'Merge requests and issues, including self-hosted instances.', available: true },
  { type: 'notion', name: 'Notion', author: 'Community', description: 'Pages and databases in a Notion workspace.', available: false },
  { type: 'jira', name: 'Jira', author: 'Community', description: 'Issues and sprints across a Jira project.', available: false },
  { type: 'slack', name: 'Slack', author: 'Community', description: 'Channels and DMs — read mentions, post updates.', available: false },
  { type: 'clickup', name: 'ClickUp', author: 'Community', description: 'Tasks and lists in a ClickUp workspace.', available: false },
];

const ALL_PROJECTS_THREAD: ChatMessage[] = [
  { type: 'system', text: 'Context: All Projects' },
  {
    type: 'assistant',
    text: "Across both sides, three things need attention today: the XRPL amendment tracker task is overdue, the homeschool curriculum review is due Friday, and there's an unassigned Linear ticket on the settlement worker.",
  },
  { type: 'user', text: 'Move the settlement worker ticket to me and bump curriculum review to Monday.' },
  { type: 'assistant', text: 'Done — reassigned in Linear, and pushed the Roam due-date to Monday.' },
  {
    type: 'question',
    text: 'Want me to also flag the overdue XRPL amendment tracker task as urgent?',
    options: ['Yes, flag it urgent', 'No, leave it as-is', 'Show me the task first'],
  },
];

export type ViewKey = 'work' | 'dashboard' | 'approvals' | 'lists-admin' | 'pipelines-admin';

@Injectable({ providedIn: 'root' })
export class AppStateService {
  // ---- View navigation ----
  readonly currentView = signal<ViewKey>('work');
  /** Which tab (work/dashboard/approvals) was active before entering an admin screen, so "Back" returns there. */
  readonly lastActiveTab = signal<'work' | 'dashboard' | 'approvals'>('work');

  goToTab(tab: 'work' | 'dashboard' | 'approvals'): void {
    this.lastActiveTab.set(tab);
    this.currentView.set(tab);
  }

  openListsAdmin(): void {
    this.currentView.set('lists-admin');
  }

  openPipelinesAdmin(): void {
    this.currentView.set('pipelines-admin');
  }

  closeAdmin(): void {
    this.currentView.set(this.lastActiveTab());
  }

  // ---- Domain data ----
  readonly listGroups = signal<Record<string, ListGroup>>(structuredClone(SEED_LIST_GROUPS));
  readonly pipelines = signal<PipelineInstance[]>(structuredClone(SEED_PIPELINES));
  readonly communityPipelines = signal<CommunityPipeline[]>(SEED_COMMUNITY_PIPELINES);

  // ---- Sidebar slot assignment ----
  readonly slotAssignment = signal<SlotAssignment>({ left: 'personal', right: 'pro' });

  // ---- Chat scope + conversation store ----
  readonly activeTaskScope = signal<ActiveTaskScope | null>(null);
  readonly activeSide = signal<SlotSide | null>(null);
  private readonly lastScopeForProject = signal<LastScopeMap>({});
  private readonly conversations = signal<ConversationStore>({});
  readonly allProjectsThread = signal<ChatMessage[]>(ALL_PROJECTS_THREAD);

  /** The thread currently shown in the chat pane — all-projects when nothing's selected, otherwise whatever scopeKey() resolves to. */
  readonly activeThread = computed<ChatMessage[]>(() => {
    const scope = this.activeTaskScope();
    if (!scope) return this.allProjectsThread();
    const key = this.scopeKey(scope.groupKey, scope.projectName, scope.taskId);
    return this.conversations()[key] ?? [];
  });

  /** Breadcrumb parts for the topbar: just the project name when all-tasks, or {project, task} when task-scoped. */
  readonly breadcrumb = computed<{ project: string; task: string | null } | null>(() => {
    const scope = this.activeTaskScope();
    if (!scope) return null;
    const task = scope.taskId ? this.findTask(scope.groupKey, scope.projectName, scope.taskId) : null;
    return { project: scope.projectName, task: task?.title ?? null };
  });

  readonly inputPlaceholder = computed(() => {
    const scope = this.activeTaskScope();
    if (!scope) return 'Message all projects…';
    const task = scope.taskId ? this.findTask(scope.groupKey, scope.projectName, scope.taskId) : null;
    return 'Message ' + (task ? task.title : scope.projectName) + '…';
  });

  groupForSide(side: SlotSide) {
    return computed(() => this.listGroups()[this.slotAssignment()[side]]);
  }

  findProject(groupKey: string, projectName: string): Project | undefined {
    return this.listGroups()[groupKey]?.projects.find((p) => p.name === projectName);
  }

  private findTask(groupKey: string, projectName: string, taskId: string) {
    return this.findProject(groupKey, projectName)?.tasks.find((t) => t.id === taskId);
  }

  private scopeKey(groupKey: string, projectName: string, taskId: string | null): string {
    return `${groupKey}:${projectName}:${taskId ?? 'all'}`;
  }

  // ---- Chat scope transitions (ported from renderProjectChat / openProjectChat / switchToAllTasksInChat) ----

  /** Tapping a project tile: resumes whichever scope (a task, or all-tasks) was last active for it, defaulting to all-tasks the first time. */
  openProjectChat(side: SlotSide, groupKey: string, projectName: string): void {
    const taskId = this.lastScopeForProject()[`${groupKey}:${projectName}`] ?? null;
    this.renderProjectChat(side, groupKey, projectName, taskId);
  }

  /** The single source of truth for showing a project or project+task chat — called both from tile taps and from the task picker. */
  renderProjectChat(side: SlotSide, groupKey: string, projectName: string, taskId: string | null): void {
    this.activeSide.set(side);
    this.activeTaskScope.set({ groupKey, projectName, taskId });
    this.lastScopeForProject.update((map) => ({ ...map, [`${groupKey}:${projectName}`]: taskId }));

    const key = this.scopeKey(groupKey, projectName, taskId);
    if (!this.conversations()[key]) {
      const group = this.listGroups()[groupKey];
      const task = taskId ? this.findTask(groupKey, projectName, taskId) : null;
      const reply = task
        ? `Scoped to "${task.title}". Nothing logged yet — ask away.`
        : group.replies[projectName] ?? 'No details yet for this project.';
      const seeded: ChatMessage[] = [
        { type: 'system', text: 'Context: ' + (task ? `${projectName} — ${task.title}` : projectName) },
        { type: 'assistant', text: reply },
      ];
      this.conversations.update((store) => ({ ...store, [key]: seeded }));
    }
  }

  /** Deselecting a tile (tapping the already-active one again) — back to All Projects. */
  clearSelection(): void {
    this.activeSide.set(null);
    this.activeTaskScope.set(null);
  }

  /** Breadcrumb click — jump back to all-tasks for the currently open project without leaving the chat. */
  switchToAllTasksInChat(): void {
    const scope = this.activeTaskScope();
    const side = this.activeSide();
    if (!scope || !side) return;
    this.renderProjectChat(side, scope.groupKey, scope.projectName, null);
  }

  sendMessage(text: string): void {
    const scope = this.activeTaskScope();
    const trimmed = text.trim();
    if (!trimmed) return;
    if (!scope) {
      this.allProjectsThread.update((thread) => [...thread, { type: 'user', text: trimmed }]);
      return;
    }
    const key = this.scopeKey(scope.groupKey, scope.projectName, scope.taskId);
    this.conversations.update((store) => ({
      ...store,
      [key]: [...(store[key] ?? []), { type: 'user', text: trimmed }],
    }));
  }

  /**
   * Records the answer to a question-type message (tapped option or typed
   * free text — same interaction Claude itself uses for multiple-choice
   * elicitation) and appends it to the thread as a user message, so the
   * conversation reads the same way whether the person tapped a button or
   * wrote their own answer.
   */
  answerQuestion(messageIndex: number, value: string): void {
    const trimmed = value.trim();
    if (!trimmed) return;
    const scope = this.activeTaskScope();
    const markAnswered = (thread: ChatMessage[]): ChatMessage[] => {
      const next = [...thread];
      const target = next[messageIndex];
      if (!target || target.type !== 'question' || target.answer) return thread; // already answered — ignore double-taps
      next[messageIndex] = { ...target, answer: trimmed };
      next.push({ type: 'user', text: trimmed });
      return next;
    };

    if (!scope) {
      this.allProjectsThread.update(markAnswered);
      return;
    }
    const key = this.scopeKey(scope.groupKey, scope.projectName, scope.taskId);
    this.conversations.update((store) => ({ ...store, [key]: markAnswered(store[key] ?? []) }));
  }

  /** Swaps which list group a sidebar side shows. If that side's chat was active, falls back to All Projects since the previously-selected project may no longer be visible. */
  changeSlotSource(side: SlotSide, groupKey: string): void {
    if (this.activeSide() === side) {
      this.clearSelection();
    }
    this.slotAssignment.update((assignment) => ({ ...assignment, [side]: groupKey }));
  }


  savePipeline(input: { id: string | null; type: PipelineInstance['type']; label: string; config: Record<string, string> }): void {
    this.pipelines.update((list) => {
      if (input.id) {
        return list.map((p) => (p.id === input.id ? { ...p, type: input.type, label: input.label, config: input.config } : p));
      }
      const id = `${input.type}-${Date.now().toString(36)}`;
      return [...list, { id, type: input.type, label: input.label, config: input.config }];
    });
  }

  pipelineLabel(id: string | undefined): string {
    if (!id) return '';
    return this.pipelines().find((p) => p.id === id)?.label ?? id;
  }

  // ---- Lists admin (list groups + projects) ----

  saveList(input: { key: string | null; label: string; src: string; accent: 'personal' | 'pro'; icon: string }): void {
    this.listGroups.update((groups) => {
      if (input.key && groups[input.key]) {
        return {
          ...groups,
          [input.key]: { ...groups[input.key], label: input.label, src: input.src, accent: input.accent, icon: input.icon },
        };
      }
      const key = input.label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `list-${Date.now().toString(36)}`;
      return {
        ...groups,
        [key]: { key, label: input.label, src: input.src, accent: input.accent, icon: input.icon, projects: [], replies: {} },
      };
    });
  }

  saveProject(input: {
    groupKey: string;
    existingName: string | null;
    name: string;
    icon: string;
    todoPipelineId: string;
    workPipelineId: string | null;
    workRepo: string;
  }): void {
    this.listGroups.update((groups) => {
      const group = groups[input.groupKey];
      if (!group) return groups;
      const existingIndex = input.existingName ? group.projects.findIndex((p) => p.name === input.existingName) : -1;

      if (existingIndex >= 0) {
        const updated: Project = {
          ...group.projects[existingIndex],
          name: input.name,
          icon: input.icon,
          todoPipelineId: input.todoPipelineId,
        };
        if (input.workPipelineId) {
          updated.workPipelineId = input.workPipelineId;
          updated.workRepo = input.workRepo;
        } else {
          delete updated.workPipelineId;
          delete updated.workRepo;
        }
        const projects = [...group.projects];
        projects[existingIndex] = updated;
        return { ...groups, [input.groupKey]: { ...group, projects } };
      }

      const created: Project = {
        name: input.name,
        icon: input.icon,
        count: 0,
        tasks: [],
        todoPipelineId: input.todoPipelineId,
      };
      if (input.workPipelineId) {
        created.workPipelineId = input.workPipelineId;
        created.workRepo = input.workRepo;
      }
      return { ...groups, [input.groupKey]: { ...group, projects: [...group.projects, created] } };
    });
  }
}
