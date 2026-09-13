import { Component, Input, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { KeyValuePipe } from '@angular/common';
import { ModalController } from '@ionic/angular';
import { AppStateService } from '../../core/app-state.service';
import { PIPELINE_TYPE_FIELDS } from '../../core/models';
import { IconPickerModal } from './icon-picker-modal';

@Component({
  selector: 'app-project-modal',
  imports: [FormsModule, KeyValuePipe],
  template: `
    <div class="modal-sheet-anchor" (click)="cancel()">
    <div class="modal-sheet" (click)="$event.stopPropagation()">
      <div class="modal-title">{{ existingProjectName ? 'Edit project' : 'Add project' }}</div>

      <label class="modal-field-label" for="project-icon-btn">Icon</label>
      <button id="project-icon-btn" type="button" class="icon-field-btn" (click)="pickIcon()">
        <span>{{ icon }}</span>
        <span class="icon-field-chevron">▾</span>
      </button>

      <label class="modal-field-label" for="project-group-select">List</label>
      <select id="project-group-select" class="modal-input" [(ngModel)]="groupKey">
        @for (group of state.listGroups() | keyvalue: preserveOrder; track group.key) {
          <option [value]="group.key">{{ group.value.label }}</option>
        }
      </select>

      <label class="modal-field-label" for="project-name-input">Project / graph name</label>
      <input id="project-name-input" class="modal-input" type="text" [(ngModel)]="name" placeholder="e.g. rochester-personal" />

      <label class="modal-field-label" for="project-todo-select">Todo source <span class="modal-field-hint">(tracking &amp; status)</span></label>
      <select id="project-todo-select" class="modal-input" [(ngModel)]="todoPipelineId">
        @for (p of todoPipelineOptions(); track p.id) {
          <option [value]="p.id">{{ p.label }}</option>
        }
      </select>

      <label class="modal-field-label" for="project-work-select">Work source <span class="modal-field-hint">(optional — where the work happens)</span></label>
      <select id="project-work-select" class="modal-input" [(ngModel)]="workPipelineId">
        <option [value]="null">None</option>
        @for (p of workPipelineOptions(); track p.id) {
          <option [value]="p.id">{{ p.label }}</option>
        }
      </select>

      @if (workPipelineId) {
        <div>
          <label class="modal-field-label" for="project-repo-input">Repo <span class="modal-field-hint">(org/repo)</span></label>
          <input id="project-repo-input" class="modal-input" type="text" [(ngModel)]="workRepo" placeholder="e.g. andre/rewards-platform" />
        </div>
      }

      <p class="modal-field-hint" style="display:block; margin-top:10px;">
        Don't see the pipeline you need? <a href="#" (click)="addPipeline($event)">Add one</a>.
      </p>

      <div class="modal-actions">
        <button class="modal-btn cancel" (click)="cancel()">Cancel</button>
        <button class="modal-btn save" (click)="save()">Save</button>
      </div>
    </div>
    </div>
  `,
})
export class ProjectModal implements OnInit {
  @Input() presetGroupKey: string | null = null;
  @Input() existingProjectName: string | null = null;

  readonly state = inject(AppStateService);
  private readonly modalCtrl = inject(ModalController);

  groupKey = '';
  name = '';
  icon = '📁';
  todoPipelineId = '';
  workPipelineId: string | null = null;
  workRepo = '';

  // Angular's keyvalue pipe alphabetizes by default; this keeps listGroups
  // in the same insertion order the mockup used (Object.keys iteration).
  preserveOrder = () => 0;

  ngOnInit(): void {
    this.groupKey = this.presetGroupKey ?? Object.keys(this.state.listGroups())[0];
    if (this.existingProjectName) {
      const project = this.state.findProject(this.groupKey, this.existingProjectName);
      if (project) {
        this.name = project.name;
        this.icon = project.icon;
        this.todoPipelineId = project.todoPipelineId ?? '';
        this.workPipelineId = project.workPipelineId ?? null;
        this.workRepo = project.workRepo ?? '';
      }
    }
  }

  todoPipelineOptions() {
    return this.state.pipelines().filter((p) => PIPELINE_TYPE_FIELDS[p.type]?.role === 'todo');
  }

  workPipelineOptions() {
    return this.state.pipelines().filter((p) => PIPELINE_TYPE_FIELDS[p.type]?.role === 'work');
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

  addPipeline(event: Event): void {
    event.preventDefault();
    this.modalCtrl.dismiss();
    this.state.openPipelinesAdmin();
  }

  save(): void {
    if (!this.name.trim()) {
      this.modalCtrl.dismiss();
      return;
    }
    this.state.saveProject({
      groupKey: this.groupKey,
      existingName: this.existingProjectName,
      name: this.name.trim(),
      icon: this.icon,
      todoPipelineId: this.todoPipelineId,
      workPipelineId: this.workPipelineId,
      workRepo: this.workRepo.trim(),
    });
    this.modalCtrl.dismiss();
  }

  cancel(): void {
    this.modalCtrl.dismiss();
  }
}
