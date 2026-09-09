import { Component } from '@angular/core';

@Component({
  selector: 'app-approvals-view',
  template: `
    <div class="approvals-view">
      <div class="approval-card">
        <div class="approval-info">
          <div class="approval-project">Settlement Worker · Linear</div>
          <div class="approval-desc">Retry policy change for failed MPT exports</div>
        </div>
        <div class="nudge-actions">
          <button class="nudge-btn approve">Approve</button>
          <button class="nudge-btn deny">Deny</button>
        </div>
      </div>
    </div>
  `,
})
export class ApprovalsView {}
