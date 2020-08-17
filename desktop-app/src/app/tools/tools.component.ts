import { Component, OnInit } from '@angular/core';
import { AppService, FolderType } from '../app.service';
import { AdbClientService } from '../adb-client.service';
import { LoadingSpinnerService } from '../loading-spinner.service';
import { StatusBarService } from '../status-bar.service';
import { RepoService } from '../repo.service';
enum FFR {
    OFF,
    LOW,
    MEDIUM,
    HIGH,
    HIGH_TOP,
}
enum GPU {
    _2,
    _4,
}
enum GU {
    ON,
    OFF,
}
enum CA {
    APP,
    OFF,
    ON,
}
enum SSO {
    _512,
    _768,
    _1024,
    _1280,
    _1536,
    _2048,
    _2560,
    _3072,
}
enum SVR {
    _1024,
    _1536,
}
enum CR {
    _480,
    _720,
    _1080,
}
enum SVB {
    _5Mbps,
    _15Mbps,
    _25Mbps,
}
@Component({
    selector: 'app-tools',
    templateUrl: './tools.component.html',
    styleUrls: ['./tools.component.css'],
})
export class ToolsComponent implements OnInit {
    folder = FolderType;
    isPassword: boolean;
    textToSend: string;
    _textToSend: string[];
    FFR = FFR;
    SVR = SVR;
    SVB = SVB;
    SSO = SSO;
    GU = GU;
    CA = CA;
    CR = CR;
    GPU = GPU;
    pavlovName;
    constructor(
        public appService: AppService,
        public adbService: AdbClientService,
        private spinnerService: LoadingSpinnerService,
        private statusService: StatusBarService,
        public repoService: RepoService
    ) {
        this.appService.resetTop();
        appService.webService.isWebviewOpen = false;
        appService.isSettingsOpen = true;
    }

    ngOnInit() {
        this.appService.setTitle('Device Settings & Tools');
    }
    setFFR(ffr: FFR) {
        let value: number = 0;
        switch (ffr) {
            case FFR.LOW:
                value = 1;
                break;
            case FFR.MEDIUM:
                value = 2;
                break;
            case FFR.HIGH:
                value = 3;
                break;
            case FFR.HIGH_TOP:
                value = 4;
                break;
        }
        this.adbService.runAdbCommand('adb shell debug.oculus.foveation.level ' + value).then(() => {
            this.statusService.showStatus('Fixed Foveated Rendering set OK!!');
        });
    }
    setGPU(gpu: GPU) {
        let value = gpu === GPU._2 ? 2 : 4;
        this.adbService
            .runAdbCommand('adb shell setprop debug.oculus.cpuLevel ' + value)
            .then(() => this.adbService.runAdbCommand('adb shell setprop debug.oculus.gpuLevel ' + value))
            .then(() => {
                this.statusService.showStatus('CPU/GPU level set OK!!');
            });
    }
    setGuardian(guardian: GU) {
        this.adbService.runAdbCommand('adb shell setprop debug.oculus.guardian_pause ' + (guardian === GU.ON ? 1 : 0)).then(() => {
            this.statusService.showStatus('Guardian pause set OK!!');
        });
    }
    setCa(ca: CA) {
        this.adbService
            .runAdbCommand('adb shell setprop debug.oculus.forceChroma ' + (ca === CA.ON ? 1 : ca === CA.APP ? -1 : 0))
            .then(() => {
                this.statusService.showStatus('Chromatic Aberration set OK!!');
            });
    }
    setSSO(sso: SSO) {
        let value: number = 0;
        switch (sso) {
            case SSO._512:
                value = 512;
                break;
            case SSO._768:
                value = 768;
                break;
            case SSO._1024:
                value = 1024;
                break;
            case SSO._1280:
                value = 1280;
                break;
            case SSO._1536:
                value = 1536;
                break;
            case SSO._2048:
                value = 2048;
                break;
            case SSO._2560:
                value = 2560;
                break;
            case SSO._3072:
                value = 3072;
                break;
        }

        this.adbService
            .runAdbCommand('adb shell setprop debug.oculus.textureWidth ' + value)
            .then(() => this.adbService.runAdbCommand('adb shell setprop debug.oculus.textureHeight ' + value))
            .then(() => {
                this.statusService.showStatus('Texture Resolution set OK!!');
            });
    }
    setSVB(svb: SVB) {
        let value: number = 5000000;
        switch (svb) {
            case SVB._5Mbps:
                value = 5000000;
                break;
            case SVB._15Mbps:
                value = 15000000;
                break;
            case SVB._25Mbps:
                value = 25000000;
                break;
        }
        this.adbService.runAdbCommand('adb shell setprop debug.oculus.videoBitrate ' + value).then(() => {
            this.statusService.showStatus('Video Bitrate set OK!!');
        });
    }
    setCR(svr: CR) {
        let width: number = 1280;
        let height: number = 720;
        switch (svr) {
            case CR._480:
                width = 640;
                height = 480;
                break;
            case CR._720:
                width = 1280;
                height = 720;
                break;
            case CR._1080:
                width = 1920;
                height = 1080;
                break;
        }
        this.adbService
            .runAdbCommand('adb shell setprop debug.oculus.capture.width ' + width)
            .then(() => this.adbService.runAdbCommand('adb shell setprop debug.oculus.capture.height ' + height))
            .then(() => {
                this.statusService.showStatus('Capture Resolution set OK!!');
            });
    }
    setSVR(svr: SVR) {
        let value: number = 1024;
        switch (svr) {
            case SVR._1024:
                value = 1024;
                break;
            case SVR._1536:
                value = 1536;
                break;
        }
        this.adbService.runAdbCommand('adb shell setprop debug.oculus.videoResolution ' + value).then(() => {
            this.statusService.showStatus('Video Resolution set OK!!');
        });
    }
    setPavlovPermission() {
        return this.adbService
            .setPermission('com.vankrupt.pavlov', 'android.permission.RECORD_AUDIO')
            .then(() => this.adbService.setPermission('com.vankrupt.pavlov', 'android.permission.READ_EXTERNAL_STORAGE'))
            .then(() => this.adbService.setPermission('com.vankrupt.pavlov', 'android.permission.WRITE_EXTERNAL_STORAGE'));
    }
    setPavlovName() {
        this.adbService.adbCommand('shell', {
            serial: this.adbService.deviceSerial,
            command: 'echo ' + this.pavlovName + ' > /sdcard/pavlov.name.txt',
        });
    }
    pasteToDevice() {
        this._textToSend = this.textToSend.split('');
        this.textToSend = '';

        this.spinnerService.setMessage('Setting Text...');
        this.spinnerService.showLoader();
        this.inputCharacters()
            .then(() => {
                this.statusService.showStatus('Text sent to the device!!');
                this.spinnerService.hideLoader();
            })
            .catch(e => {
                this.statusService.showStatus(e.toString(), true);
                this.spinnerService.hideLoader();
            });
    }
    inputCharacters() {
        let character = this._textToSend.shift();
        return this.adbService.runAdbCommand('adb shell input text "' + character + '"').then(() => {
            if (this._textToSend.length) {
                return this.inputCharacters();
            }
        });
    }
    setHideNSFW() {
        if (this.appService.hideNSFW) {
            localStorage.setItem('hideNSFW', 'true');
        } else {
            localStorage.removeItem('hideNSFW');
        }
    }
}
