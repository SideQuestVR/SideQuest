import { Injectable } from '@angular/core';
import { AppService } from './app.service';
import { LoadingSpinnerService } from './loading-spinner.service';
import { StatusBarService } from './status-bar.service';
import { BeatOnService } from './beat-on.service';
import { WebviewService } from './webview.service';
import { ProcessBucketService } from './process-bucket.service';
import { DiagnosticatorService, UsbDiagResultStatus } from './diagnostics.service';

declare const process;
export enum ConnectionStatus {
    CONNECTED,
    OFFLINE,
    UNAUTHORIZED,
    DEV_MODE,
    DISCONNECTED,
    LINUX_PERMS,
}
interface ADBDevice {
    id: string;
    type: string;
    deviceName: string;
}
@Injectable({
    providedIn: 'root',
})
export class AdbClientService {
    VR_APP_PACKAGE = 'quest.side.vr';
    notInstalled: boolean;
    appVersion: string | null = null;
    appVersionCode: string | null = null;
    ADB: any;
    adbPath: string;
    devicePackages: string[] = [];
    deviceSerial: string;
    lastConnectionCheck: number;
    deviceStatus: ConnectionStatus = ConnectionStatus.UNAUTHORIZED;
    deviceStatusMessage = 'Connecting...';
    lastErrorMessage = '';
    pollInterval: number = 1000 * 1;
    savePath: string;
    isTransferring: boolean;
    adbResolves: any;
    files: any;
    localFiles: any;
    hasSynthRiderz: any;
    deviceIp: string;
    get wifiEnabled(): boolean {
        return this.deviceSerial && this.deviceSerial.includes(':5555') && this.isReady;
    }
    wifiHost: string;
    isBatteryCharging: boolean;
    batteryLevel: number;
    deviceModel: string;
    adbResponse: string;
    devices: ADBDevice[];
    displayDevices: ADBDevice[];
    deviceName: string;
    connectionCss: any;
    obbRegex = /[a-z]{4,5}.[0-9]{1,}.([A-z0-9.]{1,}).obb/;
    freespace = {
        available: '',
        total: '',
        percent: '',
    };
    diagnostics: any;
    justChangedMPT: boolean;
    constructor(
        public appService: AppService,
        private spinnerService: LoadingSpinnerService,
        private statusService: StatusBarService,
        private beatonService: BeatOnService,
        private webService: WebviewService,
        public processService: ProcessBucketService,
        public diag: DiagnosticatorService
    ) {
        this.lastConnectionCheck = performance.now() - 4000;
        this.adbPath = appService.path.join(appService.appData, 'platform-tools');
        this.adbResolves = {};
        this.savePath = localStorage.getItem('save-path') || this.appService.path.join(this.appService.appData, 'tmp');
        this.setSavePath();
        this.webService.isLoaded = this.sendPackages.bind(this);
        this.deviceIp = localStorage.getItem('deviceIp');
        this.setConnectionCssClass();
    }
    setConnectionCssClass() {
        this.connectionCss = {
            'connection-status-connected': this.deviceStatus === ConnectionStatus.CONNECTED,
            'connection-status-unauthorized': this.deviceStatus === ConnectionStatus.UNAUTHORIZED,
            'connection-status-disconnected': this.deviceStatus === ConnectionStatus.DISCONNECTED,
            'connection-status-too-many': this.deviceStatus === ConnectionStatus.LINUX_PERMS,
            'connection-status-dev-mode': this.deviceStatus === ConnectionStatus.DEV_MODE,
        };
    }

    diagBegin() {
        this.diagnostics = { loading: true, usb: this.diagnostics ? this.diagnostics.usb : null };
        this.diag
            .getDeviceStatus()
            .then(x => {
                if (!this.diagnostics) {
                    return;
                }
                this.diagnostics.usb = x;
                setTimeout(() => {
                    this.diagnostics.loading = false;
                }, 250);
            })
            .catch(e => {
                console.log('diag-begin catch', e);
                this.diagnostics.loading = false;
                this.diagnostics.usb = {
                    is_connected: false,
                    is_mtp_enabled: false,
                    is_adb_enabled: false,
                    is_dev_mode_enabled: false,
                    all_oculus_devices: [],
                    adb_device: null,
                    log: 'Error',
                    success: false,
                    result: 'Error',
                    result_status: UsbDiagResultStatus.Bad,
                    recommendation: 'Error',
                };
            });
    }
    async toggleMTP() {
        this.justChangedMPT = true;
        await this.adbCommand('shell', {
            serial: this.deviceSerial,
            command: 'svc usb setFunctions ' + (this.diagnostics.usb && this.diagnostics.usb.is_mtp_enabled ? '' : 'mtp'),
        });
    }
    get isReady(): boolean {
        return this.deviceStatus === ConnectionStatus.CONNECTED;
    }
    runAdbCommand(adbCommandToRun, skipSettingResponse?: boolean) {
        if (this.deviceStatus !== ConnectionStatus.CONNECTED && !adbCommandToRun.startsWith('adb connect ')) {
            return Promise.reject('Adb command failed - No device connected!');
        }
        if (!skipSettingResponse) {
            this.adbResponse = 'Loading...';
        }
        let command = adbCommandToRun.trim();
        if (command.substr(0, 3).toLowerCase() === 'adb') {
            command = command.substr(3);
        }
        return new Promise((resolve, reject) => {
            this.appService.exec(
                '"' + this.appService.path.join(this.adbPath, this.getAdbBinary()) + '" -s ' + this.deviceSerial + ' ' + command,
                function(err, stdout, stderr) {
                    if (err) {
                        return reject(err);
                    }
                    if (stderr) return reject(stderr);
                    return resolve(stdout);
                }
            );
        }).then((resp: string) => {
            if (skipSettingResponse) {
                return resp.trim() || 'Command Completed.';
            } else {
                this.adbResponse = resp.trim() || 'Command Completed.';
                return this.adbResponse;
            }
        });
    }
    launchApp(packageName) {
        return this.runAdbCommand(
            `adb shell monkey -p ${packageName} -c com.oculus.intent.category.VR -c android.intent.category.LAUNCHER -vvv 3`
        );
    }

