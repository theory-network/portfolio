import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModalController } from '@ionic/angular';
import { AppStateService } from '../../core/app-state.service';
import { PIPELINE_TYPE_ICONS, PIPELINE_TYPE_LABELS, PipelineInstance } from '../../core/models';
import { PipelineModal } from './pipeline-modal';

@Component({
  selector: 'app-browse-modal',
  imports: [FormsModule],
  template: `
    <div class="modal-sheet-anchor" (click)="close()">
    <div class="modal-sheet" (click)="$event.stopPropagation()">
      <div class="modal-title">Browse community pipelines</div>

      <input class="modal-input" type="text" placeholder="Search pipelines…" [(ngModel)]="query" />

      <div class="browse-filter-row">
        <span class="browse-filter-chip" role="button" tabindex="0" [class.active]="typeFilter() === ''" (click)="typeFilter.set('')" (keydown.enter)="typeFilter.set('')">All</span>
        @for (t of types(); track t) {
          <span class="browse-filter-chip" role="button" tabindex="0" [class.active]="typeFilter() === t" (click)="typeFilter.set(t)" (keydown.enter)="typeFilter.set(t)">{{ typeLabels[t] || t }}</span>
        }
      </div>

      <div class="browse-results">
        @if (results().length === 0) {
          <div class="browse-empty">No pipelines match your search.</div>
        } @else {
          @for (p of results(); track p.name) {
            <div class="community-card" [class.unavailable]="!p.available">
              <div class="community-card-top">
                <div>
                  <div class="community-card-name">{{ typeIcons[p.type] || '🔌' }} {{ p.name }}</div>
                  <div class="community-card-author">{{ p.author }}</div>
                </div>
                @if (p.available) {
                  <button class="community-card-add-btn" (click)="add(p.type)">Add</button>
                } @else {
                  <span class="community-card-badge">Coming soon</span>
                }
              </div>
              <div class="community-card-desc">{{ p.description }}</div>
            </div>
          }
        }
      </div>

      <div class="modal-actions">
        <button class="modal-btn cancel" (click)="close()">Close</button>
      </div>
    </div>
    </div>
  `,
})
export class BrowseModal {
  private readonly state = inject(AppStateService);
  private readonly modalCtrl = inject(ModalController);

  readonly typeLabels = PIPELINE_TYPE_LABELS;
  readonly typeIcons = PIPELINE_TYPE_ICONS;

  query = '';
  readonly typeFilter = signal('');

  readonly types = computed(() => Array.from(new Set(this.state.communityPipelines().map((p) => p.type))));

  // Plain method, not computed(): `query` is a regular ngModel-bound field,
  // not a signal, so this needs to re-run on each change-detection pass
  // (which Angular's zoneless scheduler still triggers on input events via
  // the template's own event bindings) rather than only on signal changes.
  results() {
    const q = this.query.trim().toLowerCase();
    const t = this.typeFilter();
    return this.state.communityPipelines().filter((p) => {
      const matchesType = !t || p.type === t;
      const matchesQuery = !q || p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
      return matchesType && matchesQuery;
    });
  }

  async add(type: string): Promise<void> {
    await this.modalCtrl.dismiss();
    const modal = await this.modalCtrl.create({
      component: PipelineModal,
      componentProps: { presetType: type as PipelineInstance['type'] },
      cssClass: 'sheet-modal',
    });
    await modal.present();
  }

  close(): void {
    this.modalCtrl.dismiss();
  }
}
