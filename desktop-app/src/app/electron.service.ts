import { Injectable, isDevMode } from '@angular/core';
import { AppService } from './app.service';
import { RepoService } from './repo.service';
import { StatusBarService } from './status-bar.service';
import { LoadingSpinnerService } from './loading-spinner.service';
import { AdbClientService } from './adb-client.service';
import { WebviewService } from './webview.service';
import { Router } from '@angular/router';
import { BeatOnService } from './beat-on.service';
import { SynthriderService } from './synthrider.service';
import { SongBeaterService } from './song-beater.service';
import { AudicaService } from './audica.service';

@Injectable({
    providedIn: 'root',
})
export class ElectronService {
    isInstalledLauncher: boolean;
    isInstallingLauncher: boolean;
    constructor(
        private appService: AppService,
        private repoService: RepoService,
        private statusService: StatusBarService,
        private spinnerService: LoadingSpinnerService,
        private adbService: AdbClientService,
        private webviewService: WebviewService,
        private beatonService: BeatOnService,
        private router: Router,
        private synthriderService: SynthriderService,
        private songbeaterService: SongBeaterService,
        private audicaService: AudicaService
    ) {
        this.setupIPC();
    }
    async installFirefoxMultiple(urls) {
        for (let i = 0; i < urls.length; i++) {
            await this.adbService.installFile(
                urls[i],
                '/sdcard/Android/data/org.mozilla.vrbrowser/files/skybox/',
                i + 1,
                urls.length
            );
        }
    }
    async installSynthridersMultiple(urls) {
        for (let i = 0; i < urls.length; i++) {
            await this.synthriderService.downloadSong(urls[i], this.adbService);
        }
    }
    async installMultiple(urls) {
        for (let i = 0; i < urls.length; i++) {
            const etx = urls[i]
                .split('?')[0]
                .split('.')
                .pop()
                .toLowerCase();
            switch (etx) {
                case 'obb':
                    await this.adbService.installObb(urls[i], i + 1, urls.length);
                    break;
                default:
                    await this.adbService.installAPK(urls[i], false, false, i + 1, urls.length);
                    break;
            }
        }
    }

