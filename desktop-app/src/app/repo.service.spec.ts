import { TestBed } from '@angular/core/testing';

import { RepoService } from './repo.service';

describe('RepoService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: RepoService = TestBed.get(RepoService);
    expect(service).toBeTruthy();
  });
});
