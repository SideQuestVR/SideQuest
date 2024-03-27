import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { CurrentTaskItemComponent } from './current-task-item.component';

describe('CurrentTaskItemComponent', () => {
    let component: CurrentTaskItemComponent;
    let fixture: ComponentFixture<CurrentTaskItemComponent>;

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            declarations: [CurrentTaskItemComponent],
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(CurrentTaskItemComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
