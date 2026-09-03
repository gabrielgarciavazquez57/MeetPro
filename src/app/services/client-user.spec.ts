import { TestBed } from '@angular/core/testing';

import { ClientUser } from './client-user';

describe('ClientUser', () => {
  let service: ClientUser;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ClientUser);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
