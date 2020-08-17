import { TestBed } from '@angular/core/testing';

import { SongBeaterService } from './song-beater.service';

describe('SongBeaterService', () => {
    beforeEach(() => TestBed.configureTestingModule({}));

    it('should be created', () => {
        const service: SongBeaterService = TestBed.get(SongBeaterService);
        expect(service).toBeTruthy();
    });
});
