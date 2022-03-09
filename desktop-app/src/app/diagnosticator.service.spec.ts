import { TestBed } from '@angular/core/testing';

import { DiagnosticatorService } from './diagnosticator.service';

describe('DiagnosticatorService', () => {
    beforeEach(() => TestBed.configureTestingModule({}));

    it('should be created', () => {
        const service: DiagnosticatorService = TestBed.get(DiagnosticatorService);
        expect(service).toBeTruthy();
    });
});