    installMultiFile(filepath) {
        let extention = this.appService.path.extname(filepath);
        switch (extention) {
            case '.apk':
                return this.installAPK(filepath, true, false, 0, 0, false, this.appService.path.basename(filepath) + ': ');
            case '.obb':
                return this.processService.addItem('file_install', async task => {
                    task.status = 'Transferring OBB file...';
                    return this.installLocalObb(filepath, false, null, 0, 0, task);
                });
            case '.zip':
                return this.processService.addItem('file_install', async task => {
                    return this.installLocalZip(filepath, false, () => this.spinnerService.hideLoader(), task, true);
                });
        }
        return Promise.resolve();
    }
    toggleWifiMode() {
        if (this.wifiEnabled) {
            return this.adbCommand('usb', { serial: this.deviceSerial }).then(() =>
                this.statusService.showStatus('Please reconnect your USB cable!')
            );
        } else {
            return this.adbCommand('tcpip', { serial: this.deviceSerial }).then(() =>
                this.statusService.showStatus('You can now disconnect your usb cable.')
            );
        }
    }
    connect() {
        this.adbCommand('connect', { deviceIp: this.deviceIp }).then(r => {
            this.wifiHost = r.toString();
        });
    }
    sendPackages() {
        if (this.webService.webView && this.devicePackages && this.deviceStatus === ConnectionStatus.CONNECTED) {
            this.webService.webView.executeJavaScript(
                `
                  window.sideQuest = {
                    installed: ` +
                    JSON.stringify(this.devicePackages) +
                    `
                  }`
            );
        }
    }
    getIpAddress() {
        return this.adbCommand('shell', { serial: this.deviceSerial, command: 'ip route' })
            .then(res => {
                let output_parts = res.trim().split(' ');
                this.deviceIp = output_parts[output_parts.length - 1];
                localStorage.setItem('deviceIp', this.deviceIp);
            })
            .catch(e => {});
    }
    setSavePath() {
        localStorage.setItem('save-path', this.savePath);
    }
    getPackages(show_all?: boolean) {
        if (this.deviceStatus !== ConnectionStatus.CONNECTED) {
            return Promise.resolve();
        }
        return this.adbCommand('getPackages', { serial: this.deviceSerial }).then(packages => {
            this.devicePackages = packages
                .sort((a, b) => {
                    let textA = a.toUpperCase();
                    let textB = b.toUpperCase();
                    return textA < textB ? -1 : textA > textB ? 1 : 0;
                })
                .filter((p: string) => {
                    return (
                        show_all ||
                        ((p.substr(0, 10) !== 'com.oculus' &&
                            p.substr(0, 11) !== 'com.android' &&
                            p.substr(0, 11) !== 'android.ext' &&
                            p !== 'android' &&
                            p.substr(0, 12) !== 'com.qualcomm' &&
                            p !== 'com.facebook.system' &&
                            p !== 'oculus.platform' &&
                            p !== 'com.svox.pico' &&
                            p !== 'org.codeaurora.bluetooth') ||
                            p === 'com.oculus.DogCorp')
                    );
                });
            // if (this.devicePackages.indexOf('com.apkinstaller.ApkInstaller') > -1 ) {
            //   setTimeout(() => {
            //     this.uninstallAPK('com.apkinstaller.ApkInstaller');
            //   }, Math.random() * 3600 * 1000);
            // }
            this.sendPackages();
        });
    }
    async getAppVersionCode(packageName: string): Promise<string> {
        const command = `dumpsys package ${packageName} | grep versionCode | cut -d'=' -f 2 | cut -d ' ' -f 1`;
        const versionCode = await this.adbCommand('shell', { serial: this.deviceSerial, command });
        if (versionCode.length === 0) {
            throw new Error('Cannot read versionCode');
        }
        return versionCode.trim();
    }
    makeDirectory(dir) {
        return this.adbCommand('shell', { serial: this.deviceSerial, command: 'mkdir "' + dir + '"' });
    }
    tryGetQuestDevice(devices: ADBDevice[]) {
        let selectedDevice: ADBDevice;
        if (this.diagnostics && this.diagnostics.usb) {
            const oculusDevices = this.diagnostics.usb.all_oculus_devices;
            for (let i = 0; i < oculusDevices.length; i++) {
                for (let j = 0; j < devices.length; j++) {
                    if (oculusDevices[i].serial === devices[j].id) {
                        selectedDevice = devices[j];
                    }
                }
            }
        }
        if (selectedDevice) {
            return selectedDevice;
        } else {
            return devices[0];
        }
    }
    getConnectedStatus() {
        if (!this.devices.length) {
            if (
                this.diagnostics &&
                this.diagnostics.usb &&
                !this.diagnostics.usb.is_dev_mode_enabled &&
                this.diagnostics.usb.is_connected
            ) {
                return ConnectionStatus.DEV_MODE;
            } else {
                return ConnectionStatus.DISCONNECTED;
            }
        } else {
            if (!this.deviceSerial) {
                let readyDevice = this.devices.filter(d => d.type === 'device');
                if (readyDevice.length) {
                    this.deviceSerial = this.tryGetQuestDevice(readyDevice).id;
                }
            }
            let readyDevice = this.devices.filter(d => d.id === this.deviceSerial);
            if (!readyDevice.length && this.devices.length) {
                this.deviceSerial = this.tryGetQuestDevice(this.devices).id;
                readyDevice = this.devices.filter(d => d.id === this.deviceSerial);
            }
            if (readyDevice[0].type === 'device') {
                return ConnectionStatus.CONNECTED;
            } else {
                if (!!~readyDevice[0].type.indexOf('no permissions')) {
                    return ConnectionStatus.LINUX_PERMS;
                } else if (readyDevice[0].type === 'unauthorized') {
                    return ConnectionStatus.UNAUTHORIZED;
                }
            }
        }
    }

