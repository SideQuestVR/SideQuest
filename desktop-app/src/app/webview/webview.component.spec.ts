import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { WebviewComponent } from './webview.component';

describe('WebviewComponent', () => {
  let component: WebviewComponent;
  let fixture: ComponentFixture<WebviewComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ WebviewComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(WebviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
