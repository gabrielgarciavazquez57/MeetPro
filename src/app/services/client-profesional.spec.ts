import { TestBed } from '@angular/core/testing';

import { ClientProfesional } from './client-profesional';

describe('ClientProfesional', () => {
  let service: ClientProfesional;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ClientProfesional);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
