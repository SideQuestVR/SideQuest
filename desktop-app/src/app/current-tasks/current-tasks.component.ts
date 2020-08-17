import { Component, OnInit } from '@angular/core';
import { AdbClientService, ConnectionStatus } from '../adb-client.service';
import { ProcessBucketService } from '../process-bucket.service';
import { AppService } from '../app.service';

@Component({
    selector: 'app-current-tasks',
    templateUrl: './current-tasks.component.html',
    styleUrls: ['./current-tasks.component.css'],
})
export class CurrentTasksComponent implements OnInit {
    constructor(public processService: ProcessBucketService, public appService: AppService) {
        this.appService.resetTop();
        appService.webService.isWebviewOpen = false;
        this.appService.showTaskActions = true;
        appService.isTasksOpen = true;
    }

    ngOnInit() {
        this.appService.setTitle('Current Tasks');
    }
}
