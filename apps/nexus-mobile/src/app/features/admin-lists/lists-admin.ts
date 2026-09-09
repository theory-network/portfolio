import { Component, inject, signal } from '@angular/core';
import { KeyValuePipe } from '@angular/common';
import { ModalController } from '@ionic/angular';
import { AppStateService } from '../../core/app-state.service';
import { ProjectModal } from '../modals/project-modal';
import { ListModal } from '../modals/list-modal';

@Component({
  selector: 'app-lists-admin',
  imports: [KeyValuePipe],
  template: `
    <div class="admin-view">
      <div class="admin-back-row">
        <button class="admin-back-btn" (click)="state.closeAdmin()">← Back</button>
      </div>

      <button class="admin-add-list-btn" (click)="addList()">+ Add list</button>

      <div class="admin-list">
        @for (group of state.listGroups() | keyvalue: preserveOrder; track group.key) {
          <div class="admin-group" [class.expanded]="expanded().has(group.key)">
            <div class="admin-group-header" role="button" tabindex="0" (click)="toggle(group.key)" (keydown.enter)="toggle(group.key)">
              <span class="admin-group-name" [class]="group.value.accent">
                {{ group.value.icon || '📁' }} {{ group.value.label }} · {{ group.value.src }}
              </span>
              <span class="admin-group-meta">
                <span class="admin-group-count">{{ group.value.projects.length }}</span>
                <span class="admin-group-chevron">▸</span>
              </span>
            </div>
            <div class="admin-group-body">
              @for (project of group.value.projects; track project.name) {
                <div class="admin-project-row" role="button" tabindex="0" (click)="editProject($event, group.key, project.name)" (keydown.enter)="editProject($event, group.key, project.name)">
                  <span>{{ project.icon || '' }} {{ project.name }}</span>
                  <span class="admin-project-tags">
                    <span class="admin-project-tag">{{ state.pipelineLabel(project.todoPipelineId) }}</span>
                    @if (project.workPipelineId) {
                      <span class="admin-project-tag admin-project-tag-work">{{ state.pipelineLabel(project.workPipelineId) }}</span>
                    }
                  </span>
                </div>
              }
              <button class="admin-add-project-btn" (click)="addProject($event, group.key)">+ Add project</button>
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
export class ListsAdmin {
  readonly state = inject(AppStateService);
  private readonly modalCtrl = inject(ModalController);

  readonly expanded = signal<Set<string>>(new Set());

  // Keeps listGroups in insertion order rather than the keyvalue pipe's default alphabetical sort.
  preserveOrder = () => 0;

  toggle(key: string): void {
    this.expanded.update((set) => {
      const next = new Set(set);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  async addList(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: ListModal,
      cssClass: 'sheet-modal',
    });
    await modal.present();
  }

  async addProject(event: Event, groupKey: string): Promise<void> {
    event.stopPropagation();
    const modal = await this.modalCtrl.create({
      component: ProjectModal,
      componentProps: { presetGroupKey: groupKey },
      cssClass: 'sheet-modal',
    });
    await modal.present();
  }

  async editProject(event: Event, groupKey: string, projectName: string): Promise<void> {
    event.stopPropagation();
    const modal = await this.modalCtrl.create({
      component: ProjectModal,
      componentProps: { presetGroupKey: groupKey, existingProjectName: projectName },
      cssClass: 'sheet-modal',
    });
    await modal.present();
  }
}
