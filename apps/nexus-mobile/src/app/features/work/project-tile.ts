import { Component, Input, computed, inject } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { AppStateService } from '../../core/app-state.service';
import { Project, SlotSide } from '../../core/models';
import { TaskPickerModal } from '../modals/task-picker-modal';

@Component({
  selector: 'app-project-tile',
  template: `
    <div class="proj" role="button" tabindex="0" [class.active]="isActive()" [attr.title]="project.name" (click)="onTileClick()" (keydown.enter)="onTileClick()"
         (pointerdown)="onPointerDown()" (pointerup)="onPointerCancel()"
         (pointerleave)="onPointerCancel()" (pointercancel)="onPointerCancel()">
      <div class="icon-tile">
        {{ project.icon }}
        @if (project.count > 0) {
          <span class="badge" role="button" tabindex="0" (click)="onBadgeClick($event)" (keydown.enter)="onBadgeClick($event)">{{ project.count }}</span>
        }
      </div>
    </div>
  `,
})
export class ProjectTile {
  @Input({ required: true }) project!: Project;
  @Input({ required: true }) side!: SlotSide;
  @Input({ required: true }) groupKey!: string;

  private readonly state = inject(AppStateService);
  private readonly modalCtrl = inject(ModalController);

  private longPressTimer?: ReturnType<typeof setTimeout>;
  private longPressTriggered = false;

  readonly isActive = computed(() => {
    const scope = this.state.activeTaskScope();
    return !!scope && scope.groupKey === this.groupKey && scope.projectName === this.project.name;
  });

  onTileClick(): void {
    if (this.longPressTriggered) {
      this.longPressTriggered = false;
      return;
    }
    if (this.isActive()) {
      this.state.clearSelection();
      return;
    }
    this.state.openProjectChat(this.side, this.groupKey, this.project.name);
  }

  onBadgeClick(event: Event): void {
    event.stopPropagation();
    this.openTaskPicker();
  }

  onPointerDown(): void {
    this.longPressTriggered = false;
    this.longPressTimer = setTimeout(() => {
      this.longPressTriggered = true;
      this.openTaskPicker();
    }, 500);
  }

  onPointerCancel(): void {
    clearTimeout(this.longPressTimer);
  }

  private async openTaskPicker(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: TaskPickerModal,
      componentProps: { side: this.side, groupKey: this.groupKey, projectName: this.project.name },
      cssClass: 'sheet-modal',
    });
    await modal.present();
  }
}
