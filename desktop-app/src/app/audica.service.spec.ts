import { TestBed } from '@angular/core/testing';

import { AudicaService } from './audica.service';

describe('AudicaService', () => {
    beforeEach(() => TestBed.configureTestingModule({}));

    it('should be created', () => {
        const service: AudicaService = TestBed.get(AudicaService);
        expect(service).toBeTruthy();
    });
});
