import { TestBed } from '@angular/core/testing';

import { AdbClientService } from './adb-client.service';

describe('AdbClientService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: AdbClientService = TestBed.get(AdbClientService);
    expect(service).toBeTruthy();
  });
});
