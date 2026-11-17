import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { PageResponse } from '../../../../core/models/domain.models';
import { PlacementOfficerAdmin } from '../../models/admin.models';
import { AdminOfficersService } from '../../services/admin-officers.service';
import { AdminOfficersComponent } from './admin-officers.component';

describe('AdminOfficersComponent', () => {
  it('asks for confirmation before changing officer access and updates the row after success', () => {
    const officer = placementOfficer();
    const updated = { ...officer, active: false };
    const setActive = vi.fn(() => of(updated));
    const dialog = { open: vi.fn(() => ({ afterClosed: () => of(true) })) };
    TestBed.configureTestingModule({
      imports: [AdminOfficersComponent],
      providers: [
        provideRouter([]),
        {
          provide: AdminOfficersService,
          useValue: { list: () => of(page([officer])), setActive, create: vi.fn() },
        },
      ],
    });
    TestBed.overrideProvider(MatDialog, { useValue: dialog });
    const fixture = TestBed.createComponent(AdminOfficersComponent);
    fixture.detectChanges();

    fixture.componentInstance.setActive(officer);
    fixture.detectChanges();

    expect(dialog.open).toHaveBeenCalledWith(expect.any(Function), {
      data: { officerName: officer.fullName, activate: false },
      role: 'alertdialog',
    });
    expect(setActive).toHaveBeenCalledWith(officer.id, false);
    expect(fixture.componentInstance.page()?.content[0].active).toBe(false);
  });

  it('does not change officer access when confirmation is cancelled', () => {
    const setActive = vi.fn();
    TestBed.configureTestingModule({
      imports: [AdminOfficersComponent],
      providers: [
        provideRouter([]),
        { provide: AdminOfficersService, useValue: { list: () => of(page([placementOfficer()])), setActive } },
      ],
    });
    TestBed.overrideProvider(MatDialog, { useValue: { open: () => ({ afterClosed: () => of(false) }) } });
    const fixture = TestBed.createComponent(AdminOfficersComponent);
    fixture.detectChanges();
    fixture.componentInstance.setActive(placementOfficer());
    expect(setActive).not.toHaveBeenCalled();
  });
});

function page(content: PlacementOfficerAdmin[]): PageResponse<PlacementOfficerAdmin> {
  return { content, page: 0, size: 10, totalElements: content.length, totalPages: 1,
    first: true, last: true, hasNext: false, hasPrevious: false };
}

function placementOfficer(): PlacementOfficerAdmin {
  return { id: 8, userId: 21, email: 'officer@campus.example', fullName: 'Taylor Officer',
    employeeId: 'EMP-8', department: 'Engineering', phone: null, active: true, createdAt: '2026-01-01T00:00:00Z' };
}
