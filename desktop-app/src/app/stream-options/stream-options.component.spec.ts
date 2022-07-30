import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { StreamOptionsComponent } from './stream-options.component';

describe('StreamOptionsComponent', () => {
    let component: StreamOptionsComponent;
    let fixture: ComponentFixture<StreamOptionsComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [StreamOptionsComponent],
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(StreamOptionsComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
