import { Injectable, effect, inject } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { CapgoLiveActivities } from '@capgo/capacitor-live-activities';
import type { ActivityLayout, DynamicIslandLayout, LayoutElementText } from '@capgo/capacitor-live-activities';
import { ForegroundService } from '@capawesome-team/capacitor-android-foreground-service';
import { AppStateService } from './app-state.service';
import { FocusDefaults, Project, ProjectTask } from './models';

// One Focus session runs app-wide at a time, so fixed ids are safe — no need
// to derive per-task ids for either the stall reminder or the Android
// foreground-service notification.
const STALL_REMINDER_ID = 424242;
const FOREGROUND_SERVICE_NOTIFICATION_ID = 424242;
const FOREGROUND_SERVICE_CHANNEL_ID = 'focus';

function liveActivityData(project: Project, task: ProjectTask): Record<string, unknown> {
  return { projectName: project.name, taskTitle: task.title };
}

/** Minimal lock-screen + Dynamic Island layout for a Focus session — task title under the project name, a target glyph everywhere the Island needs *something*. */
function buildLiveActivityLayout(): { layout: ActivityLayout; dynamicIslandLayout: DynamicIslandLayout } {
  const glyph: LayoutElementText = { type: 'text', content: '🎯', fontSize: 16 };
  const projectText: LayoutElementText = { type: 'text', content: '{{projectName}}', fontSize: 12, color: '#8a8f98' };
  const taskText: LayoutElementText = { type: 'text', content: '{{taskTitle}}', fontSize: 15, fontWeight: 'semibold' };

  const layout: ActivityLayout = {
    type: 'container',
    direction: 'vertical',
    spacing: 4,
    children: [projectText, taskText],
  };

  const dynamicIslandLayout: DynamicIslandLayout = {
    expanded: { leading: glyph, center: taskText },
    compactLeading: glyph,
    compactTrailing: glyph,
    minimal: glyph,
  };

  return { layout, dynamicIslandLayout };
}

/**
 * Starts/updates/ends the platform-native Focus indicator (iOS Live
 * Activity, Android foreground-service notification) and the stall-reminder
 * local notification.
 *
 * Web fallback: `@capacitor/local-notifications` ships a real web
 * implementation (browser `Notification` API, with `setTimeout`-based
 * scheduling) — so the stall reminder works in a plain browser tab, not just
 * under Capacitor's native shell. There's no equivalent for the persistent
 * activity indicator itself: `@capgo/capacitor-live-activities`'s own web
 * implementation reports `areActivitiesSupported() -> false` rather than
 * faking a Live Activity, and `@capawesome-team/capacitor-android-foreground-service`
 * ships no web implementation at all (it's an Android-only OS concept) — a
 * browser tab has no persistent-indicator equivalent to fall back to, so
 * that piece is simply absent on web, not stubbed.
 */
@Injectable({ providedIn: 'root' })
export class FocusService {
  private readonly state = inject(AppStateService);
  private readonly platform = Capacitor.getPlatform();

  constructor() {
    // Auto-cancel: if the focused task flips to 'done' by any path (there's
    // no "mark task done" UI yet — this fires the moment one exists), drop
    // the pending stall reminder. The activity itself stays up; only the
    // reminder is cancelled, per spec.
    effect(() => {
      const focus = this.state.activeFocus();
      if (!focus) return;
      const task = this.state.findProject(focus.groupKey, focus.projectName)?.tasks.find((t) => t.id === focus.taskId);
      if (task?.status === 'done') {
        void this.cancelStallReminder();
      }
    });
  }

  /**
   * Fallback chain: project's own last focus > global default > first open
   * task. Unlike a literal reading of that chain, a carried-over taskId is
   * only trusted if it's still an open task on *this* project — task ids
   * aren't globally unique (every project's tasks start `t1`, `t2`, ...), so
   * an unvalidated global default could silently point at the wrong task.
   * Mirrors the same "stale scope falls back silently" rule chat-context.ts
   * already uses for task-scoped chat.
   */
  resolveFocusStart(project: Project, defaults: FocusDefaults): { taskId: string | null; thresholdMinutes: number } {
    const openTasks = project.tasks.filter((t) => t.status === 'open');
    const candidate = project.lastFocusTaskId ?? defaults.lastTaskId;
    const taskId = (candidate && openTasks.find((t) => t.id === candidate)?.id) ?? openTasks[0]?.id ?? null;
    const thresholdMinutes = project.focusThresholdMinutes ?? defaults.lastThresholdMinutes ?? 25;
    return { taskId, thresholdMinutes };
  }

  async start(groupKey: string, projectName: string, taskId: string, thresholdMinutes: number): Promise<void> {
    if (this.state.activeFocus()) {
      await this.stop();
    }

    const project = this.state.findProject(groupKey, projectName);
    const task = project?.tasks.find((t) => t.id === taskId);
    if (!project || !task) return;

    const activityId = await this.startNativeActivity(project, task);

    this.state.setActiveFocus({
      groupKey,
      projectName,
      taskId,
      startedAt: new Date().toISOString(),
      thresholdMinutes,
      activityId,
    });
    this.state.setProjectFocusHistory(groupKey, projectName, taskId, thresholdMinutes);
    this.state.setFocusDefaults({ lastProjectKey: `${groupKey}:${projectName}`, lastTaskId: taskId, lastThresholdMinutes: thresholdMinutes });

    await this.scheduleStallReminder(task.title, thresholdMinutes);
  }

