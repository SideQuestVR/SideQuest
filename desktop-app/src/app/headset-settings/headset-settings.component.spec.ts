import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { HeadsetSettingsComponent } from './headset-settings.component';

describe('HeadsetSettingsComponent', () => {
    let component: HeadsetSettingsComponent;
    let fixture: ComponentFixture<HeadsetSettingsComponent>;

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            declarations: [HeadsetSettingsComponent],
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(HeadsetSettingsComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
