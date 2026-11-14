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
    .stat-card { display: flex; min-height: 112px; align-items: center; gap: 16px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background: #fff; box-shadow: 0 4px 12px rgb(15 23 42 / 5%); }
    .stat-icon { display: grid; width: 44px; height: 44px; flex: 0 0 44px; place-items: center; border-radius: 11px; background: #eff6ff; color: #2563eb; }
    .stat-copy { display: grid; gap: 4px; min-width: 0; }
    .stat-label { color: #64748b; font-size: 12px; font-weight: 600; }
    strong { color: #0f172a; font-size: 25px; line-height: 1.1; }
    .stat-caption { color: #94a3b8; font-size: 11px; }
  `],
})
export class OverviewStatCard {
  readonly label = input.required<string>();
  readonly value = input<number | null>(null);
  readonly icon = input.required<string>();
  readonly caption = input('');
  readonly loading = input(false);
}
