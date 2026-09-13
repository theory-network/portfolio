import { Component, Input, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModalController } from '@ionic/angular';
import { AppStateService } from '../../core/app-state.service';
import { IconPickerModal } from './icon-picker-modal';

@Component({
  selector: 'app-list-modal',
  imports: [FormsModule],
  template: `
    <div class="modal-sheet-anchor" (click)="cancel()">
    <div class="modal-sheet" (click)="$event.stopPropagation()">
      <div class="modal-title">{{ existingKey ? 'Edit list' : 'Add list' }}</div>

      <label class="modal-field-label" for="list-icon-btn">Icon</label>
      <button id="list-icon-btn" type="button" class="icon-field-btn" (click)="pickIcon()">
        <span>{{ icon }}</span>
        <span class="icon-field-chevron">▾</span>
      </button>

      <label class="modal-field-label" for="list-label-input">List name</label>
      <input id="list-label-input" class="modal-input" type="text" [(ngModel)]="label" placeholder="e.g. Side Project" />

      <label class="modal-field-label" for="list-src-input">Source</label>
      <input id="list-src-input" class="modal-input" type="text" [(ngModel)]="src" placeholder="e.g. Roam, Linear" />

      <label class="modal-field-label" for="list-accent-select">Accent</label>
      <select id="list-accent-select" class="modal-input" [(ngModel)]="accent">
        <option value="personal">Amber (Personal-style)</option>
        <option value="pro">Teal (Pro-style)</option>
      </select>

      <div class="modal-actions">
        <button class="modal-btn cancel" (click)="cancel()">Cancel</button>
        <button class="modal-btn save" (click)="save()">Save</button>
      </div>
    </div>
    </div>
  `,
})
export class ListModal implements OnInit {
  @Input() existingKey: string | null = null;

  private readonly state = inject(AppStateService);
  private readonly modalCtrl = inject(ModalController);

  label = '';
  src = '';
  accent: 'personal' | 'pro' = 'personal';
  icon = '🗂️';

  ngOnInit(): void {
    if (this.existingKey) {
      const group = this.state.listGroups()[this.existingKey];
      if (group) {
        this.label = group.label;
        this.src = group.src;
        this.accent = group.accent;
        this.icon = group.icon;
      }
    }
  }

  async pickIcon(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: IconPickerModal,
      cssClass: 'sheet-modal',
    });
    await modal.present();
    const { data } = await modal.onWillDismiss();
    if (data) this.icon = data;
  }

  save(): void {
    if (!this.label.trim()) {
      this.modalCtrl.dismiss();
      return;
    }
    this.state.saveList({
      key: this.existingKey,
      label: this.label.trim(),
      src: this.src.trim() || 'Custom',
      accent: this.accent,
      icon: this.icon,
    });
    this.modalCtrl.dismiss();
  }

  cancel(): void {
    this.modalCtrl.dismiss();
  }
}
