import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { WorkspaceLayout } from './workspace-layout.component';

describe('WorkspaceLayout mobile navigation', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [WorkspaceLayout],
      providers: [provideRouter([])],
    });
  });

  it('exposes the collapsed state and moves focus into the sidebar when opened', () => {
    const fixture = TestBed.createComponent(WorkspaceLayout);
    fixture.detectChanges();
    const toggle = fixture.nativeElement.querySelector('.menu-toggle') as HTMLButtonElement;
    const sidebar = fixture.nativeElement.querySelector('#workspace-sidebar') as HTMLElement;

    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(toggle.getAttribute('aria-controls')).toBe('workspace-sidebar');
    toggle.click();
    fixture.detectChanges();

    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(sidebar.classList.contains('workspace-sidebar')).toBe(true);
    expect(fixture.nativeElement.ownerDocument.activeElement?.classList.contains('navigation-link')).toBe(true);
  });

  it('closes on Escape and restores focus to the sidebar toggle', () => {
    const fixture = TestBed.createComponent(WorkspaceLayout);
    fixture.detectChanges();
    const toggle = fixture.nativeElement.querySelector('.menu-toggle') as HTMLButtonElement;
    const firstLink = fixture.nativeElement.querySelector('.navigation-link') as HTMLAnchorElement;
    toggle.style.display = 'block';
    toggle.click();
    fixture.detectChanges();

    firstLink.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    fixture.detectChanges();

    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(fixture.nativeElement.ownerDocument.activeElement).toBe(toggle);
  });
});
