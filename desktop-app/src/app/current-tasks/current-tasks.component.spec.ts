import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CurrentTasksComponent } from './current-tasks.component';

describe('CurrentTasksComponent', () => {
    let component: CurrentTasksComponent;
    let fixture: ComponentFixture<CurrentTasksComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [CurrentTasksComponent],
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(CurrentTasksComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
