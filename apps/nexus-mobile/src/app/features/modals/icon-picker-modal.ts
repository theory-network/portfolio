import { Component, inject } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { ICON_CATEGORIES } from '../../core/models';

@Component({
  selector: 'app-icon-picker-modal',
  template: `
    <div class="modal-sheet-anchor" (click)="cancel()">
    <div class="modal-sheet icon-picker-sheet" (click)="$event.stopPropagation()">
      <div class="modal-title">Choose an icon</div>

      <div class="icon-picker-grid-scroll">
        @for (category of categories; track category.label) {
          <div class="icon-picker-category-label">{{ category.label }}</div>
          <div class="icon-picker-grid">
            @for (icon of category.icons; track icon) {
              <button type="button" class="icon-picker-item" (click)="pick(icon)">{{ icon }}</button>
            }
          </div>
        }
      </div>

      <div class="modal-actions">
        <button class="modal-btn cancel" (click)="cancel()">Cancel</button>
      </div>
    </div>
    </div>
  `,
})
export class IconPickerModal {
  private readonly modalCtrl = inject(ModalController);
  readonly categories = ICON_CATEGORIES;

  pick(icon: string): void {
    this.modalCtrl.dismiss(icon);
  }

  cancel(): void {
    this.modalCtrl.dismiss();
  }
}