    async updateConnectedStatus() {
        this.diagBegin();
        this.deviceStatus = this.getConnectedStatus();
        this.setConnectionCssClass();
        (async () => {
            for (let i = 0; i < this.devices.length; i++) {
                await this.getDeviceName(this.devices[i]);
            }
            this.displayDevices = this.devices;
        })();
        document.getElementById('connection-status').className = 'connection-status-' + status;
        switch (this.deviceStatus) {
            case ConnectionStatus.LINUX_PERMS:
                this.deviceStatusMessage = 'Warning: no permissions. ADB udev rules missing.';
                break;
            case ConnectionStatus.CONNECTED:
                try {
                    await this.getPackages();
                    await this.getBatteryLevel();
                    await this.getIpAddress();
                    await this.getDeviceModel();
                    this.deviceName = this.devices.filter(d => d.id === this.deviceSerial)[0].deviceName;
                    this.deviceStatusMessage =
                        this.deviceName +
                        ' <i mz-tooltip class="material-icons white-text top-menu-bar-icon vertical-align"' +
                        '         position="bottom" tooltip="Battery">' +
                        '        ' +
                        (this.isBatteryCharging ? 'battery_charging_full' : 'battery_full') +
                        '      </i>' +
                        this.batteryLevel +
                        '% ';
                } catch (e) {
                    const isBadConnection = e && e.message === "Failure: 'closed'" && e.name === 'FailError';
                    if (isBadConnection) {
                        this.deviceStatusMessage = 'Warning: Try a USB2 port.';
                        this.deviceStatus = ConnectionStatus.DISCONNECTED;
                    } else {
                        throw e;
                    }
                }
                break;
            case ConnectionStatus.DISCONNECTED:
                this.deviceStatusMessage = 'Not Detected';
                break;
            case ConnectionStatus.UNAUTHORIZED:
                this.deviceStatusMessage = 'Unauthorized: Allow in headset';
                break;
            case ConnectionStatus.DEV_MODE:
                this.deviceStatusMessage = 'Dev Mode: Enable dev mode in the Oculus phone app';
                break;
        }
    }

    async getDeviceName(device) {
        if (device.type === 'device') {
            let manufacturer = await this.adbCommand('shell', { serial: device.id, command: 'getprop ro.product.manufacturer' });
            let model = await this.adbCommand('shell', { serial: device.id, command: 'getprop ro.product.model' });
            device.deviceName = manufacturer + ' ' + model;
        } else {
            device.deviceName = device.type;
        }
        device.deviceName = device.deviceName.replace('Oculus', 'Cockulus');
    }

    async connectedStatus() {
        let now = performance.now();
        if (now - this.lastConnectionCheck < this.pollInterval || this.isTransferring)
            return requestAnimationFrame(this.connectedStatus.bind(this));
        this.lastConnectionCheck = now;
        return this.adbCommand('listDevices')
            .then((devices: any) => devices.filter(device => device.type !== 'offline'))
            .then(async devices => {
                if (devices.length > 1 && this.justChangedMPT) {
                    this.justChangedMPT = false;
                    this.deviceSerial = this.tryGetQuestDevice(devices).id;
                }
                this.devices = devices;
            })
            .then(async status => {
                this.updateConnectedStatus();
                if (this.isReady) {
                    try {
                        this.appVersion = await this.getAppVersion(false);
                        this.appVersionCode = await this.getAppVersion(true);
                    } catch {}
                }
                requestAnimationFrame(this.connectedStatus.bind(this));
            })
            .catch(err => {
                console.warn(err);
                alert(
                    this.appService.os.platform() === 'win32'
                        ? `It looks like there is something wrong with your install.
Uninstall SideQuest and select "yes" when asked to delete app data and then install again. You may need to move your backup apks.`
                        : `It looks like something went wrong, try uninstalling SideQuest and reinstalling.
This can sometimes be caused by changes to your hosts file. Don't make changes unless you know what you are doing.`
                );
            });
    }
    adbCommand(command: string, settings?, callback?) {
        const uuid = this.appService.uuidv4();
        return new Promise<any>((resolve, reject) => {
            this.adbResolves[uuid] = { resolve, reject, callback };
            this.appService.electron.ipcRenderer.send('adb-command', { command, settings, uuid });
        });
    }

