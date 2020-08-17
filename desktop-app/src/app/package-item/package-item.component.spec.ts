import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { PackageItemComponent } from './package-item.component';

describe('PackageItemComponent', () => {
  let component: PackageItemComponent;
  let fixture: ComponentFixture<PackageItemComponent>;

  beforeEach(async(() => {
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
