import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { AdbClientService } from '../adb-client.service';
import { AppService } from '../app.service';

@Component({
    selector: 'app-setup-guide',
    templateUrl: './setup-guide.component.html',
    styleUrls: ['./setup-guide.component.scss'],
})
export class SetupGuideComponent implements OnInit {
    @Output() opn = new EventEmitter();
    @Output() close = new EventEmitter();
    @Output() backHome = new EventEmitter();
    page = 1;
    constructor(public adb: AdbClientService, appService: AppService) {
        appService.resetTop();
        appService.webService.isWebviewOpen = false;
        appService.isSetupOpen = true;
    }

    ngOnInit() {}

    open(url) {
        this.opn.emit(url);
    }

    videoError(ele, event, backup) {
        if ([1, 2, 4].includes(event.target.error.code)) {
            ele.setAttribute('src', backup);
            ele.play();
        }
    }
}
