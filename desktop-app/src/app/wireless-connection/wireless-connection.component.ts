import { Component, OnInit } from '@angular/core';
import { AdbClientService, ConnectionStatus } from '../adb-client.service';
import { AppService } from '../app.service';
import { StatusBarService } from '../status-bar.service';

@Component({
    selector: 'app-wireless-connection',
    templateUrl: './wireless-connection.component.html',
    styleUrls: ['./wireless-connection.component.scss'],
})
export class WirelessConnectionComponent implements OnInit {
    constructor(public adbService: AdbClientService, appService: AppService, private statusService: StatusBarService) {
        appService.webService.isWebviewOpen = false;
        appService.resetTop();
    }

    ngOnInit() {}

    connectWifi() {
        let status = 'Attempting wifi connection...';
        this.statusService.showStatus(status, false, true);
        this.adbService.deviceStatusMessage = status;
        ((this.adbService.isReady ? this.adbService.runAdbCommand('adb tcpip 5555') : Promise.resolve()) as any).then(() => {
            setTimeout(() => {
                this.adbService.runAdbCommand('adb connect ' + this.adbService.deviceIp + ':5555');
            }, 3000);
        });
    }

    reset() {
        this.adbService.runAdbCommand('adb disconnect');
        this.statusService.showStatus('Resetting ADB connection...', false, true);
    }

    isConnected() {
        const isConnected = this.adbService.deviceStatus === ConnectionStatus.CONNECTED;
        // if (isConnected && !this.isOpen) {
        //   this.isOpen = true;
        //   this.open('/sdcard/');
        // }
        return isConnected;
    }
}