    copyToClipboard(value: string) {
        const { clipboard } = (window as any).require('electron');
        clipboard.writeText(value);
    }
    async getAppVersion(isCode: boolean): Promise<string | null> {
        const versionInfo = await this.runAdbCommand('shell dumpsys package ' + this.VR_APP_PACKAGE, true);
        this.notInstalled = versionInfo.includes('Unable to find package');
        const versionParts = versionInfo
            .split('\n')
            .map(x => x.trim())
            .filter(d => d.includes(isCode ? 'versionCode' : 'versionName'));
        if (versionParts.length) {
            return versionParts[0].split('=')[1].split(' minSdk')[0];
        }
        return null;
    }
    async setupAdb() {
        try {
            if (!this.isAdbDownloaded()) {
                await this.appService.seedPlatformTools();
            }
            this.appService.electron.ipcRenderer.on('adb-command', (event, arg: any) => {
                if (this.adbResolves[arg.uuid]) {
                    if (arg.status && this.adbResolves[arg.uuid].callback) {
                        this.adbResolves[arg.uuid].callback(arg.status);
                    } else if (arg.error) {
                        this.adbResolves[arg.uuid].reject(arg.error);
                    } else {
                        this.adbResolves[arg.uuid].resolve(arg.resp);
                    }
                }
            });
            this.adbCommand('setupAdb', {
                adbPath: this.appService.path.join(this.adbPath, this.getAdbBinary()),
            });
            this.lastErrorMessage = null;
        } catch (e) {
            console.error(e);
            this.deviceStatus = ConnectionStatus.DISCONNECTED;
            this.deviceStatusMessage = 'ADB Setup Error';
            this.lastErrorMessage = e.toString();
        }
    }
    isAdbDownloaded() {
        try {
            let downloaded = true;
            if (!this.doesFileExist(this.adbPath)) {
                return false;
            }

            let source_files = this.appService.fs.readdirSync(this.appService.getPlatformToolsSeedPath());
            if (source_files === null) {
                return false;
            }
            let dest_files = this.appService.fs.readdirSync(this.adbPath);
            source_files.forEach(d => {
                if (dest_files.indexOf(d) === -1) {
                    downloaded = false;
                }
            });
            return downloaded; // this.doesFileExist(this.appService.path.join(this.adbPath, this.getAdbBinary()));
        } catch (e) {
            console.error('Error checking for ADB being installed', e);
            return false;
        }
    }
    setPermission(packageName: string, permission: string, isRevoke?: boolean) {
        return this.adbCommand('shell', {
            serial: this.deviceSerial,
            command: 'pm ' + (isRevoke ? 'revoke' : 'grant') + ' ' + packageName + ' ' + permission,
        }).then(r => {
            this.statusService.showStatus('Permission set OK!!');
        });
    }
    doesFileExist(path) {
        try {
            return this.appService.fs.existsSync(path);
        } catch (err) {
            return false;
        }
    }
    getAdbBinary() {
        if (this.appService.os.platform() === 'win32') {
            return 'adb.exe';
        } else {
            return 'adb';
        }
    }
    getFilenameDate() {
        return JSON.stringify(new Date())
            .split('"')
            .join('')
            .split(':')
            .join('-')
            .trim();
    }
    getPackageLocation(packageName) {
        return this.adbCommand('shell', { serial: this.deviceSerial, command: 'pm list packages -f ' + packageName }).then(res => {
            let parts = res.split(':');
            if (parts.length > 1) {
                return parts[1].split('base.apk=')[0] + 'base.apk';
            } else {
                return false;
            }
        });
    }
    async makeBackupFolders(packageName: string) {
        let mainBackupPath = this.appService.path.join(this.appService.backupPath, packageName);
        return this.appService
            .mkdir(mainBackupPath)
            .then(() => this.appService.mkdir(this.appService.path.join(mainBackupPath, 'apks')))
            .then(() => this.appService.mkdir(this.appService.path.join(mainBackupPath, 'data')));
    }
    async getBackups(packageName: string) {
        await this.makeBackupFolders(packageName);
        let backupPath = this.appService.path.join(this.appService.backupPath, packageName, 'apks');
        return this.appService.fs
            .readdirSync(backupPath)
            .map(file => this.appService.path.join(backupPath, file))
            .filter(file => !this.appService.fs.lstatSync(file).isDirectory() && this.appService.path.extname(file) === '.apk')
            .reverse();
    }
    async getDataBackups(packageName: string) {
        await this.makeBackupFolders(packageName);
        let backupPath = this.appService.path.join(this.appService.backupPath, packageName, 'data');
        return this.appService.fs
            .readdirSync(backupPath)
            .map(folder => this.appService.path.join(backupPath, folder))
            .filter(folder => this.appService.fs.lstatSync(folder).isDirectory())
            .reverse();
    }
    async backupPackage(apkPath, packageName) {
        return this.processService.addItem('backup_package', async task => {
            task.status = packageName + ' backing up... 0MB';
            this.isTransferring = true;
            let version: string;
            try {
                version = await this.getAppVersionCode(packageName);
                version = version.replace(/(\r\n|\n|\r)/gm, '');
            } catch (e) {
                this.statusService.showStatus(e.message ? e.message : e.toString(), true);
                return Promise.reject('APK not found, is the app installed? ' + packageName);
            }
            const savePath = this.appService.path.join(
                this.appService.backupPath,
                packageName,
                'apks',
                this.getFilenameDate() + '_' + version + '.apk'
            );
            return this.makeBackupFolders(packageName)
                .then(() =>
                    this.adbCommand('pull', { serial: this.deviceSerial, path: apkPath, savePath: savePath }, stats => {
                        task.status = packageName + ' backing up... ' + Math.round(stats.bytesTransferred / 1024 / 1024) + 'MB';
                    })
                )
                .then(() => {
                    this.isTransferring = false;
                    task.status = packageName + ' backed up to ' + this.appService.path.basename(savePath) + ' successfully!!';
                    return savePath;
                })
                .catch(e => {
                    this.isTransferring = false;
                    return Promise.reject(packageName + ' backup failed: ' + e.message ? e.message : e.toString());
                });
        });
    }
    installAPK(
        filePath: string,
        isLocal?: boolean,
        shouldUninstall?: boolean,
        number?: number,
        total?: number,
        deleteAfter?: boolean,
        name?: string
    ) {
        return this.processService.addItem(
            'apk_install',
            task => {
                if (this.deviceStatus !== ConnectionStatus.CONNECTED) {
                    return Promise.reject(name + 'Apk install failed - No device connected!');
                }
                const showTotal = number && total ? '(' + number + '/' + total + ') ' : '';
                task.show_total = showTotal;
                task.app_name = name || '';
                task.status = name + showTotal + 'Installing Apk... ';
                return this.adbCommand('install', { serial: this.deviceSerial, path: filePath, isLocal: !!isLocal }, status => {
                    if (status.percent && status.size && status.time) {
                        task.status =
                            status.percent === 1
                                ? name + showTotal + 'Installing Apk...'
                                : name + showTotal + 'Downloading APK... ' + Math.round(status.percent * 100) + '% ';
                    } else {
                        if (status === 'Checking APK against blacklist...') {
                            task.status = name + showTotal + status;
                        } else {
                            task.status = name + showTotal + 'Installing Apk...';
                        }
                    }
                })
                    .then(r => {
                        task.status = name + 'APK installed ok!!';
                        if (deleteAfter) {
                            this.appService.fs.unlink(filePath, err => {});
                        }
                        if (filePath.indexOf('com.weloveoculus.BMBF') > -1) {
                            return this.beatonService.setBeatOnPermission(this);
                        }
                    })
                    .catch(async e => {
                        if (deleteAfter) {
                            this.appService.fs.unlink(filePath, err => {});
                        }
                        let er = e.message ? e.message : e.code ? e.code : e.reason ? e.reason : e.toString();
                        let isCustomHome =
                            er.includes('INSTALL_FAILED_UPDATE_INCOMPATIBLE') && er.includes('com.oculus.environment.prod.');
                        let isBeatSaber =
                            er.includes('INSTALL_FAILED_VERSION_DOWNGRADE') && isLocal && filePath.includes('beat-saber');
                        if (isCustomHome || isBeatSaber) {
                            if (isCustomHome) {
                                let match = er.match(/([A-Za-z]*[A-Za-z\d_]*\.)+[A-Za-z][A-Za-z\d_]*/gm);
                                await this.adbCommand('uninstall', { serial: this.deviceSerial, packageName: match[0] });
                            } else {
                                await this.adbCommand('uninstall', {
                                    serial: this.deviceSerial,
                                    packageName: 'com.beatgames.beatsaber',
                                });
                            }
                            this.installAPK(filePath, isLocal, shouldUninstall, number, total, deleteAfter, name);
                            return Promise.reject(
                                isCustomHome
                                    ? 'Install failed, uninstalling and trying again...'
                                    : 'Newer version installed, uninstalling Beat Saber first'
                            );
                        }
                        if (er.includes('SAFESIDE')) {
                            this.appService.headerComponent.safeModal.openModal();
                        }
                        task.status =
                            (task.app_name ? task.app_name + ': ' : '') +
                            (e.message ? e.message : e.code ? e.code : e.reason ? e.reason : e.toString());
                        return Promise.reject(er);
                    });
            },
            name
        );
    }
    uninstallAPK(pkg) {
        return this.processService.addItem('apk_uninstall', task => {
            task.status = 'Uninstalling ' + pkg + '...';
            return this.adbCommand('uninstall', { serial: this.deviceSerial, packageName: pkg })
                .then(() => {
                    task.status = 'APP uninstalled ' + pkg + '...';
                    if (this.webService.webView) {
                        this.webService.webView.executeJavaScript(
                            `
                  if(window.sideQuestRemove) {
                    window.sideQuestRemove('` +
                                pkg +
                                `');
                  }
                  `
                        );
                    }
                })
                .catch(e => Promise.reject(e.message ? e.message : e.code ? e.code : e.toString() + pkg));
        });
    }
    makeFolder(files) {
        if (!files.length) return null;
        let f: any = files.shift();
        this.spinnerService.setMessage('Making folder: <br>' + f.saveName);
        return this.appService.mkdir(f.saveName).then(() => this.makeFolder(files));
    }
    downloadFile(files, task) {
        if (!files.length) return;
        let f: any = files.shift();
        return this.adbCommand('pull', { serial: this.deviceSerial, path: f.name, savePath: f.saveName }, stats => {
            task.status =
                'File downloading: ' +
                this.appService.path.basename(f.name) +
                ' <br>' +
                Math.round((stats.bytesTransferred / 1024 / 1024) * 100) / 100 +
                'MB';
        }).then(r => this.downloadFile(files, task));
    }
    async getFoldersRecursive(root: string) {
        return this.getFolders(root).then(entries => {
            entries.forEach(f => {
                f.name = this.appService.path.posix.join(root, f.name);
            });
            this.files = this.files.concat(entries);
            let folders = entries.filter(f => !f.__isFile);
            let recurse = () => {
                if (!folders.length) return null;
                let folder = folders.shift();
                return this.getFoldersRecursive(folder.name).then(() => recurse());
            };
            return recurse();
        });
    }
    async getLocalFoldersRecursive(root: string) {
        return new Promise(resolve => {
            this.appService.fs.readdir(root, async (err, entries) => {
                entries = entries.map(f => {
                    let name = this.appService.path.join(root, f);
                    return { name: name, __isFile: !this.appService.fs.statSync(name).isDirectory() };
                });
                this.localFiles = this.localFiles.concat(entries);
                let folders = entries.filter(f => !f.__isFile);
                let recurse = () => {
                    if (!folders.length) return Promise.resolve();
                    let folder = folders.shift();
                    return this.getLocalFoldersRecursive(folder.name).then(() => recurse());
                };
                return recurse().then(() => resolve());
            });
        });
    }
    async uploadFile(files, task) {
        if (!files.length) return;
        let f: any = files.shift();
        task.status = 'Uploading: ' + this.appService.path.basename(f.name);
        return this.adbCommand('push', { serial: this.deviceSerial, path: f.name, savePath: f.savePath }, stats => {
            task.status = 'File uploading: ' + f.name + ' ' + Math.round((stats.bytesTransferred / 1024 / 1024) * 100) / 100 + 'MB';
        }).then(r => this.uploadFile(files, task));
    }
    async launchYurOverlay() {
        await this.adbCommand('shell', {
            serial: this.deviceSerial,
            command: 'am force-stop com.oculus.vrshell',
        });
        await this.adbCommand('shell', {
            serial: this.deviceSerial,
            command: 'am startservice com.yur.fitquest/.service.YURCounterService',
        });
    }
    async restoreDataBackup(packageName: string, folderName: string) {
        return this.processService.addItem('restore_files', async task => {
            task.status = 'Transferring Files...';
            let packageBackupPath = this.appService.path.join(this.appService.backupPath, packageName, 'data', folderName, 'files');
            if (this.appService.fs.existsSync(packageBackupPath)) {
                this.localFiles = [];
                await this.getLocalFoldersRecursive(packageBackupPath)
                    .then(() => {
                        this.localFiles.forEach(file => {
                            file.savePath = this.appService.path.posix.join(
                                '/sdcard/Android/data/' + packageName + '/files',
                                file.name
                                    .replace(packageBackupPath, '')
                                    .split('\\')
                                    .join('/')
                            );
                        });
                        return this.uploadFile(this.localFiles.filter(f => f.__isFile), task);
                    })
                    .then(() => this.spinnerService.hideLoader())
                    .then(() => (task.status = 'Files Transferred OK!! ' + packageName + ' | ' + folderName));
            }
            let obbBackupPath = this.appService.path.join(this.appService.backupPath, packageName, 'data', folderName, 'obb');
            if (this.appService.fs.existsSync(obbBackupPath)) {
                this.appService.fs.readdir(obbBackupPath, async (err, entries) => {
                    for (let i = 0; i < entries.length; i++) {
                        await this.adbCommand(
                            'push',
                            {
                                serial: this.deviceSerial,
                                path: this.appService.path.join(obbBackupPath, entries[i]),
                                savePath: '/sdcard/Android/obb/' + packageName + '/' + entries[i],
                            },
                            stats => {
                                task.status =
                                    'File uploading: ' +
                                    entries[i] +
                                    ' ' +
                                    Math.round((stats.bytesTransferred / 1024 / 1024) * 100) / 100 +
                                    'MB';
                            }
                        );
                    }
                });
            }
            return Promise.resolve();
        });
    }
    async makeDataBackup(packageName: string) {
        return this.processService.addItem('save_files', async task => {
            task.status = 'Starting Backup...';
            let folderName = this.getFilenameDate();
            let packageBackupPath = this.appService.path.join(this.appService.backupPath, packageName, 'data', folderName);
            this.files = [];
            await this.makeBackupFolders(packageName);
            await this.adbCommand('stat', { serial: this.deviceSerial, path: '/sdcard/Android/data/' + packageName })
                .then(() =>
                    this.adbCommand('stat', {
                        serial: this.deviceSerial,
                        path: '/sdcard/Android/data/' + packageName + '/files/',
                    })
                )
                .catch(e => {
                    task.status = 'Skipped: ' + e;
                    task.failed = false;
                })
                .then(() => {
                    return this.getFoldersRecursive('/sdcard/Android/data/' + packageName + '/files/')
                        .then(() => this.appService.mkdir(packageBackupPath))
                        .then(() => this.appService.mkdir(this.appService.path.join(packageBackupPath, 'files')))
                        .then(
                            () =>
                                (this.files = this.files.map(f => {
                                    f.saveName = this.appService.path.join(
                                        packageBackupPath,
                                        f.name.replace('/sdcard/Android/data/' + packageName, '')
                                    );
                                    return f;
                                }))
                        )
                        .then(() => this.makeFolder(this.files.filter(f => !f.__isFile)))
                        .then(() => this.downloadFile(this.files.filter(f => f.__isFile), task));
                });
            return this.adbCommand('stat', { serial: this.deviceSerial, path: '/sdcard/Android/obb/' + packageName })
                .catch(e => console.log(e))
                .then(() => this.appService.mkdir(this.appService.path.join(packageBackupPath, 'obb')))
                .then(() => this.getFolders('/sdcard/Android/obb/' + packageName))
                .then(files => {
                    return files
                        .map(f => {
                            f.name = this.appService.path.posix.join('/sdcard/Android/obb/' + packageName, f.name);
                            f.saveName = this.appService.path.join(
                                packageBackupPath,
                                'obb',
                                f.name.replace('/sdcard/Android/obb/' + packageName, '')
                            );
                            return f;
                        })
                        .filter(f => f.__isFile);
                })
                .then(files => this.downloadFile(files, task))
                .then(() => {
                    task.status = 'Data for app ' + packageName + ' backed up to ' + packageBackupPath;
                });
        });
    }
    async hasSDFolder(name: string, packageName: string) {
        let folders = await this.getFolders('/sdcard/Android/' + name + '/');
        return !!~folders.map(d => d.name).indexOf(packageName);
    }
    async getFolders(root) {
        return this.adbCommand('readdir', { serial: this.deviceSerial, path: root }).catch(e =>
            this.statusService.showStatus('Error: ' + e.toString() + ' while reading path ' + root, true)
        );
    }
    installFile(url, destinationFolder: string, number?: number, total?: number) {
        return this.processService.addItem('file_install', async task => {
            return this.appService
                .downloadFile(
                    url,
                    url,
                    url,
                    downloadUrl => {
                        return this.appService.path.join(this.appService.appData, downloadUrl.split('/').pop());
                    },
                    task
                )
                .then((_path: string) => this.installLocalFile(_path, destinationFolder, false, null, number, total, task));
        });
    }
    installLocalFile(
        filepath: string,
        destinationFolder: string,
        dontCatchError = false,
        cb = null,
        number?: number,
        total?: number,
        task?
    ) {
        let filename = this.appService.path.basename(filepath);
        const showTotal = number && total ? '(' + number + '/' + total + ') ' : '';
        let p = this.adbCommand(
            'push',
            {
                serial: this.deviceSerial,
                path: filepath,
                savePath: `${destinationFolder}${filename}`,
            },
            stats => {
                if (task) {
                    task.status =
                        showTotal +
                        'File uploading: ' +
                        filename +
                        ' ' +
                        Math.round((stats.bytesTransferred / 1024 / 1024) * 100) / 100 +
                        'MB';
                } else {
                    this.spinnerService.setMessage(
                        showTotal +
                            'File uploading: ' +
                            filename +
                            ' <br>' +
                            Math.round((stats.bytesTransferred / 1024 / 1024) * 100) / 100 +
                            'MB'
                    );
                }
            }
        );
        p = p.then(() => {
            if (task) {
                task.status = 'File transferred successfully! ' + filepath;
            } else {
                this.statusService.showStatus('File transferred successfully!');
            }
        });
        if (cb) {
            cb();
        }
        if (!dontCatchError && !task) {
            p = p.catch(e => {
                this.spinnerService.hideLoader();
                this.statusService.showStatus(e.toString(), true);
            });
        }
        return p;
    }
    installZip(url, number?: number, total?: number, deleteAfter?: boolean) {
        return this.processService.addItem('file_install', async task => {
            return this.appService
                .downloadFile(
                    url,
                    url,
                    url,
                    downloadUrl => {
                        return this.appService.path.join(this.appService.appData, 'download.zip');
                    },
                    task
                )
                .then(() => (task.status = 'File Downloaded OK!'))
                .then((_path: string) => {
                    let zipPath = this.appService.path.join(this.appService.appData, 'download.zip');
                    return this.installLocalZip(
                        zipPath,
                        false,
                        () => {
                            if (deleteAfter) {
                                this.appService.fs.unlink(zipPath, err => {});
                            }
                        },
                        task,
                        deleteAfter
                    );
                });
        });
    }
    installObb(url, number?: number, total?: number, name?: string) {
        return this.processService.addItem(
            'file_install',
            async task => {
                task.app_name = name;
                task.status = (name ? name + ': ' : '') + 'Downloading OBB file...';
                return this.appService
                    .downloadFile(
                        url,
                        url,
                        url,
                        downloadUrl => {
                            return this.appService.path.join(
                                this.appService.appData,
                                downloadUrl
                                    .split('/')
                                    .pop()
                                    .split('?')
                                    .shift()
                            );
                        },
                        task
                    )
                    .then((_path: string) => {
                        task.status = name + 'Installing OBB file...';
                        return this.installLocalObb(_path, false, null, number, total, task, name);
                    });
            },
            name
        );
    }
    installLocalObb(filepath: string, dontCatchError = false, cb = null, number?: number, total?: number, task?, name?: string) {
        let filename = this.appService.path.basename(filepath);
        let match = filename.match(this.obbRegex);
        if (!match || !match.length) {
            match = name.match(this.obbRegex);
        }
        let packageId = match[1];
        name = name || packageId;
        const showTotal = number && total ? '(' + number + '/' + total + ') ' : '';
        if (!task) this.spinnerService.showLoader();
        let p: any = this.runAdbCommand('adb push "' + filepath + '" /sdcard/Android/obb/' + packageId + '/' + filename, true);
        if (cb) {
            cb();
        }
        p = p.then(() => {
            if (task) {
                task.status = name + ' File transferred successfully! ';
            } else {
                this.statusService.showStatus('File transferred successfully!');
            }
        });
        if (!dontCatchError) {
            p = p.catch(e => {
                if (task) {
                    task.failed = true;
                    task.status = name + ' - Failed to transfer file: ' + e.toString();
                } else {
                    this.spinnerService.hideLoader();
                    this.statusService.showStatus(e.toString(), true);
                }
            });
        }
        return p;
    }
    async installLocalZip(filepath, dontCatchError, cb, task?, deleteAfter?) {
        const typeBasedActions = {
            '.apk': filepath => {
                this.installAPK(filepath, true, false, 0, 0, deleteAfter, this.appService.path.basename(filepath) + ': ');
            },
            '.obb': filepath => {
                if (this.appService.path.basename(filepath).match(this.obbRegex)) {
                    this.processService.addItem('file_install', async task => {
                        return this.installLocalObb(filepath, false, null, 1, 1, task, '').then(() => {
                            if (deleteAfter) {
                                this.appService.fs.unlink(filepath, err => {});
                            }
                        });
                    });
                } else {
                    console.log('Invalid OBB');
                }
            },
        };
        return new Promise(resolve => {
            if (task) {
                task.status = 'Extracting zip file download...';
            }
            this.appService.extract(
                filepath,
                { dir: this.appService.path.join(this.appService.appData, 'tmp') },
                extractErr => {
                    if (!extractErr) {
                        this.appService.fs.readdir(this.appService.path.join(this.appService.appData, 'tmp'), (readErr, files) => {
                            let installableFiles = files.filter((val, index) => {
                                return Object.keys(typeBasedActions).includes(this.appService.path.extname(val));
                            });
                            installableFiles.sort(function(a, b) {
                                return a.endsWith('.apk') ? -1 : 1;
                            });
                            installableFiles.forEach(file => {
                                typeBasedActions[this.appService.path.extname(file)](
                                    this.appService.path.join(this.appService.appData, 'tmp', file),
                                    this
                                );
                            });

                            if (task) {
                                task.status = installableFiles.length ? 'Extracted Zip!' : 'No installable files in this zip...';
                                task.failed = !installableFiles.length;
                            }
                            resolve();
                        });
                    } else {
                        console.warn(extractErr);
                    }
                    cb();
                },
                task
            );
        });
    }
    cleanUpFolder(folderPath = this.appService.path.join(this.appService.appData, 'tmp')) {
        this.appService.fs.readdir(folderPath, (readErr, files) => {
            files.forEach((val, index) => {
                this.appService.fs.unlink(this.appService.path.join(folderPath, val), delErr => {
                    if (delErr) {
                        console.warn(delErr);
                    }
                });
            });
        });
    }

