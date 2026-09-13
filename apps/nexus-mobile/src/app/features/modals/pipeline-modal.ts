import { Component, Input, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModalController } from '@ionic/angular';
import { AppStateService } from '../../core/app-state.service';
import { PIPELINE_TYPE_FIELDS, PipelineInstance } from '../../core/models';

@Component({
  selector: 'app-pipeline-modal',
  imports: [FormsModule],
  template: `
    <div class="modal-sheet-anchor" (click)="cancel()">
    <div class="modal-sheet" (click)="$event.stopPropagation()">
      <div class="modal-title">{{ existingId ? 'Edit pipeline' : 'Add pipeline' }}</div>

      <label class="modal-field-label" for="pipeline-type-select">Type</label>
      <select id="pipeline-type-select" class="modal-input" [(ngModel)]="type" (ngModelChange)="onTypeChange()">
        <option value="roam">Roam</option>
        <option value="linear">Linear</option>
        <option value="github">GitHub</option>
        <option value="gitlab">GitLab</option>
      </select>

      <label class="modal-field-label" for="pipeline-label-input">Label <span class="modal-field-hint">(shown when picking this pipeline for a project)</span></label>
      <input id="pipeline-label-input" class="modal-input" type="text" [(ngModel)]="label" placeholder="e.g. Roam · andre-planning" />

      @for (field of fields(); track field.key) {
        <label class="modal-field-label" [for]="'pipeline-field-' + field.key">{{ field.label }}</label>
        <input [id]="'pipeline-field-' + field.key" class="modal-input" [type]="field.type" [(ngModel)]="config[field.key]" />
      }

      <div class="modal-actions">
        <button class="modal-btn cancel" (click)="cancel()">Cancel</button>
        <button class="modal-btn save" (click)="save()">Save</button>
      </div>
    </div>
    </div>
  `,
})
export class PipelineModal implements OnInit {
  @Input() existingId: string | null = null;
  @Input() presetType: PipelineInstance['type'] | null = null;

  private readonly state = inject(AppStateService);
  private readonly modalCtrl = inject(ModalController);

  type: PipelineInstance['type'] = 'roam';
  label = '';
  config: Record<string, string> = {};

  ngOnInit(): void {
    if (this.existingId) {
      const p = this.state.pipelines().find((x) => x.id === this.existingId);
      if (p) {
        this.type = p.type;
        this.label = p.label;
        this.config = { ...p.config };
      }
    } else if (this.presetType) {
      this.type = this.presetType;
      this.onTypeChange();
    } else {
      this.onTypeChange();
    }
  }

  fields() {
    return PIPELINE_TYPE_FIELDS[this.type]?.fields ?? [];
  }

  onTypeChange(): void {
    // Switching type starts config fresh — a Roam token and a GitHub token
    // aren't interchangeable, so don't carry stale values across types.
    const carryOver = this.existingId && this.state.pipelines().find((x) => x.id === this.existingId)?.type === this.type;
    this.config = carryOver ? { ...this.config } : {};
  }

  save(): void {
    if (!this.label.trim()) {
      this.modalCtrl.dismiss();
      return;
    }
    this.state.savePipeline({ id: this.existingId, type: this.type, label: this.label.trim(), config: this.config });
    this.modalCtrl.dismiss();
  }

  cancel(): void {
    this.modalCtrl.dismiss();
  }
}
