import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProfList } from './prof-list';

describe('ProfList', () => {
  let component: ProfList;
  let fixture: ComponentFixture<ProfList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfList],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
