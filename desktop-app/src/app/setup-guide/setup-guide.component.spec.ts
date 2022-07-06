import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { SetupGuideComponent } from './setup-guide.component';

describe('SetupGuideComponent', () => {
    let component: SetupGuideComponent;
    let fixture: ComponentFixture<SetupGuideComponent>;

    beforeEach(async(() => {
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
