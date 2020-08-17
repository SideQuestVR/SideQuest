import { TestBed } from '@angular/core/testing';

import { ProcessBucketService } from './process-bucket.service';

describe('ProcessBucketService', () => {
    beforeEach(() => TestBed.configureTestingModule({}));

    it('should be created', () => {
        const service: ProcessBucketService = TestBed.get(ProcessBucketService);
        expect(service).toBeTruthy();
    });
});
