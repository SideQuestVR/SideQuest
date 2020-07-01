import { Component, OnInit, ViewChild } from '@angular/core';
import { AdbClientService, ConnectionStatus } from '../adb-client.service';
import { AppService, FolderType } from '../app.service';
import { WebviewService } from '../webview.service';
import { LoadingSpinnerService } from '../loading-spinner.service';
import { StatusBarService } from '../status-bar.service';
import { RepoService } from '../repo.service';
import { BeatOnService } from '../beat-on.service';
import { DragAndDropService } from '../drag-and-drop.service';
import { Router } from '@angular/router';
import { ProcessBucketService } from '../process-bucket.service';
import { Subscription } from 'rxjs/Subscription';
interface ReplaceText {
    key: string;
    value: string;
}
declare const process;
interface FavouriteItem {
    name: string;
    uri: string;
    icon?: string;
}
interface LogCatEntry {
    date: string;
    message: string;
    pid: number;
    tid: number;
    tag: string;
    priority: number;
}
@Component({
    selector: 'app-header',
    templateUrl: './header.component.html',
    styleUrls: ['./header.component.css'],
})
export class HeaderComponent implements OnInit {
    @ViewChild('header', { static: false }) header;
    @ViewChild('bookmarksModal', { static: false }) bookmarksModal;
    @ViewChild('beatOnModal', { static: false }) beatOnModal;
    @ViewChild('mainLogo', { static: false }) mainLogo;
    @ViewChild('safeModal', { static: false }) safeModal;
    folder = FolderType;
    isAlive = true;
    replaceText: ReplaceText[] = [];
    adbCommandToRun: string;
    osPlatform: string;
    saveLogcatPath: string;
    favourites: {
        browserFavourites: FavouriteItem[];
        fileFavourites: FavouriteItem[];
        commandFavourites: FavouriteItem[];
    } = {
        browserFavourites: [],
        fileFavourites: [],
        commandFavourites: [],
    };
    favoriteName: string;
    favoriteUri: string;
    favoriteIcon: string;
    favoriteType = 'fileFavourites';
    favoritePathType = 'Path';
    favouriteImportExport: boolean;
    favouriteMax: number;
    scrcpy_options: any = {
        always_on_top: false,
        bit_rate: '8000000',
        crop: '1280:720:1500:350',
        no_control: true,
        fullscreen: false,
        max_size: '0',
        max_fps: '0',
    };
    // BAG = 'FAVS';
    subs = new Subscription();
    logcatTag: string = '';
    logcatSearch: string = '';
    logcatPriority: string = 'debug';
    priorities = {
        0: 'unknown',
        1: 'default',
        2: 'verbose',
        3: 'debug',
        4: 'info',
        5: 'warn',
        6: 'error',
        7: 'fatal',
        8: 'silent',
    };
    currentLogCat: LogCatEntry[] = [];
    isStarted: boolean;
    showAddFavourite: boolean;
    constructor(
        public adbService: AdbClientService,
        public appService: AppService,
        public webService: WebviewService,
        public spinnerService: LoadingSpinnerService,
        public statusService: StatusBarService,
        public beatonService: BeatOnService,
        public dragAndDropService: DragAndDropService,
        public processService: ProcessBucketService
    ) {
        this.osPlatform = this.appService.os.platform();
        this.resetFavourites('browserFavourites');
        this.resetFavourites('fileFavourites');
        this.resetFavourites('commandFavourites');
        this.appService.headerComponent = this;
    }
    resetFavourites(type: string) {
        let defaultFavs;
        switch (type) {
            case 'commandFavourites':
                defaultFavs = `[
            {"name":"List Devices", "uri": "adb devices", "icon": ""},
            {"name":"Enable USB ADB", "uri": "adb usb", "icon": ""},
            {"name":"Disconnect Everything", "uri": "adb disconnect", "icon": ""},
            {"name":"Reset ADB", "uri": "adb kill-server", "icon": ""},
            {"name":"Reboot Headset", "uri": "adb reboot", "icon": ""}
          ]`;
                break;
            case 'browserFavourites':
                defaultFavs = '[]';
                break;
            case 'fileFavourites':
                defaultFavs = `[
            {"name":"SynthRiders", "uri": "/sdcard/Android/data/com.kluge.SynthRiders/files/CustomSongs/", "icon": "https://i.imgur.com/LjK7Z3o.png"},
            {"name":"Song Beater", "uri": "/sdcard/Android/data/com.playito.songbeater/CustomSongs/", "icon": "https://i.imgur.com/dOx0OEl.png"},
            {"name":"VRtuos", "uri": "/sdcard/Android/data/com.PavelMarceluch.VRtuos/files/Midis/", "icon": "https://i.imgur.com/7G0OpJi.png"},
            {"name":"Audica", "uri": "/sdcard/Audica/", "icon": "https://i.imgur.com/40sUjye.png"},
            {"name":"OhShape", "uri": "/sdcard/OhShape/Songs/", "icon": "https://i.imgur.com/yIu0sSQ.png"},
            {"name":"Oculus", "uri": "/sdcard/Oculus/", "icon": "https://i.imgur.com/LORDvYK.png"}
          ]`;
        }
        this.favourites[type] = localStorage.getItem(type) || defaultFavs;
        this.favourites[type] = JSON.parse(this.favourites[type]);
    }

