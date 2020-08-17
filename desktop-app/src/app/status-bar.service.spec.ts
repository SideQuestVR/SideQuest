import { TestBed } from '@angular/core/testing';

import { StatusBarService } from './status-bar.service';

describe('StatusBarService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: StatusBarService = TestBed.get(StatusBarService);
    expect(service).toBeTruthy();
  });
});
