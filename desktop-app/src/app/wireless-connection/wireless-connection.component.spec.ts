import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { WirelessConnectionComponent } from './wireless-connection.component';

describe('WirelessConnectionComponent', () => {
    let component: WirelessConnectionComponent;
    let fixture: ComponentFixture<WirelessConnectionComponent>;

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            declarations: [WirelessConnectionComponent],
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(WirelessConnectionComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
