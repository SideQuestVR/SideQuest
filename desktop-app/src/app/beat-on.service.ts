import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { LoadingSpinnerService } from './loading-spinner.service';
import { StatusBarService } from './status-bar.service';
import { AppService } from './app.service';
import { ProcessBucketService } from './process-bucket.service';

interface BeatOnStatus {
    CurrentStatus: string;
    IsBeatSaberInstalled: boolean;
}
export interface HostSetupEvent {
    SetupEvent: SetupEventType;
    Message: string;
    Type: string;
}

export enum SetupEventType {
    Step1Complete = 'Step1Complete',
    Step2Complete = 'Step2Complete',
    Step3Complete = 'Step3Complete',
    Error = 'Error',
    StatusMessage = 'StatusMessage',
}
@Injectable({
    providedIn: 'root',
})
export class BeatOnService {
    beatOnEnabled: boolean;
    UpgradeRestoreAvailable: boolean;
    beatOnPID: string;
    websocket: WebSocket;
    beatOnStatus: BeatOnStatus = {
        CurrentStatus: '',
        IsBeatSaberInstalled: false,
    };

    constructor(
        private http: HttpClient,
        private spinnerService: LoadingSpinnerService,
        private statusService: StatusBarService,
        private appService: AppService,
        private processService: ProcessBucketService
    ) {}
    setupBeatOn(adbService) {
        this.spinnerService.showLoader();
        return this.beatOnStep(adbService, '1')
            .then(() => this.spinnerService.setMessage('Uninstalling APK'))
            .then(() => adbService.uninstallAPK('com.beatgames.beatsaber'))
            .then(() => this.spinnerService.showLoader())
            .then(() => this.beatOnStep(adbService, '2?skipuninstall'))
            .then(() => this.beatOnStep(adbService, '3?skipinstall'))
            .then(() => this.spinnerService.setMessage('Installing APK'))
            .then(() => {
                setTimeout(
                    () =>
                        adbService
                            .adbCommand('installRemote', {
                                serial: adbService.deviceSerial,
                                path: '/sdcard/Android/data/com.weloveoculus.BMBF/cache/beatsabermod.apk',
                            })
                            .then(() =>
                                adbService.setPermission('com.beatgame.beatsaber', 'android.permission.WRITE_EXTERNAL_STORAGE')
                            )
                            .then(() =>
                                adbService.setPermission('com.beatgame.beatsaber', 'android.permission.READ_EXTERNAL_STORAGE')
                            )
                            .then(() => {
                                this.spinnerService.hideLoader();
                                this.statusService.showStatus('Installed!');
                            })
                            .catch(e => {
                                this.spinnerService.hideLoader();
                                this.statusService.showStatus(e.message ? e.message : e.code ? e.code : e.toString(), true);
                            }),
                    4000
                );
            });
    }
    beatOnRequest(adbService, endpoint: string, method: string = 'GET') {
        return this.http.get('http://' + adbService.deviceIp + ':50000/host/' + endpoint).toPromise();
    }
    beatOnStep(adbService, step: string) {
        return this.http
            .post('http://' + adbService.deviceIp + ':50000/host/mod/install/step' + step, '')
            .toPromise()
            .then(r => console.log(r));
    }
    checkHasRestore(adbService) {
        this.beatOnRequest(adbService, 'mod/startupstatus').then(
            (r: any) => (this.UpgradeRestoreAvailable = r.UpgradeRestoreAvailable)
        );
    }
    confirmRestore(adbService) {
        return this.http
            .post('http://' + adbService.deviceIp + ':50000/host/beatsaber/config/restore?configtype=committed', '')
            .toPromise()
            .then(() => this.http.post('http://' + adbService.deviceIp + ':50000/host/beatsaber/commitconfig', '').toPromise());
    }
    checkIsBeatOnRunning(adbService) {
        return adbService
            .adbCommand('shell', {
                serial: adbService.deviceSerial,
                command: 'pidof com.weloveoculus.BMBF',
            })
            .then(res => {
                this.beatOnEnabled = !!res;
                this.beatOnPID = res;
            })
            .then(() => {
                if (this.beatOnEnabled && adbService.deviceIp) {
                    return this.beatOnRequest(adbService, 'mod/status').then((body: BeatOnStatus) => {
                        this.beatOnStatus = body;
                    });
                }
            })
            .catch(e => {
                console.log(e);
                // this.statusService.showStatus(
                //     'Your PC and quest should be on the same network! Try to Ping your Quest IP address. ' +
                //         (e.message ? e.message : e.code ? e.code : e.toString()),
                //     true
                // );
            });
    }
    async syncSongs(adbService) {
        this.spinnerService.setMessage('Restoring Backup...');
        this.spinnerService.showLoader();
        let packageBackupPath = this.appService.path.join(this.appService.appData, 'bsaber');
        if (this.appService.fs.existsSync(packageBackupPath)) {
            adbService.localFiles = [];
            await adbService
                .getLocalFoldersRecursive(packageBackupPath)
                .then(() => {
                    adbService.localFiles.forEach(file => {
                        file.savePath = this.appService.path.posix.join(
                            '/sdcard/BeatOnData/CustomSongs/',
                            file.name
                                .replace(packageBackupPath, '')
                                .split('\\')
                                .join('/')
                        );
                    });
                    return adbService.uploadFile(adbService.localFiles.filter(f => f.__isFile));
                })
                .then(() =>
                    this.http.post('http://' + adbService.deviceIp + ':50000/host/beatsaber/reloadsongfolders', '').toPromise()
                )
                .then(() => {
                    setTimeout(() => {
                        this.spinnerService.hideLoader();
                        this.statusService.showStatus('Songs synced OK!');
                    }, 5000);
                });
        }
    }

