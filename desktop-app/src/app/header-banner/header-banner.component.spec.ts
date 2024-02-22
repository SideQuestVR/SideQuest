import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { HeaderBannerComponent } from './header-banner.component';

describe('HeaderBannerComponent', () => {
    let component: HeaderBannerComponent;
    let fixture: ComponentFixture<HeaderBannerComponent>;

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            declarations: [HeaderBannerComponent],
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(HeaderBannerComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
