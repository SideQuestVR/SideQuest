import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CurrentTaskItemComponent } from './current-task-item.component';

describe('CurrentTaskItemComponent', () => {
    let component: CurrentTaskItemComponent;
    let fixture: ComponentFixture<CurrentTaskItemComponent>;

    beforeEach(async(() => {
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
