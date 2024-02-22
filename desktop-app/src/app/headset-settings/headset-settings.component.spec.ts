import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { ToolsComponent } from './tools.component';

describe('ToolsComponent', () => {
    let component: ToolsComponent;
    let fixture: ComponentFixture<ToolsComponent>;

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            declarations: [ToolsComponent],
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(ToolsComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
