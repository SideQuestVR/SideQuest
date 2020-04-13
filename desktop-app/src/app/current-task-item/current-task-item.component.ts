import { Component, Input, OnInit } from '@angular/core';
import { ProcessBucketService } from '../process-bucket.service';

@Component({
    selector: 'app-current-task-item',
    templateUrl: './current-task-item.component.html',
    styleUrls: ['./current-task-item.component.css'],
})
export class CurrentTaskItemComponent implements OnInit {
    @Input() task;
    constructor(public processService: ProcessBucketService) {}

    ngOnInit() {}

    deleteItem() {
        this.processService.tasks = this.processService.tasks.filter(t => t !== this.task);
    }
}
