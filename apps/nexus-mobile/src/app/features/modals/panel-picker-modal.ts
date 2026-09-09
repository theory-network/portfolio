import { Component, Input, inject } from '@angular/core';
import { KeyValuePipe } from '@angular/common';
import { ModalController } from '@ionic/angular';
import { AppStateService } from '../../core/app-state.service';
import { SlotSide } from '../../core/models';

@Component({
  selector: 'app-panel-picker-modal',
  imports: [KeyValuePipe],
  template: `
    <div class="picker-modal">
      <div class="picker-title">Choose list for this side</div>
      <div>
        @for (group of state.listGroups() | keyvalue: preserveOrder; track group.key) {
          <div
            class="picker-option"
            role="button"
            tabindex="0"
            [class.selected]="state.slotAssignment()[side] === group.key"
            (click)="choose(group.key)"
            (keydown.enter)="choose(group.key)"
          >
            <span class="picker-option-icon">{{ group.value.icon || group.value.projects[0]?.icon || '📁' }}</span>
            <span class="picker-option-name">{{ group.value.label }}</span>
            <span class="picker-option-src">{{ group.value.src }}</span>
          </div>
        }
      </div>
      <button class="picker-close" (click)="close()">Cancel</button>
    </div>
  `,
})
export class PanelPickerModal {
  @Input({ required: true }) side!: SlotSide;

  readonly state = inject(AppStateService);
  private readonly modalCtrl = inject(ModalController);

  // Keeps listGroups in insertion order rather than the keyvalue pipe's default alphabetical sort.
  preserveOrder = () => 0;

  choose(groupKey: string): void {
    this.state.changeSlotSource(this.side, groupKey);
    this.modalCtrl.dismiss();
  }

  close(): void {
    this.modalCtrl.dismiss();
  }
}
