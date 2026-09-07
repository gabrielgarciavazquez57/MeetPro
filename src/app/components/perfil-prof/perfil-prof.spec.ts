import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PerfilProf } from './perfil-prof';

describe('PerfilProf', () => {
  let component: PerfilProf;
  let fixture: ComponentFixture<PerfilProf>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PerfilProf],
    }).compileComponents();

    fixture = TestBed.createComponent(PerfilProf);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