  /**
   * Updates the same native activity in place rather than starting a new
   * one. `thresholdMinutes` is optional — omit it to keep the session's
   * current threshold (the plain "switch task" path); pass it when the
   * picker was reopened on an already-focused project and the user changed
   * the threshold too, so that edit isn't silently dropped.
   */
  async switchTask(taskId: string, thresholdMinutes?: number): Promise<void> {
    const focus = this.state.activeFocus();
    if (!focus) return;
    const project = this.state.findProject(focus.groupKey, focus.projectName);
    const task = project?.tasks.find((t) => t.id === taskId);
    if (!project || !task) return;
    const nextThreshold = thresholdMinutes ?? focus.thresholdMinutes;

    await this.updateNativeActivity(focus.activityId, project, task);

    this.state.setActiveFocus({ ...focus, taskId, thresholdMinutes: nextThreshold, startedAt: new Date().toISOString() });
    this.state.setProjectFocusHistory(focus.groupKey, focus.projectName, taskId, nextThreshold);
    this.state.setFocusDefaults({
      lastProjectKey: `${focus.groupKey}:${focus.projectName}`,
      lastTaskId: taskId,
      lastThresholdMinutes: nextThreshold,
    });

    await this.cancelStallReminder();
    await this.scheduleStallReminder(task.title, nextThreshold);
  }

  async stop(): Promise<void> {
    const focus = this.state.activeFocus();
    if (!focus) return;
    await this.endNativeActivity(focus.activityId);
    await this.cancelStallReminder();
    this.state.setActiveFocus(null);
  }

  // ---- Native activity plumbing ----

  private async startNativeActivity(project: Project, task: ProjectTask): Promise<string | undefined> {
    // Ask the plugin itself rather than branching on platform — its web
    // implementation already answers `false` safely (see class doc), so this
    // one check covers "real iOS 16.1+ device" without a separate web case.
    const support = await CapgoLiveActivities.areActivitiesSupported();
    if (support.supported) {
      const { layout, dynamicIslandLayout } = buildLiveActivityLayout();
      const result = await CapgoLiveActivities.startActivity({ layout, dynamicIslandLayout, data: liveActivityData(project, task) });
      return result.activityId;
    }
    if (this.platform === 'android') {
      await ForegroundService.requestPermissions().catch(() => undefined);
      await ForegroundService.createNotificationChannel({ id: FOREGROUND_SERVICE_CHANNEL_ID, name: 'Focus' }).catch(() => undefined);
      await ForegroundService.startForegroundService({
        id: FOREGROUND_SERVICE_NOTIFICATION_ID,
        title: `Focused: ${project.name}`,
        body: task.title,
        smallIcon: 'ic_stat_focus',
        notificationChannelId: FOREGROUND_SERVICE_CHANNEL_ID,
      });
      return String(FOREGROUND_SERVICE_NOTIFICATION_ID);
    }
    // Web (or an unsupported iOS device): no Capacitor-provided persistent
    // indicator exists for this case — the stall reminder below still works.
    console.log(`[focus] no persistent activity indicator available on "${this.platform}" (${support.reason ?? 'not iOS'}) — "${task.title}" (${project.name}) is focused in-app only`);
    return undefined;
  }

  private async updateNativeActivity(activityId: string | undefined, project: Project, task: ProjectTask): Promise<void> {
    if (this.platform === 'android') {
      await ForegroundService.updateForegroundService({
        id: FOREGROUND_SERVICE_NOTIFICATION_ID,
        title: `Focused: ${project.name}`,
        body: task.title,
        smallIcon: 'ic_stat_focus',
        notificationChannelId: FOREGROUND_SERVICE_CHANNEL_ID,
      });
      return;
    }
    if (!activityId) return;
    await CapgoLiveActivities.updateActivity({ activityId, data: liveActivityData(project, task) });
  }

  private async endNativeActivity(activityId: string | undefined): Promise<void> {
    if (this.platform === 'android') {
      await ForegroundService.stopForegroundService();
      return;
    }
    if (!activityId) return;
    await CapgoLiveActivities.endActivity({ activityId, dismissalPolicy: 'immediate' });
  }

  // ---- Stall reminder ----
  //
  // No platform gate here on purpose: @capacitor/local-notifications' own
  // web implementation (browser Notification API + setTimeout scheduling)
  // makes this work in a plain browser tab too. It throws `unavailable()`
  // when the browser lacks Notification support at all (or blocks the
  // permission prompt) — caught below so a browser without notification
  // support just means no reminder fires, not a broken Focus session.

  private async scheduleStallReminder(taskTitle: string, thresholdMinutes: number): Promise<void> {
    try {
      await LocalNotifications.requestPermissions();
      await LocalNotifications.schedule({
        notifications: [
          {
            id: STALL_REMINDER_ID,
            title: 'Still on this?',
            body: `"${taskTitle}" has been open for ${thresholdMinutes} minutes.`,
            schedule: { at: new Date(Date.now() + thresholdMinutes * 60_000) },
          },
        ],
      });
    } catch (err) {
      console.log(`[focus] stall reminder unavailable on "${this.platform}": ${err instanceof Error ? err.message : err}`);
    }
  }

  private async cancelStallReminder(): Promise<void> {
    await LocalNotifications.cancel({ notifications: [{ id: STALL_REMINDER_ID }] }).catch(() => undefined);
  }
}
