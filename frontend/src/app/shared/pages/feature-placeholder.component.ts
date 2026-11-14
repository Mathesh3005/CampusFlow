import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-feature-placeholder',
  standalone: true,
  template: `
    <section class="placeholder" aria-labelledby="page-title">
      <p class="eyebrow">CAMPUSFLOW</p>
      <h1 id="page-title">{{ title }}</h1>
      <p>{{ description }}</p>
    </section>
  `,
  styles: [`
    .placeholder { max-width: 720px; padding: 28px; border: 1px solid #e2e8f0; border-radius: 12px; background: #fff; box-shadow: 0 4px 12px rgb(15 23 42 / 5%); }
    .eyebrow { margin: 0 0 10px; color: #2563eb; font-size: 11px; font-weight: 700; letter-spacing: 1.5px; }
    h1 { margin: 0 0 10px; color: #0f172a; font-size: 24px; }
    p:last-child { margin: 0; color: #64748b; line-height: 1.6; }
  `],
})
export class FeaturePlaceholder {
  private readonly route = inject(ActivatedRoute);
  readonly title = this.route.snapshot.data['title'] as string;
  readonly description = 'This area is ready for implementation. No dashboard data or feature behavior is available yet.';
}
