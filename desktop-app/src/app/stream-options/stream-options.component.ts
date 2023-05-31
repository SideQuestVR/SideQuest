import { Component, OnInit } from '@angular/core';
import { AppService } from '../app.service';
import { AdbClientService } from '../adb-client.service';
import { StatusBarService } from '../status-bar.service';

@Component({
    selector: 'app-stream-options',
    templateUrl: './stream-options.component.html',
    styleUrls: ['./stream-options.component.scss'],
})
export class StreamOptionsComponent implements OnInit {
    scrcpy_options: any = {
        always_on_top: false,
        bit_rate: '8000000',
        crop: '1600:900:2017:510',
        no_control: true,
        fullscreen: false,
        max_size: '0',
        max_fps: '0',
        device: '',
    };
    osPlatform: string;
    constructor(public appService: AppService, private adbService: AdbClientService, private statusService: StatusBarService) {
        appService.webService.isWebviewOpen = false;
        appService.resetTop();
        this.osPlatform = this.appService.os.platform();
    }

    ngOnInit() {}

    runscrcpy() {
        this.scrcpy_options.device = this.adbService.deviceSerial;
        this.appService
            .runScrCpy(this.scrcpy_options)
            .then(() => this.statusService.showStatus('Stream closed.'))
            .catch(e => this.statusService.showStatus('ScrCpy Error: ' + JSON.stringify(e), true));
    }

    disableProximity(shouldEnable) {
        this.runAdbCommand('am broadcast -a com.oculus.vrpowermanager.' + (shouldEnable ? 'automation_disable' : 'prox_close'))
            .then(() => {
                this.statusService.showStatus((shouldEnable ? 'Enable' : 'Disable') + ' proximity message sent OK!!');
            })
            .catch(e => this.statusService.showStatus(e, true));
    }
    runAdbCommand(command: string) {
        return this.adbService.adbCommand('shell', { command, serial: this.adbService.deviceSerial });
    }
}