    removeFromFavourites(type: string, index: number) {
        this.favourites[type] = this.favourites[type].filter((f, i) => i !== index);
    }

    addToFavorites(type: string, name: string, uri: string, icon: string) {
        const favourite = { name, uri, icon };
        const favouriteList = this.favourites[type];
        if (favouriteList) {
            favouriteList.push(favourite);
        }
    }

    saveFavourites(type: string) {
        localStorage.setItem(type, JSON.stringify(this.favourites[type]));
    }

    ngOnInit() {}
    runAdbCommand() {
        return this.adbService.runAdbCommand(this.adbCommandToRun).catch(e => {
            this.statusService.showStatus(e, true);
        });
    }
    connectWifi() {
        this.adbCommandToRun = 'adb tcpip 5555';
        this.adbService.deviceStatusMessage = 'Attempting wifi connection...';
        (this.isConnected() ? this.runAdbCommand() : Promise.resolve()).then(() => {
            setTimeout(() => {
                this.adbCommandToRun = 'adb connect ' + this.adbService.deviceIp + ':5555';
                this.runAdbCommand();
            }, 5000);
        });
    }
    isConnected() {
        return this.adbService.deviceStatus === ConnectionStatus.CONNECTED;
    }

    updateAvailable() {
        // if (process.platform == 'win32') {
        // this.spinnerService.setMessage('Downloading update...');
        //     this.spinnerService.showLoader();
        //     this.appService.electron.ipcRenderer.send('automatic-update', {});
        // } else {
        this.appService.opn('https://sidequestvr.com/download');
        //  }
    }

