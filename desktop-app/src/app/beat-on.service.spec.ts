import { TestBed } from '@angular/core/testing';

import { BeatOnService } from './beat-on.service';

describe('BeatOnService', () => {
    beforeEach(() => TestBed.configureTestingModule({}));

    it('should be created', () => {
        const service: BeatOnService = TestBed.get(BeatOnService);
        expect(service).toBeTruthy();
    });
});
