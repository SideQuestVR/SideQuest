import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { LoadingSpinnerSmallComponent } from './loading-spinner-small.component';

describe('LoadingSpinnerSmallComponent', () => {
  let component: LoadingSpinnerSmallComponent;
  let fixture: ComponentFixture<LoadingSpinnerSmallComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ LoadingSpinnerSmallComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(LoadingSpinnerSmallComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
