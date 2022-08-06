import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { AdbClientService } from '../adb-client.service';
import { AppService, FolderType } from '../app.service';
import { StatusBarService } from '../status-bar.service';
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
    _app,
}
enum EXP {
    Off,
    On,
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
    _1440,
    _Go,
    _Quest1,
    _Quest2,
}
enum CR {
    _480,
    _720,
    _1080,
    _1024,
    _1600,
}
enum RR {
    _60,
    _72,
    _72_DEF,
    _90,
    _120,
}
enum FPS {
    _24,
    _30,
    _60,
}
enum BR {
    _2K,
    _5K,
    _10K,
    _15K,
    _20K,
}
enum TP {
    _FHD,
    _SQUARE,
}
@Component({
    selector: 'app-headset-settings',
    templateUrl: './headset-settings.component.html',
    styleUrls: ['./headset-settings.component.scss'],
})
export class HeadsetSettingsComponent implements OnInit {
    @Output() close = new EventEmitter();
    folder = FolderType;
    experimentalEnabled: boolean;
    refreshRate: string;
    chromaticAberration: string;
    guardianEnabled: boolean;
    fullRateCaptureEnabled: boolean;
    fixedFoveatedRendering: string;
    videoCaptureSize: string;
    cpuGpuLevel: string;
    textureSize: string;
    captureFps: string;
    captureBitrate: string;
    FFR = FFR;
    SSO = SSO;
    GU = GU;
    CA = CA;
    CR = CR;
    GPU = GPU;
    RR = RR;
    EXP = EXP;
    BR = BR;
    FPS = FPS;
    TP = TP;
    constructor(public adbService: AdbClientService, public appService: AppService, private statusService: StatusBarService) {
        this.appService.resetTop();
        appService.webService.isWebviewOpen = false;
        //   appService.isSettingsOpen = true;
    }

    async ngOnInit() {
        this.getInitialValues();
    }

    async getInitialValues() {
        if (this.adbService.isReady) {
            this.getPropertyValues();
        } else {
            setTimeout(() => this.getInitialValues(), 200);
        }
    }

    async getPropertyValues() {
        await this.getBool('experimentalEnabled', 'debug.oculus.experimentalEnabled');
        await this.getBool('guardianEnabled', 'debug.oculus.guardian_pause');
        await this.getBool('fullRateCaptureEnabled', 'debug.oculus.fullRateCapture');
        await this.getString('debug.oculus.refreshRate', '72', 'refreshRate');
        await this.getString('debug.oculus.forceChroma', '1', 'chromaticAberration');
        await this.getString('debug.oculus.foveation.level', '2', 'fixedFoveatedRendering');
        await this.getString('debug.oculus.capture.fps', '24', 'captureFps');
        await this.getString('debug.oculus.capture.bitrate', '5000000', 'captureBitrate');
        await this.getDoubleString('debug.oculus.capture.width', 'debug.oculus.capture.height', '1024', '1024', 'videoCaptureSize');
        await this.getDoubleString('debug.oculus.cpuLevel', 'debug.oculus.gpuLevel', 'app', 'app', 'cpuGpuLevel');
        await this.getDoubleString('debug.oculus.textureWidth', 'debug.oculus.textureHeight', '1440', '1584', 'textureSize');
    }

    openDebugger() {
        this.appService.remote.getCurrentWindow().toggleDevTools();
    }

    async getDoubleString(
        firstProperty: string,
        secondProperty: string,
        firstDefault: string,
        secondDefault: string,
        value: string
    ) {
        const response = await this.getValue(firstProperty);
        const response2 = await this.getValue(secondProperty);
        this[value] =
            (response.trim() ? response.trim() : firstDefault) + '-' + (response2.trim() ? response2.trim() : secondDefault);
    }

    async getString(property: string, defaultValue: string, value: string) {
        const response = await this.getValue(property);
        this[value] = response.trim() ? response.trim() : defaultValue;
    }

    async getBool(value: string, property: string) {
        const response = await this.getValue(property);
        if (response.trim() === '1') {
            this[value] = true;
        }
    }

