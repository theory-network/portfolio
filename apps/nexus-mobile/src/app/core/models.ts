// Domain models ported 1:1 from command-center-mockup-v2.html's in-memory
// data shapes. Keeping these as plain interfaces (not classes) matches the
// mockup's plain-object style and keeps AppStateService's signals simple.

export type PipelineType = 'roam' | 'linear' | 'github' | 'gitlab';

export interface PipelineInstance {
  id: string;
  type: PipelineType;
  label: string;
  config: Record<string, string>;
}

export interface ProjectTask {
  id: string;
  title: string;
  status: 'open' | 'done';
}

export interface Project {
  name: string;
  icon: string;
  count: number;
  tasks: ProjectTask[];
  todoPipelineId?: string;
  workPipelineId?: string;
  workRepo?: string;
}

export interface ListGroup {
  key: string;
  label: string;
  src: string;
  accent: 'personal' | 'pro';
  icon: string;
  projects: Project[];
  replies: Record<string, string>;
}

export type SlotSide = 'left' | 'right';

export interface SlotAssignment {
  left: string;
  right: string;
}

export interface ChatMessage {
  type: 'system' | 'assistant' | 'user' | 'question';
  text: string;
  /** For type 'question' — the tappable choices, mirroring Claude's own ask_user_input interface. */
  options?: string[];
  /** For type 'question' — set once answered (by tapping an option or submitting free text), so the card renders as resolved instead of interactive. */
  answer?: string;
}

/** Which task (or none, meaning all-tasks) was last active for a project — the "resume" memory keyed by `${groupKey}:${projectName}`. */
export type LastScopeMap = Record<string, string | null>;

/** Conversation store keyed by `${groupKey}:${projectName}:${taskId ?? 'all'}`. Mock/in-memory only — real persistence is the deferred Postgres design. */
export type ConversationStore = Record<string, ChatMessage[]>;

export interface ActiveTaskScope {
  groupKey: string;
  projectName: string;
  taskId: string | null;
}

/** Which community pipeline catalog entries exist to browse — separate from the user's configured PipelineInstance list. */
export interface CommunityPipeline {
  type: PipelineType | 'notion' | 'jira' | 'slack' | 'clickup';
  name: string;
  author: string;
  description: string;
  available: boolean;
}

export const PIPELINE_TYPE_LABELS: Record<string, string> = {
  roam: 'Roam',
  linear: 'Linear',
  github: 'GitHub',
  gitlab: 'GitLab',
};

export const PIPELINE_TYPE_ICONS: Record<string, string> = {
  roam: '🧠',
  linear: '📐',
  github: '🐙',
  gitlab: '🦊',
};

export const ICON_CATEGORIES: { label: string; icons: string[] }[] = [
  { label: 'Suggested', icons: ['📁', '🗂️', '🏠', '📘', '✍️', '🥋', '⛓️', '⚙️', '🎨', '💼', '📇', '📌'] },
  { label: 'Work & tools', icons: ['💻', '🛠️', '📊', '📈', '🧩', '🔧', '🗄️', '📎', '🧮', '🖥️', '🧪', '📐'] },
  { label: 'Life & people', icons: ['👨‍👩‍👧', '🧒', '📚', '🏋️', '🧘', '🍳', '🚗', '🌱', '💰', '🎯', '🐾', '🎓'] },
  { label: 'Symbols', icons: ['⭐', '🔥', '✅', '⚡', '🔔', '🔒', '🚀', '📅', '💡', '🧭', '🔖', '🏁'] },
];

export interface PickerOption {
  key: string;
  label: string;
  src: string;
  accent: 'personal' | 'pro';
  icon: string;
}

export interface PipelineTypeField {
  key: string;
  label: string;
  type: 'text' | 'password';
}

/** Which config fields the pipeline modal shows per type, and which role (todo/work) each type is offered for. */
export const PIPELINE_TYPE_FIELDS: Record<string, { role: 'todo' | 'work'; fields: PipelineTypeField[] }> = {
  roam: {
    role: 'todo',
    fields: [
      { key: 'apiToken', label: 'API Token', type: 'password' },
      { key: 'graphName', label: 'Graph name', type: 'text' },
    ],
  },
  linear: {
    role: 'todo',
    fields: [{ key: 'apiKey', label: 'API Key', type: 'password' }],
  },
  github: {
    role: 'work',
    fields: [{ key: 'token', label: 'Personal access token', type: 'password' }],
  },
  gitlab: {
    role: 'work',
    fields: [
      { key: 'token', label: 'Personal access token', type: 'password' },
      { key: 'baseUrl', label: 'Base URL (self-hosted, optional)', type: 'text' },
    ],
  },
};
