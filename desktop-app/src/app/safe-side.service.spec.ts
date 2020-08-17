import { TestBed } from '@angular/core/testing';

import { SafeSideService } from './safe-side.service';

describe('SafeSideService', () => {
    beforeEach(() => TestBed.configureTestingModule({}));

    it('should be created', () => {
        const service: SafeSideService = TestBed.get(SafeSideService);
        expect(service).toBeTruthy();
    });
});