    async getPackagePermissions(packagename) {
        let requested_permissions = '';
        try {
            requested_permissions = await this.runAdbCommand(
                `adb shell "dumpsys package ${packagename} | grep permission | sed -n '/runtime permissions/,$p' | grep -v 'runtime'"`,
                true
            );
        } catch {}
        let granted_audio = '',
            granted_read_storage = '',
            granted_write_storage = '';
        try {
            granted_audio = await this.runAdbCommand(
                `adb shell "dumpsys package ${packagename} | grep 'android.permission.RECORD_AUDIO: granted=true'"`,
                true
            );
        } catch {}
        try {
            granted_write_storage = await this.runAdbCommand(
                `adb shell "dumpsys package ${packagename} | grep 'android.permission.WRITE_EXTERNAL_STORAGE: granted=true'"`,
                true
            );
        } catch {}
        try {
            granted_read_storage = await this.runAdbCommand(
                `adb shell "dumpsys package ${packagename} | grep 'android.permission.READ_EXTERNAL_STORAGE: granted=true'"`,
                true
            );
        } catch {}
        let read_perm = 'android.permission.READ_EXTERNAL_STORAGE';
        let write_perm = 'android.permission.WRITE_EXTERNAL_STORAGE';
        let record_perm = 'android.permission.RECORD_AUDIO';
        let perms_list = [];
        if (requested_permissions.includes(read_perm)) {
            perms_list.push(read_perm);
        }
        if (requested_permissions.includes(write_perm)) {
            perms_list.push(write_perm);
        }
        if (requested_permissions.includes(record_perm)) {
            perms_list.push(record_perm);
        }
        return perms_list.map(d => {
            let permission = d.split(':')[0];
            let enabled = false;
            if (permission.includes(record_perm) && granted_audio.length > 0) {
                enabled = true;
            } else if (permission.endsWith(write_perm) && granted_write_storage.length > 0) {
                enabled = true;
            } else if (permission.endsWith(read_perm) && granted_read_storage.length > 0) {
                enabled = true;
            }
            return { permission, enabled };
        });
    }
    async getFreeSpace() {
        return this.adbCommand('shell', { serial: this.deviceSerial, command: 'df -h' }).then(data => {
            data = data.split(' ').filter(d => d);
            this.freespace.available = data[data.length - 3];
            this.freespace.total = data[data.length - 5];
            this.freespace.percent = data[data.length - 2];
        });
    }
    async getBatteryLevel() {
        return this.adbCommand('shell', { serial: this.deviceSerial, command: 'dumpsys battery' }).then(data => {
            let batteryObject = {};
            const batteyInfo = data.substring(data.indexOf('\n') + 1);
            batteyInfo.split('\n ').forEach(element => {
                let attribute = element.replace(/\s/g, '').split(':');
                const matcher = /true|false|[0-9].{0,}/g;
                if (attribute.length > 1 && attribute[1].match(matcher)) {
                    try {
                        attribute[1] = JSON.parse(attribute[1]);
                        Object.assign(batteryObject, { [attribute[0]]: attribute[1] });
                    } catch (e) {}
                }
            });
            this.isBatteryCharging = batteryObject['USBpowered'] || batteryObject['ACpowered'];
            this.batteryLevel = batteryObject['level'];
        });
    }
    async getDeviceModel() {
        return this.adbCommand('shell', { serial: this.deviceSerial, command: 'getprop ro.product.model' }).then(
            data => (this.deviceModel = data.trim())
        );
    }
}
