import { TestBed } from '@angular/core/testing';

import { SynthriderService } from './synthrider.service';

describe('SynthriderService', () => {
    beforeEach(() => TestBed.configureTestingModule({}));

    it('should be created', () => {
        const service: SynthriderService = TestBed.get(SynthriderService);
        expect(service).toBeTruthy();
    });
});