    async getValue(property: string) {
        const response = await this.adbService.adbCommand('shell', {
            serial: this.adbService.deviceSerial,
            command: 'getprop ' + property,
        });
        return response;
    }
    setFFR(ffr: FFR) {
        let value = 0;
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
        this.runAdbCommand('setprop debug.oculus.foveation.level ' + value)
            .then(() => {
                this.statusService.showStatus('Fixed Foveated Rendering set OK!!');
                return this.getString('debug.oculus.foveation.level', '2', 'fixedFoveatedRendering');
            })
            .catch(e => this.statusService.showStatus(e, true));
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
    setExperimental(exp: EXP) {
        this.runAdbCommand('setprop debug.oculus.experimentalEnabled ' + exp)
            .then(() => {
                this.statusService.showStatus('Experimental Mode set OK!!');
                return this.getBool('experimentalEnabled', 'debug.oculus.experimentalEnabled');
            })
            .catch(e => this.statusService.showStatus(e, true));
    }
    setGPU(gpu: GPU) {
        const value = gpu === GPU._2 ? 2 : gpu === GPU._app ? "''" : 4;
        this.runAdbCommand('setprop debug.oculus.cpuLevel ' + value)
            .then(() => this.runAdbCommand('setprop debug.oculus.gpuLevel ' + value))
            .then(() => {
                this.statusService.showStatus('CPU/GPU level set OK!!');
                return this.getDoubleString('debug.oculus.cpuLevel', 'debug.oculus.gpuLevel', 'app', 'app', 'cpuGpuLevel');
            })
            .catch(e => this.statusService.showStatus(e, true));
    }
    setCaptureFPSRate(fps: FPS) {
        let value = 0;
        switch (fps) {
            case FPS._24:
                value = 24;
                break;
            case FPS._30:
                value = 30;
                break;
            case FPS._60:
                value = 60;
                break;
        }
        this.runAdbCommand('setprop debug.oculus.capture.fps ' + value)
            .then(async () => {
                this.statusService.showStatus('Capture FPS set OK!!');
                await this.getString('debug.oculus.capture.fps', '24', 'captureFps');
            })
            .catch(e => this.statusService.showStatus(e, true));
    }
    setCaptureBitrate(bitrate: BR) {
        let value = 0;
        switch (bitrate) {
            case BR._5K:
                value = 5000000;
                break;
            case BR._10K:
                value = 10000000;
                break;
            case BR._15K:
                value = 15000000;
                break;
            case BR._20K:
                value = 20000000;
                break;
        }
        this.runAdbCommand('setprop debug.oculus.capture.bitrate ' + value)
            .then(() => {
                this.statusService.showStatus('Capture Bit Rate set OK!!');
                return this.getString('debug.oculus.capture.bitrate', '5000000', 'captureBitrate');
            })
            .catch(e => this.statusService.showStatus(e, true));
    }
    setTetianasPreset(tp: TP) {
        let width = 1920;
        let height = 1080;
        switch (tp) {
            case TP._FHD:
                width = 1920;
                height = 1080;
                break;
            case TP._SQUARE:
                width = 1600;
                height = 1600;
                break;
        }
        this.runAdbCommand('setprop debug.oculus.capture.width ' + width)
            .then(() => this.runAdbCommand('setprop debug.oculus.capture.height ' + height))
            .then(() => this.runAdbCommand('setprop debug.oculus.capture.fps 60'))
            .then(() => this.runAdbCommand('setprop debug.oculus.capture.bitrate 10000000'))
            .then(async () => {
                this.statusService.showStatus('Capture settings set OK!!');
                await this.getString('debug.oculus.capture.bitrate', '5000000', 'captureBitrate');
                await this.getString('debug.oculus.capture.fps', '24', 'captureFps');
                await this.getDoubleString(
                    'debug.oculus.capture.width',
                    'debug.oculus.capture.height',
                    '1024',
                    '1024',
                    'videoCaptureSize'
                );
            })
            .catch(e => this.statusService.showStatus(e, true));
    }
    setGuardian(guardian: GU) {
        this.runAdbCommand('setprop debug.oculus.guardian_pause ' + (guardian === GU.ON ? 0 : 1))
            .then(() => {
                this.statusService.showStatus('Guardian pause set OK!!');
                return this.getBool('guardianEnabled', 'debug.oculus.guardian_pause');
            })
            .catch(e => this.statusService.showStatus(e, true));
    }
    setCa(ca: CA) {
        this.runAdbCommand('setprop debug.oculus.forceChroma ' + (ca === CA.ON ? 1 : ca === CA.APP ? -1 : 0))
            .then(() => {
                this.statusService.showStatus('Chromatic Aberration set OK!!');
                return this.getString('debug.oculus.forceChroma', '1', 'chromaticAberration');
            })
            .catch(e => this.statusService.showStatus(e, true));
    }
    setRR(rr: RR) {
        let value = 72;
        switch (rr) {
            case RR._60:
                value = 60;
                break;
            case RR._72_DEF:
            case RR._72:
                value = 72;
                break;
            case RR._90:
                value = 90;
                break;
            case RR._120:
                value = 120;
                break;
        }
        this.runAdbCommand('setprop debug.oculus.refreshRate ' + value)
            .then(() => {
                this.statusService.showStatus('Refresh Rate set OK!!');
                return this.getString('debug.oculus.refreshRate', '72', 'refreshRate');
            })
            .catch(e => this.statusService.showStatus(e, true));
    }
    setSSO(sso: SSO) {
        let value = 1440;
        let hvalue = 1584;
        switch (sso) {
            case SSO._512:
                value = 512;
                hvalue = 563;
                break;
            case SSO._768:
                value = 768;
                hvalue = 845;
                break;
            case SSO._1024:
                value = 1024;
                hvalue = 1127;
                break;
            case SSO._1280:
                value = 1280;
                hvalue = 1408;
                break;
            case SSO._1536:
                value = 1536;
                hvalue = 1690;
                break;
            case SSO._2048:
                value = 2048;
                hvalue = 2253;
                break;
            case SSO._2560:
                value = 2560;
                hvalue = 2816;
                break;
            case SSO._3072:
                value = 3072;
                hvalue = 3380;
                break;
            case SSO._1440:
                value = 1440;
                hvalue = 1584;
                break;
            case SSO._Go:
                value = 1024;
                hvalue = 1024;
                break;
            case SSO._Quest1:
                value = 1216;
                hvalue = 1344;
                break;
            case SSO._Quest2:
                value = 1440;
                hvalue = 1584;
                break;
        }

        this.runAdbCommand('setprop debug.oculus.textureWidth ' + value)
            .then(() => this.runAdbCommand('setprop debug.oculus.textureHeight ' + hvalue))
            .then(() => this.runAdbCommand('"settings put system font_scale 0.85 && settings put system font_scale 1.0"'))
            .then(() => {
                this.statusService.showStatus('Texture Resolution set OK!!');
                return this.getDoubleString(
                    'debug.oculus.textureWidth',
                    'debug.oculus.textureHeight',
                    '1440',
                    '1584',
                    'textureSize'
                );
            })
            .catch(e => this.statusService.showStatus(e, true));
    }
    setCR(svr: CR) {
        let width = 1024;
        let height = 1024;
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
            case CR._1024:
                width = 1024;
                height = 1024;
                break;
            case CR._1600:
                width = 1600;
                height = 1600;
                break;
        }
        this.runAdbCommand('setprop debug.oculus.capture.width ' + width)
            .then(() => this.runAdbCommand('setprop debug.oculus.capture.height ' + height))
            .then(() => {
                this.statusService.showStatus('Capture Resolution set OK!!');
                return this.getDoubleString(
                    'debug.oculus.capture.width',
                    'debug.oculus.capture.height',
                    '1024',
                    '1024',
                    'videoCaptureSize'
                );
            })
            .catch(e => this.statusService.showStatus(e, true));
    }
}
