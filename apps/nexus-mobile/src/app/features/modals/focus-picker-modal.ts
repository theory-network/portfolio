import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModalController } from '@ionic/angular';
import { AppStateService } from '../../core/app-state.service';
import { FocusService } from '../../core/focus.service';

@Component({
  selector: 'app-focus-picker-modal',
  imports: [FormsModule],
  template: `
    <div class="modal-sheet-anchor">
    <div class="modal-sheet">
      <div class="modal-title">Focus — {{ projectName }}</div>

      <div class="modal-field-label">Task</div>
      <div>
        @if (openTasks().length === 0) {
          <div class="browse-empty">No open tasks to focus on.</div>
        } @else {
          @for (task of openTasks(); track task.id) {
            <div
              class="task-picker-row"
              [class.selected]="selectedTaskId() === task.id"
              role="button"
              tabindex="0"
              (click)="selectedTaskId.set(task.id)"
              (keydown.enter)="selectedTaskId.set(task.id)">
              <span class="task-picker-row-icon">{{ selectedTaskId() === task.id ? '🎯' : '⭕' }}</span>
              <span>{{ task.title }}</span>
            </div>
          }
        }
      </div>

      <label class="modal-field-label" for="focus-threshold-select">Stall reminder after</label>
      <select id="focus-threshold-select" class="modal-input" [(ngModel)]="thresholdMinutes">
        <option [ngValue]="15">15 min</option>
        <option [ngValue]="25">25 min</option>
        <option [ngValue]="45">45 min</option>
        <option [ngValue]="60">60 min</option>
      </select>

      <div class="modal-actions">
        <button class="modal-btn cancel" (click)="cancel()">Cancel</button>
        <button class="modal-btn save" [disabled]="!selectedTaskId()" (click)="start()">Start Focus</button>
      </div>
    </div>
    </div>
  `,
})
export class FocusPickerModal implements OnInit {
  @Input({ required: true }) groupKey!: string;
  @Input({ required: true }) projectName!: string;

  private readonly state = inject(AppStateService);
  private readonly focusService = inject(FocusService);
  private readonly modalCtrl = inject(ModalController);

  readonly selectedTaskId = signal<string | null>(null);
  thresholdMinutes = 25;

  openTasks() {
    return this.state.findProject(this.groupKey, this.projectName)?.tasks.filter((t) => t.status === 'open') ?? [];
  }

  ngOnInit(): void {
    const project = this.state.findProject(this.groupKey, this.projectName);
    if (!project) return;
    const resolved = this.focusService.resolveFocusStart(project, this.state.focusDefaults());
    this.selectedTaskId.set(resolved.taskId);
    this.thresholdMinutes = resolved.thresholdMinutes;
  }

  async start(): Promise<void> {
    const taskId = this.selectedTaskId();
    if (!taskId) return;

    const active = this.state.activeFocus();
    if (active && active.groupKey === this.groupKey && active.projectName === this.projectName) {
      await this.focusService.switchTask(taskId, this.thresholdMinutes);
    } else {
      await this.focusService.start(this.groupKey, this.projectName, taskId, this.thresholdMinutes);
    }
    this.modalCtrl.dismiss();
  }

  cancel(): void {
    this.modalCtrl.dismiss();
  }
}
