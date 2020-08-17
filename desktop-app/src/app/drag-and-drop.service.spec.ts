import { TestBed } from '@angular/core/testing';

import { DragAndDropService } from './drag-and-drop.service';

describe('DragAndDropService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: DragAndDropService = TestBed.get(DragAndDropService);
    expect(service).toBeTruthy();
  });
});
