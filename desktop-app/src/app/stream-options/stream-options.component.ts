import { Component, OnInit } from '@angular/core';
import { AppService } from '../app.service';
import { AdbClientService } from '../adb-client.service';

@Component({
    selector: 'app-stream-options',
    templateUrl: './stream-options.component.html',
    styleUrls: ['./stream-options.component.scss'],
})
export class StreamOptionsComponent implements OnInit {
    scrcpy_options: any = {
        always_on_top: false,
        bit_rate: '8000000',
        crop: '1280:720:1500:350',
        no_control: true,
        fullscreen: false,
        max_size: '0',
        max_fps: '0',
        device: '',
    };
    osPlatform: string;
    constructor(private appService: AppService, private adbService: AdbClientService) {
        appService.webService.isWebviewOpen = false;
        appService.resetTop();
        this.osPlatform = this.appService.os.platform();
    }

    ngOnInit() {}

    runscrcpy() {
        this.scrcpy_options.device = this.adbService.deviceSerial;
        this.appService.runScrCpy(this.scrcpy_options);
        // .then(() => this.statusService.showStatus('Stream closed.'))
        // .catch(e => this.statusService.showStatus('ScrCpy Error: ' + JSON.stringify(e), true));
    }
}
