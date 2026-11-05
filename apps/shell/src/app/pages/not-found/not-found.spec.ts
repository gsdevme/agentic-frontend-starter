import { RESPONSE_INIT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NotFound } from './not-found';

describe('NotFound', () => {
  it('[REQ-SHELL-004] sets the server response status to 404', async () => {
    const responseInit: ResponseInit = { status: 200 };
    await TestBed.configureTestingModule({
      imports: [NotFound],
      providers: [{ provide: RESPONSE_INIT, useValue: responseInit }],
    }).compileComponents();
    const fixture = TestBed.createComponent(NotFound);
    await fixture.whenStable();
    expect(responseInit.status).toBe(404);
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('h1')?.textContent,
    ).toContain('not found');
  });
});