    setBeatOnPermission(adbService) {
        return adbService
            .adbCommand('shell', {
                serial: adbService.deviceSerial,
                command: 'pm grant com.weloveoculus.BMBF android.permission.READ_EXTERNAL_STORAGE',
            })
            .then(() =>
                adbService.adbCommand('shell', {
                    serial: adbService.deviceSerial,
                    command: 'pm grant com.weloveoculus.BMBF android.permission.WRITE_EXTERNAL_STORAGE',
                })
            );
    }
    setupBeatOnSocket(adbService) {
        if (!adbService.deviceIp) {
            console.log("Can't connect, no wifi IP.");
            return;
        }
        if (this.websocket != null && this.websocket.readyState === WebSocket.OPEN) {
            console.log('HostMessageService.openSocket called, but the connection is already open.');
            return;
        }
        if (this.websocket != null) this.websocket.close();

        this.websocket = new WebSocket('ws://' + adbService.deviceIp + ':50001');
        this.websocket.onopen = (ev: Event) => {
            console.log('Connection opened');
        };
        //
        this.websocket.onmessage = (ev: MessageEvent) => {
            const reader = new FileReader();
            reader.onload = () => {
                let msgStr = <string>reader.result;
                let msgEvent: HostSetupEvent = JSON.parse(msgStr);
                if (msgEvent.Message) {
                    this.spinnerService.setMessage(msgEvent.Message);
                } else {
                    // console.log(`Unknown host message: ${msgStr}`);
                }
            };
            reader.readAsText(ev.data);
        };
        //
        this.websocket.onclose = (ev: Event) => {
            console.log('Connection was closed, reconnecting in several seconds...');
        };
        //
        this.websocket.onerror = (ev: Event) => {
            console.log('WEBSOCKET ERROR OH NOOOOO!');
        };
    }

    downloadSong(downloadUrl, adbService) {
        return this.processService.addItem('song_download', async task => {
            let parts = downloadUrl.split('/');
            let zipPath = this.appService.path.join(this.appService.appData, this.appService.uuidv4() + '.zip');
            const requestOptions = {
                timeout: 30000,
                'User-Agent': this.appService.getUserAgent(),
            };
            task.status = 'Saving to BMBF...';
            return new Promise((resolve, reject) => {
                if (
                    adbService.deviceIp &&
                    this.beatOnEnabled &&
                    this.beatOnPID &&
                    this.beatOnStatus.CurrentStatus === 'ModInstalled'
                ) {
                    this.appService
                        .progress(this.appService.request(downloadUrl, requestOptions), { throttle: 50 })
                        .on('error', error => {
                            task.failed = true;
                            task.status = 'Failed to save song... ' + error.toString();
                            reject(error);
                        })
                        .on('progress', state => {
                            task.status = 'Saving to BMBF... ' + Math.round(state.percent * 100) + '%';
                        })
                        .on('end', () => {
                            let formData = {
                                file: {
                                    value: this.appService.fs.createReadStream(zipPath),
                                    options: {
                                        filename: parts[parts.length - 1],
                                        contentType: 'application/zip',
                                    },
                                },
                            };
                            let options = {
                                url: 'http://' + adbService.deviceIp + ':50000/host/beatsaber/upload',
                                method: 'POST',
                                formData: formData,
                            };
                            let timeoutCheck = setTimeout(() => {
                                if (task.fail_once) {
                                    task.fail_once = false;
                                    task.failed = true;
                                    task.status = 'Failed to save song... Timeout';
                                    reject(task.status);
                                } else {
                                    task.fail_once = true;
                                    task.running = false;
                                    task.status = 'Waiting...';
                                    resolve();
                                }
                            }, 30000);
                            this.appService
                                .progress(this.appService.request(options), { throttle: 50 })
                                .on('error', error => {
                                    clearTimeout(timeoutCheck);
                                    task.failed = true;
                                    task.status = 'Failed to save song... ' + error.toString();
                                    reject(error);
                                })
                                .on('progress', state => {
                                    clearTimeout(timeoutCheck);
                                    task.status = 'Uploading To Beat On... ' + Math.round(state.percent * 100) + '%';
                                })
                                .on('end', () => {
                                    clearTimeout(timeoutCheck);
                                    this.appService.fs.unlink(zipPath, err => {
                                        task.status = 'Saved! ' + downloadUrl;
                                        resolve(parts[parts.length - 1].split('.')[0]);
                                    });
                                });
                        })
                        .pipe(this.appService.fs.createWriteStream(zipPath));
                } else {
                    reject(
                        new Error(
                            'Cant reach the unicorns, this is most likely caused by a network issue. Please open BeatOn/BMBF inside the headset or from a browser at http://' +
                                adbService.deviceIp +
                                ':50000.'
                        )
                    );
                }
            });
        });
    }
}
