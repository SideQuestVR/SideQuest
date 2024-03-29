import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { AdbClientService } from '../adb-client.service';
import { AppService } from '../app.service';
import { StatusBarService } from '../status-bar.service';

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
    isSupport: boolean;
    link;
    logFailed: boolean;
    constructor(public adb: AdbClientService, public appService: AppService, private statusService: StatusBarService) {
        appService.resetTop();
        appService.webService.isWebviewOpen = false;
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

    copyToClipboard() {
        this.adb.copyToClipboard(this.link);
        this.statusService.showStatus('Copied to clipboard: ' + this.link);
    }

    async uploadLogs() {
        let link = null;
        const data = {
            code: JSON.stringify(this.adb.diagnostics.usb.log),
            expireUnit: 'month',
            syntax: 'JSON',
            title: 'SideQuest Log: ' + new Date().getTime(),
        };
        const formData = Object.keys(data)
            .map(key => encodeURIComponent(key) + '=' + encodeURIComponent(data[key]))
            .join('&');
        try {
            const resp = await fetch('https://api.teknik.io/v1/Paste', {
                body: formData,
                method: 'POST',
                headers: {
                    Authorization: 'AuthToken w8pvsx5z73d94cmpz1e8kh31jgpeechf6yp11dpy',
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            });

            link = (await resp.json()).result.url;
            this.link = link;

            this.statusService.showStatus('Logs Uploaded! Copy the Url to your support ticket.');
        } catch (e) {
            console.log(e);
            this.statusService.showStatus('Unable to upload logs, please try again later.', true);
        }
        // this.telemetry.telemetry({ event: 'log-upload', logData: this.adb.diagnostics.usb.log, logLink: link });
    }
}
