import { Component, Input, AfterViewInit, OnDestroy, ViewChild } from '@angular/core';
import { ProcessBucketService } from '../process-bucket.service';

@Component({
    selector: 'app-current-task-item',
    templateUrl: './current-task-item.component.html',
    styleUrls: ['./current-task-item.component.scss'],
})
export class CurrentTaskItemComponent implements AfterViewInit, OnDestroy {
    @Input() task;
    @ViewChild('tooltip') tooltip;
    toolTipInterval: number
    toolTipStatus: number = 0
    constructor(public processService: ProcessBucketService) {}

    ngAfterViewInit() {
      return;
      this.toolTipInterval = setInterval(() => {
        if (this.task) {
          if (this.task.running && this.toolTipStatus !== 2) {
            this.toolTipStatus = 2;
            this.tooltip.nativeElement.dataset.tooltip = 'This task is running';
          } else if (this.task.failed && this.toolTipStatus !== 3) {
            this.toolTipStatus = 3;
            this.tooltip.nativeElement.dataset.tooltip = 'This task has failed';
          } else if (this.task.succeeded && this.toolTipStatus !== 4) {
            this.toolTipStatus = 4;
            this.tooltip.nativeElement.dataset.tooltip = 'This task succeeded';
          } else if (this.toolTipStatus !== 1) {
            this.toolTipStatus = 1;
            this.tooltip.nativeElement.dataset.tooltip = 'This task is waiting';
          }
        } else {
          this.toolTipStatus = 1;
          this.tooltip.nativeElement.dataset.tooltip = 'This task is waiting';
        }
      }, 500);
    }

    ngOnDestroy() {
     // clearInterval(this.toolTipInterval);
    }

    deleteItem() {
        this.processService.tasks = this.processService.tasks.filter(t => t !== this.task);
    }
}
