import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { PackageItemComponent } from './package-item.component';

describe('PackageItemComponent', () => {
  let component: PackageItemComponent;
  let fixture: ComponentFixture<PackageItemComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ PackageItemComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PackageItemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
