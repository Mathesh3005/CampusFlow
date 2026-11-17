import { Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-overview-stat-card',
  standalone: true,
  imports: [MatIconModule],
  template: `
    <article class="stat-card" [attr.aria-busy]="loading()">
      <div class="stat-icon"><mat-icon aria-hidden="true">{{ icon() }}</mat-icon></div>
      <div class="stat-copy">
        <span class="stat-label">{{ label() }}</span>
        <strong>{{ loading() ? '—' : value() ?? 'Unavailable' }}</strong>
        <span class="stat-caption">{{ caption() }}</span>
      </div>
    </article>
  `,
  styles: [`
    .stat-card { display: flex; min-width: 0; min-height: 104px; align-items: center; gap: 12px; padding: 15px; border: 1px solid var(--cf-border); border-radius: var(--cf-radius-md); background: var(--cf-surface); box-shadow: var(--cf-shadow-xs); transition: border-color var(--cf-motion-fast), box-shadow var(--cf-motion-fast); }
    .stat-card:hover { border-color: var(--cf-primary-border); box-shadow: var(--cf-shadow-sm); }
    .stat-icon { display: grid; width: 39px; height: 39px; flex: 0 0 39px; place-items: center; border-radius: 11px; background: var(--cf-primary-soft); color: var(--cf-primary); }
    .stat-copy { display: grid; gap: 4px; min-width: 0; }
    .stat-label { overflow: hidden; color: var(--cf-text-secondary); font-size: 10px; font-weight: 650; text-overflow: ellipsis; white-space: nowrap; }
    strong { color: var(--cf-text-primary); font-size: 23px; font-weight: 720; letter-spacing: -.5px; line-height: 1.1; }
    .stat-caption { color: var(--cf-text-tertiary); font-size: 9px; line-height: 1.35; }
    @media (max-width: 600px) { .stat-card { min-height: 90px; gap: 9px; padding: 11px; } .stat-icon { width: 32px; height: 32px; flex-basis: 32px; } .stat-icon mat-icon { width: 18px; height: 18px; font-size: 18px; } strong { font-size: 20px; } }
  `],
})
export class OverviewStatCard {
  readonly label = input.required<string>();
  readonly value = input<number | null>(null);
  readonly icon = input.required<string>();
  readonly caption = input('');
  readonly loading = input(false);
}
