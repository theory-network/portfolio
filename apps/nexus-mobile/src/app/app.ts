import { Component, inject } from '@angular/core';
import { IonApp, IonMenu, IonContent, MenuController } from '@ionic/angular';
import { AppStateService } from './core/app-state.service';
import { WorkView } from './features/work/work-view';
import { DashboardView } from './features/dashboard/dashboard-view';
import { ApprovalsView } from './features/approvals/approvals-view';
import { ListsAdmin } from './features/admin-lists/lists-admin';
import { PipelinesAdmin } from './features/admin-pipelines/pipelines-admin';

@Component({
  selector: 'app-root',
  imports: [
    IonApp,
    IonMenu,
    IonContent,
    WorkView,
    DashboardView,
    ApprovalsView,
    ListsAdmin,
    PipelinesAdmin,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  readonly state = inject(AppStateService);
  private readonly menuCtrl = inject(MenuController);

  readonly sectionTitles = { work: 'Work', dashboard: 'Dashboard', approvals: 'Approvals' } as const;

  openMenu(): void {
    this.menuCtrl.open('main-menu');
  }

  goToPipelines(): void {
    this.menuCtrl.close('main-menu');
    this.state.openPipelinesAdmin();
  }

  goToLists(): void {
    this.menuCtrl.close('main-menu');
    this.state.openListsAdmin();
  }

  get isAdminView(): boolean {
    const v = this.state.currentView();
    return v === 'lists-admin' || v === 'pipelines-admin';
  }

  get sectionTitle(): string {
    const v = this.state.currentView();
    if (v === 'lists-admin' || v === 'pipelines-admin') return 'Settings';
    return this.sectionTitles[v];
  }
}
