import { Component, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModalController } from '@ionic/angular';
import { AppStateService } from '../../core/app-state.service';
import { ProjectTile } from './project-tile';
import { PanelPickerModal } from '../modals/panel-picker-modal';

@Component({
  selector: 'app-work-view',
  imports: [FormsModule, ProjectTile],
  template: `
    <div class="layout">
      <!-- LEFT: swappable slot -->
      <div class="side left">
        <button class="side-header" (click)="openPicker('left')">
          <span>{{ leftGroup().label }}</span><span class="src">{{ leftGroup().src }}</span>
          <span class="swap-hint">⇅</span>
        </button>
        <div class="proj-list">
          @for (project of leftGroup().projects; track project.name) {
            <app-project-tile [project]="project" [side]="'left'" [groupKey]="leftGroupKey()" />
          }
        </div>
      </div>

      <!-- CENTER: chat -->
      <div class="center">
        @if (showNudge()) {
          <div class="nudge">
            <span class="nudge-icon">⚠️</span>
            <div class="nudge-text"><b>Settlement Worker</b> needs your approval — retry policy change for failed MPT exports. You're currently in a different context.</div>
            <div class="nudge-actions">
              <button class="nudge-btn approve" (click)="resolveNudge()">Approve</button>
              <button class="nudge-btn deny" (click)="resolveNudge()">Deny</button>
            </div>
          </div>
        }

        <div class="chat-body" #chatBody>
          @for (msg of state.activeThread(); track $index) {
            @if (msg.type === 'question') {
              <div class="question-card">
                <div class="question-text">{{ msg.text }}</div>
                @if (msg.answer) {
                  <div class="question-answered-pill">✓ {{ msg.answer }}</div>
                } @else {
                  <div class="question-options">
                    @for (opt of msg.options; track opt) {
                      <button type="button" class="question-option-btn" (click)="answerQuestion($index, opt)">{{ opt }}</button>
                    }
                  </div>
                  @if (customOpenIndex() === $index) {
                    <div class="question-custom-row">
                      <input type="text" [(ngModel)]="customDraft" placeholder="Write your own answer…" (keyup.enter)="submitCustom($index)" />
                      <button type="button" class="question-custom-send" (click)="submitCustom($index)">Send</button>
                    </div>
                  } @else {
                    <button type="button" class="question-custom-toggle" (click)="openCustom($index)">✏️ Write your own answer</button>
                  }
                }
              </div>
            } @else {
              <div class="msg" [class.system]="msg.type === 'system'" [class.assistant]="msg.type === 'assistant'" [class.user]="msg.type === 'user'">
                {{ msg.text }}
              </div>
            }
          }
        </div>

        <div class="chat-input">
          <div class="input-box">
            <input type="text" [placeholder]="state.inputPlaceholder()" [(ngModel)]="draft" (keyup.enter)="send()" />
            <button class="send-btn" (click)="send()">Send</button>
          </div>
        </div>
      </div>

      <!-- RIGHT: swappable slot -->
      <div class="side right">
        <button class="side-header" (click)="openPicker('right')">
          <span>{{ rightGroup().label }}</span><span class="src">{{ rightGroup().src }}</span>
          <span class="swap-hint">⇅</span>
        </button>
        <div class="proj-list">
          @for (project of rightGroup().projects; track project.name) {
            <app-project-tile [project]="project" [side]="'right'" [groupKey]="rightGroupKey()" />
          }
        </div>
      </div>
    </div>
  `,
})
export class WorkView {
  readonly state = inject(AppStateService);
  private readonly modalCtrl = inject(ModalController);

  @ViewChild('chatBody') chatBodyRef?: ElementRef<HTMLDivElement>;

  draft = '';
  readonly showNudge = signal(true);
  readonly customOpenIndex = signal<number | null>(null);
  customDraft = '';

  leftGroupKey = () => this.state.slotAssignment().left;
  rightGroupKey = () => this.state.slotAssignment().right;
  leftGroup = () => this.state.listGroups()[this.leftGroupKey()];
  rightGroup = () => this.state.listGroups()[this.rightGroupKey()];

  async openPicker(side: 'left' | 'right'): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: PanelPickerModal,
      componentProps: { side },
      cssClass: 'popover-modal',
    });
    await modal.present();
  }

  send(): void {
    if (!this.draft.trim()) return;
    this.state.sendMessage(this.draft);
    this.draft = '';
    this.scrollToBottom();
  }

  answerQuestion(index: number, value: string): void {
    this.state.answerQuestion(index, value);
    this.customOpenIndex.set(null);
    this.customDraft = '';
    this.scrollToBottom();
  }

  openCustom(index: number): void {
    this.customOpenIndex.set(index);
    this.customDraft = '';
  }

  submitCustom(index: number): void {
    if (!this.customDraft.trim()) return;
    this.answerQuestion(index, this.customDraft);
  }

  resolveNudge(): void {
    this.showNudge.set(false);
  }

  private scrollToBottom(): void {
    queueMicrotask(() => {
      const el = this.chatBodyRef?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }
}