    startLogcat() {
        this.currentLogCat.length = 0;
        this.adbService.adbCommand(
            'logcat',
            { serial: this.adbService.deviceSerial, tag: '*', priority: this.logcatPriority },
            stats => {
                stats.message = stats.message
                    .split('\n')
                    .join('<br>')
                    .split('\t')
                    .join('&nbsp;&nbsp;');
                if (this.logcatSearch) {
                    if (!!~stats.message.indexOf(this.logcatSearch) || !!~stats.tag.indexOf(this.logcatSearch)) {
                        this.currentLogCat.unshift(stats);
                        this.attemptToSaveLogcat(stats);
                    }
                } else {
                    this.currentLogCat.unshift(stats);
                    this.attemptToSaveLogcat(stats);
                }
                if (this.currentLogCat.length > 4000) {
                    this.currentLogCat.length = 4000;
                }
            }
        );
    }
    cancelLogcatOutput() {
        this.saveLogcatPath = null;
    }
    selectLogcatOutput() {
        this.appService.electron.remote.dialog.showOpenDialog(
            {
                properties: ['openDirectory'],
                defaultPath: this.adbService.savePath,
            },
            files => {
                files.forEach(filepath => {
                    this.saveLogcatPath = filepath;
                });
            }
        );
    }
    clearLogcatFile() {
        if (this.saveLogcatPath) {
            if (this.appService.fs.existsSync(this.saveLogcatPath)) {
                this.appService.fs.writeFile(this.appService.path.join(this.saveLogcatPath, 'logcat.log'), '', () => {});
            }
        }
    }
    attemptToSaveLogcat(logcat) {
        if (this.saveLogcatPath) {
            if (this.appService.fs.existsSync(this.saveLogcatPath)) {
                this.appService.fs.appendFile(
                    this.appService.path.join(this.saveLogcatPath, 'logcat.log'),
                    logcat.date +
                        ':' +
                        this.priorities[logcat.priority] +
                        logcat.tid +
                        '/' +
                        logcat.pid +
                        ' ' +
                        logcat.tag +
                        '\n' +
                        logcat.message +
                        '\n',
                    () => {}
                );
            }
        }
    }

    stopLogcat() {
        this.adbService.adbCommand('endLogcat');
    }

    runscrcpy() {
        this.appService
            .runScrCpy(this.scrcpy_options)
            .then(() => this.statusService.showStatus('Stream closed.'))
            .catch(e => this.statusService.showStatus('ScrCpy Error: ' + JSON.stringify(e), true));
    }

    gogo(e) {
        if (e.keyCode === 13) {
            this.webService.loadUrl(this.webService.currentAddress);
            this.bookmarksModal.closeModal();
        }
    }
    addCurrentFavourite() {
        this.appService.request(
            'https://i.olsh.me/allicons.json?url=' + this.webService.currentAddress,
            (error, response, body) => {
                let json: any = {};
                try {
                    json = JSON.parse(response.body);
                } catch (e) {}
                this.favourites.browserFavourites.unshift({
                    name: this.webService.getTitle(),
                    uri: this.webService.currentAddress,
                    icon: json && json.icons && json.icons.length ? json.icons[0].url : '',
                });
                this.saveFavourites('browserFavourites');
            }
        );
    }
    closeApp() {
        this.appService.remote.getCurrentWindow().close();
    }
    pingHeadset() {
        this.isAlive = true;
    }
    minimizeApp() {
        this.appService.remote.getCurrentWindow().minimize();
    }
    maximizeApp() {
        const win = this.appService.remote.getCurrentWindow();
        if (win.isMaximized()) {
            win.unmaximize();
        } else {
            win.maximize();
        }
    }
    openDebugger() {
        this.appService.remote.getCurrentWindow().toggleDevTools();
    }
    selectAppToInstall() {
        this.appService.electron.remote.dialog.showOpenDialog(
            {
                properties: ['openFile', 'multiSelections'],
                defaultPath: this.adbService.savePath,
            },
            files => {
                files.forEach(filepath => {
                    this.adbService.savePath = this.appService.path.dirname(filepath);
                    let install = this.adbService.installMultiFile(filepath);
                    if (install) {
                        install.catch(e => {
                            this.statusService.showStatus(e.toString(), true);
                        });
                    }
                });
            }
        );
    }
    confirmRestore() {
        this.spinnerService.showLoader();
        this.spinnerService.setMessage('Restoring BMBF<br>Please Wait...');
        this.beatonService.confirmRestore(this.adbService).then(r => {
            this.spinnerService.hideLoader();
            this.statusService.showStatus('BMBF Restored Successfully!!');
            this.beatOnModal.openModal();
            this.beatonService.checkHasRestore(this.adbService);
        });
    }
    installAPK(name: string) {
        return this.adbService.installAPK(this.appService.path.join(this.appService.appData, name), true, true);
    }
    removeText(text) {
        this.replaceText = this.replaceText.filter(d => d !== text);
    }
}