    installFromToken(token) {
        let options = {
            url: 'https://api.sidequestvr.com/install-from-key',
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                Origin: 'https://sidequestvr.com',
            },
            rejectUnauthorized: !isDevMode(),
            json: { token: token },
        };
        // console.log(options);
        this.appService.request(options, async (error, response, body) => {
            // console.log(error, body);
            if (!error && body.data && body.data.apps && body.data.apps.length) {
                for (let i = 0; i < body.data.apps.length; i++) {
                    let app = body.data.apps[i];
                    if (Number(app.app_categories_id) === 1) {
                        let urls = app.urls.filter(l => l && ~['Github Release', 'APK', 'OBB', 'Mod'].indexOf(l.provider));
                        for (let i = 0; i < urls.length; i++) {
                            if (urls[i].provider === 'Mod') {
                                this.beatonService.downloadSong(urls[i].link_url, this.adbService);
                            } else {
                                const etx = urls[i].link_url
                                    .split('?')[0]
                                    .split('.')
                                    .pop()
                                    .toLowerCase();
                                switch (etx) {
                                    case 'obb':
                                        await this.adbService.installObb(urls[i].link_url, i + 1, urls.length, app.name);
                                        break;
                                    default:
                                        await this.adbService.installAPK(
                                            urls[i].link_url,
                                            false,
                                            false,
                                            i + 1,
                                            urls.length,
                                            false,
                                            app.name
                                        );
                                        break;
                                }
                            }
                        }
                    }
                }
            }
        });
    }

    setupIPC() {
        this.appService.electron.ipcRenderer.on('pre-open-url', (event, data) => {
            this.spinnerService.showLoader();
            this.spinnerService.setMessage('Do you want to install this file?<br><br>' + data.name);
            this.spinnerService.setupConfirm().then(() => {
                switch (this.appService.path.extname(data.name)) {
                    case '.zip':
                        this.adbService.installZip(data.url, 0, 0, true);
                        break;
                    case '.obb':
                        this.adbService.installObb(data.url);
                        break;
                    case '.apk':
                        this.adbService.installAPK(data.url);
                        break;
                }
            });
        });
        this.appService.electron.ipcRenderer.on('update-status', (event, data) => {
            if (data.status === 'checking-for-update') {
                this.statusService.showStatus('Checking for an update...');
            } else if (data.status === 'update-available') {
                this.statusService.showStatus(
                    'Update Available to version ' +
                        data.info.version +
                        '. Click Update Available at the top to get the latest version.'
                );
                this.appService.updateAvailable = true;
            } else if (data.status === 'no-update') {
                this.statusService.showStatus('You are on the most recent version of SideQuest.');
                this.appService.updateAvailable = false;
            } else if (data.status === 'error') {
                this.statusService.showStatus('Error checking for update.', true);
            } else if (data.status === 'downloading') {
                console.log(data.status);
            } else if (data.status === 'update-downloaded') {
                console.log(data.status);
            }
        });
        this.appService.electron.ipcRenderer.on('open-url', async (event, data) => {
            if (data) {
                let url = data.split('#');
                switch (url[0]) {
                    case 'sidequest://w/':
                        this.adbService.runAdbCommand('adb shell am start -a android.intent.action.VIEW -d ' + url[1]).then(() => {
                            this.statusService.showStatus('Launching WebXR in browser...');
                        });
                        this.webviewService.isWebviewLoading = false;
                        break;
                    case 'sidequest://i/':
                        this.installFromToken(url[1]);
                        break;
                    case 'sidequest://unload/':
                        this.adbService.uninstallAPK(url[1]);
                        break;
                    case 'sidequest://sideload-multi/':
                        try {
                            let urls = JSON.parse(
                                data
                                    .replace('sidequest://sideload-multi/#', '')
                                    .split('%22,%22')
                                    .join('","')
                                    .split('[%22')
                                    .join('["')
                                    .split('%22]')
                                    .join('"]')
                            );
                            this.installMultiple(urls);
                            this.statusService.showStatus('Installing app... See the tasks screen for more info.');
                        } catch (e) {
                            this.statusService.showStatus('Could not parse install url: ' + data, true);
                        }
                        this.webviewService.isWebviewLoading = false;
                        break;
                    case 'sidequest://sideload/':
                        this.adbService.installAPK(url[1]);
                        break;
                    case 'sidequest://launcher/':
                        if (!this.isLauncherInstalled()) {
                            this.installLauncher();
                        } else {
                            this.statusService.showStatus('Launcher already installed!');
                        }
                        break;
                    case 'sidequest://songbeater/':
                        this.statusService.showStatus('SongBeater download started... See the tasks screen for more info.');
                        this.songbeaterService.downloadSong(url[1], this.adbService);
                        break;
                    case 'sidequest://audica/':
                        this.statusService.showStatus('Audica download started... See the tasks screen for more info.');
                        this.audicaService.downloadSong(url[1], this.adbService);
                        break;
                    case 'sidequest://synthriders/':
                        this.statusService.showStatus('SynthRiders download started... See the tasks screen for more info.');
                        this.synthriderService.downloadSong(url[1], this.adbService);
                        break;
                    case 'sidequest://synthriders-multi/':
                        this.statusService.showStatus('SynthRiders download started... See the tasks screen for more info.');
                        try {
                            let urls = JSON.parse(
                                data
                                    .replace('sidequest://synthriders-multi/#', '')
                                    .split('%22,%22')
                                    .join('","')
                                    .split('[%22')
                                    .join('["')
                                    .split('%22]')
                                    .join('"]')
                            );
                            this.installSynthridersMultiple(urls);
                        } catch (e) {
                            this.statusService.showStatus('Could not parse install url: ' + data, true);
                        }
                        this.webviewService.isWebviewLoading = false;
                        break;
                    case 'sidequest://bsaber/':
                        this.statusService.showStatus('Song download started... See the tasks screen for more info.');
                        if (~this.adbService.devicePackages.indexOf('com.playito.songbeater')) {
                            this.spinnerService.showLoader();
                            this.spinnerService.setMessage('Send this to Song Beater instead of BMBF?<br><br>' + data);
                            this.spinnerService
                                .setupConfirm()
                                .then(() => {
                                    this.songbeaterService.downloadSong(url[1], this.adbService);
                                })
                                .catch(() => {
                                    this.beatonService.downloadSong(url[1], this.adbService);
                                });
                        } else {
                            this.beatonService.downloadSong(url[1], this.adbService);
                        }
                        this.webviewService.isWebviewLoading = false;
                        break;
                    case 'sidequest://firefox-skybox/':
                        this.statusService.showStatus(
                            'Firefox Reality Skybox download started... See the tasks screen for more info.'
                        );
                        try {
                            let urls = JSON.parse(
                                data
                                    .replace('sidequest://firefox-skybox/#', '')
                                    .split('%22,%22')
                                    .join('","')
                                    .split('[%22')
                                    .join('["')
                                    .split('%22]')
                                    .join('"]')
                            );
                            this.installFirefoxMultiple(urls);
                        } catch (e) {
                            this.statusService.showStatus('Could not parse install url: ' + data, true);
                        }
                        this.webviewService.isWebviewLoading = false;
                        break;
                    case 'sidequest://bsaber-multi/':
                        try {
                            let urls = JSON.parse(
                                data
                                    .replace('sidequest://bsaber-multi/#', '')
                                    .split('%22,%22')
                                    .join('","')
                                    .split('[%22')
                                    .join('["')
                                    .split('%22]')
                                    .join('"]')
                            );
                            (async () => {
                                this.spinnerService.showLoader();
                                this.spinnerService.setMessage('Saving to BMBF...');
                                for (let i = 0; i < urls.length; i++) {
                                    await this.beatonService.downloadSong(urls[i], this.adbService);
                                }
                                this.statusService.showStatus('Item Downloaded Ok!!');
                                this.spinnerService.hideLoader();
                            })();
                        } catch (e) {
                            this.statusService.showStatus('Could not parse install url: ' + data, true);
                        }
                        this.webviewService.isWebviewLoading = false;
                        break;
                    default:
                        this.statusService.showStatus('Custom protocol not recognised: ' + (data || ''), true);
                        break;
                }
            }
        });
    }

    isLauncherInstalled() {
        this.isInstalledLauncher =
            !!~this.adbService.devicePackages.indexOf('com.sidequest.wrapper2') &&
            !!~this.adbService.devicePackages.indexOf('com.sidequest.wrapper') &&
            !!~this.adbService.devicePackages.indexOf('com.sidequest.launcher');
        return this.isInstalledLauncher;
    }
    installLauncher() {
        this.isInstallingLauncher = true;
        this.adbService.installAPK('https://cdn.theexpanse.app/SideQuestWrapper.apk');
        this.adbService.installAPK('https://cdn.theexpanse.app/SideQuestWrapper2.apk');
        this.adbService.installAPK('https://cdn.theexpanse.app/SideQuestLauncher.apk');
        this.isInstallingLauncher = false;
        this.isInstalledLauncher = true;
    }
}
