import { TestBed } from '@angular/core/testing';
import { Home } from './home';

describe('Home', () => {
  it('[REQ-SHELL-003] renders a single h1 landmark heading', async () => {
    await TestBed.configureTestingModule({
      imports: [Home],
    }).compileComponents();
    const fixture = TestBed.createComponent(Home);
    await fixture.whenStable();
    expect(
      (fixture.nativeElement as HTMLElement).querySelectorAll('h1'),
    ).toHaveLength(1);
  });
});
