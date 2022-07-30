import { Component, OnInit } from '@angular/core';
import { AdbClientService, ConnectionStatus } from '../adb-client.service';
import { AppService } from '../app.service';

@Component({
    selector: 'app-wireless-connection',
    templateUrl: './wireless-connection.component.html',
    styleUrls: ['./wireless-connection.component.scss'],
})
export class WirelessConnectionComponent implements OnInit {
    constructor(public adbService: AdbClientService, appService: AppService) {
        appService.webService.isWebviewOpen = false;
        appService.resetTop();
    }

    ngOnInit() {}

    connectWifi() {
        this.adbService.deviceStatusMessage = 'Attempting wifi connection...';
        ((this.adbService.isReady ? this.adbService.runAdbCommand('adb tcpip 5555') : Promise.resolve()) as any).then(() => {
            setTimeout(() => {
                this.adbService.runAdbCommand('adb connect ' + this.adbService.deviceIp + ':5555');
            }, 3000);
        });
    }

    reset() {
        this.adbService.runAdbCommand('adb disconnect');
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
