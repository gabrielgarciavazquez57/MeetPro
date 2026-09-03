import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProfForm } from './prof-form';

describe('ProfForm', () => {
  let component: ProfForm;
  let fixture: ComponentFixture<ProfForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfForm],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
