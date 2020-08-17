import { SanitizeHtmlPipe } from './sanitize-html.pipe';
import { DomSanitizer } from '@angular/platform-browser';

describe('SanitizeHtmlPipe', () => {
  it('create an instance', () => {
    const pipe = new SanitizeHtmlPipe();
    expect(pipe).toBeTruthy();
  });
});
