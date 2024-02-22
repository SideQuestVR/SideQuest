import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { SetupGuideComponent } from './setup-guide.component';

describe('SetupGuideComponent', () => {
    let component: SetupGuideComponent;
    let fixture: ComponentFixture<SetupGuideComponent>;

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            declarations: [SetupGuideComponent],
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(SetupGuideComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
