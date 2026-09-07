import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PerfilUser } from './perfil-user';

describe('PerfilUser', () => {
  let component: PerfilUser;
  let fixture: ComponentFixture<PerfilUser>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PerfilUser],
    }).compileComponents();

    fixture = TestBed.createComponent(PerfilUser);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
