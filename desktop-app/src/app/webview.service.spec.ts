import { TestBed } from '@angular/core/testing';

import { WebviewService } from './webview.service';

describe('WebviewService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: WebviewService = TestBed.get(WebviewService);
    expect(service).toBeTruthy();
  });
});
