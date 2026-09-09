import { Component, inject } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { AppStateService } from '../../core/app-state.service';
import { PIPELINE_TYPE_ICONS, PIPELINE_TYPE_LABELS } from '../../core/models';
import { PipelineModal } from '../modals/pipeline-modal';
import { BrowseModal } from '../modals/browse-modal';

@Component({
  selector: 'app-pipelines-admin',
  template: `
    <div class="admin-view">
      <div class="admin-back-row">
        <button class="admin-back-btn" (click)="state.closeAdmin()">← Back</button>
      </div>

      <div class="admin-action-row">
        <button class="admin-add-list-btn" (click)="addPipeline()">+ Add pipeline</button>
        <button class="admin-add-list-btn" (click)="browse()">🔍 Browse</button>
      </div>

      <div class="admin-list">
        @for (p of state.pipelines(); track p.id) {
          <div class="admin-group" role="button" tabindex="0" (click)="edit(p.id)" (keydown.enter)="edit(p.id)">
            <div class="admin-group-header">
              <span class="admin-group-name">{{ typeIcons[p.type] || '🔌' }} {{ p.label }}</span>
              <span class="admin-group-meta">
                <span class="admin-group-count">{{ typeLabels[p.type] }}</span>
              </span>
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
export class PipelinesAdmin {
  readonly state = inject(AppStateService);
  private readonly modalCtrl = inject(ModalController);

  readonly typeLabels = PIPELINE_TYPE_LABELS;
  readonly typeIcons = PIPELINE_TYPE_ICONS;

  async addPipeline(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: PipelineModal,
      cssClass: 'sheet-modal',
    });
    await modal.present();
  }

  async browse(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: BrowseModal,
      cssClass: 'sheet-modal',
    });
    await modal.present();
  }

  async edit(id: string): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: PipelineModal,
      componentProps: { existingId: id },
      cssClass: 'sheet-modal',
    });
    await modal.present();
  }
}
