import { Component } from '@angular/core';

@Component({
  selector: 'app-access-denied',
  standalone: true,
  template: `
    <main class="access-page">
      <section class="access-card">
        <div class="brand-mark" aria-hidden="true">C</div>
        <h1>Workspace unavailable</h1>
        <p>This account does not have a supported CampusFlow workspace. Contact your placement office for assistance.</p>
      </section>
    </main>
  `,
  styles: [`
    .access-page { display: grid; min-height: 100vh; place-items: center; padding: 24px; background: #f8fafc; font-family: Roboto, sans-serif; }
    .access-card { max-width: 440px; padding: 32px; border: 1px solid #e2e8f0; border-radius: 12px; background: #fff; text-align: center; }
    .brand-mark { display: grid; width: 42px; height: 42px; margin: 0 auto 18px; place-items: center; border-radius: 11px; background: #2563eb; color: #fff; font-size: 22px; font-weight: 700; }
    h1 { margin: 0 0 10px; color: #0f172a; font-size: 23px; }
    p { margin: 0 0 22px; color: #64748b; line-height: 1.5; }
    a { color: #2563eb; font-weight: 600; text-decoration: none; }
  `],
})
export class AccessDenied {}
