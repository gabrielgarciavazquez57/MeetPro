import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Footter } from './footter';

describe('Footter', () => {
  let component: Footter;
  let fixture: ComponentFixture<Footter>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Footter],
    }).compileComponents();

    fixture = TestBed.createComponent(Footter);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
