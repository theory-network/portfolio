import { Component, Input, inject } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { AppStateService } from '../../core/app-state.service';
import { SlotSide } from '../../core/models';

@Component({
  selector: 'app-task-picker-modal',
  template: `
    <div class="modal-sheet-anchor">
    <div class="modal-sheet">
      <div class="modal-title">Choose a task — {{ projectName }}</div>

      <div>
        <div class="task-picker-row" role="button" tabindex="0" (click)="pick(null)" (keydown.enter)="pick(null)">
          <span class="task-picker-row-icon">🗂️</span>
          <span>All tasks</span>
        </div>

        @if (tasks.length === 0) {
          <div class="browse-empty">No tasks yet for this project.</div>
        } @else {
          @for (task of tasks; track task.id) {
            <div class="task-picker-row" role="button" tabindex="0" (click)="pick(task.id)" (keydown.enter)="pick(task.id)">
              <span class="task-picker-row-icon">{{ task.status === 'done' ? '✅' : '⭕' }}</span>
              <span>{{ task.title }}</span>
            </div>
          }
        }
      </div>

      <div class="modal-actions">
        <button class="modal-btn cancel" (click)="cancel()">Cancel</button>
      </div>
    </div>
    </div>
  `,
})
export class TaskPickerModal {
  @Input({ required: true }) side!: SlotSide;
  @Input({ required: true }) groupKey!: string;
  @Input({ required: true }) projectName!: string;

  private readonly state = inject(AppStateService);
  private readonly modalCtrl = inject(ModalController);

  get tasks() {
    return this.state.findProject(this.groupKey, this.projectName)?.tasks ?? [];
  }

  pick(taskId: string | null): void {
    this.state.renderProjectChat(this.side, this.groupKey, this.projectName, taskId);
    this.modalCtrl.dismiss();
  }

  cancel(): void {
    this.modalCtrl.dismiss();
  }
}
