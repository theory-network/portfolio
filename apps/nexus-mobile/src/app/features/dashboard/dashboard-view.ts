import { Component } from '@angular/core';

@Component({
  selector: 'app-dashboard-view',
  template: `
    <div class="dashboard-view">
      <div class="metrics-row">
        <div class="metric-card"><div class="metric-label">Open tasks</div><div class="metric-value">30</div></div>
        <div class="metric-card"><div class="metric-label">Agents running</div><div class="metric-value">2</div></div>
        <div class="metric-card"><div class="metric-label">Pending approvals</div><div class="metric-value">1</div></div>
        <div class="metric-card"><div class="metric-label">Closed this week</div><div class="metric-value">14</div></div>
      </div>
      <div class="section-label">Agents</div>
      <div class="agent-row"><span class="agent-status running"></span> roam-tasks-sweep — running on Home Renovation</div>
      <div class="agent-row"><span class="agent-status running"></span> roam-agents-sweep — running on XRPL Rewards Platform</div>
      <div class="agent-row"><span class="agent-status idle"></span> nx-aidlc-latest — idle</div>
    </div>
  `,
})
export class DashboardView {}
