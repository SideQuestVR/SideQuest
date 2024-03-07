import { Component, OnInit, ViewChild } from '@angular/core';
import { AdbClientService, ConnectionStatus } from '../adb-client.service';
import { AppService, FolderType } from '../app.service';
import { WebviewService } from '../webview.service';
import { LoadingSpinnerService } from '../loading-spinner.service';
import { StatusBarService } from '../status-bar.service';
import { BeatOnService } from '../beat-on.service';
import { DragAndDropService } from '../drag-and-drop.service';
import { Router } from '@angular/router';
import { ProcessBucketService } from '../process-bucket.service';
import { Subscription } from 'rxjs';
import { environment } from '../../environments/environment';

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
    styleUrls: ['./header.component.scss'],
})
export class HeaderComponent implements OnInit {
    @ViewChild('header') header;
    @ViewChild('bookmarksModal') bookmarksModal;
    @ViewChild('beatOnModal') beatOnModal;
    @ViewChild('mainLogo') mainLogo;
    @ViewChild('safeModal') safeModal;
    @ViewChild('manageFavs') manageFavs;
    ConnectionStatus = ConnectionStatus;
    folder = FolderType;
    isAlive = true;
    replaceText: ReplaceText[] = [];
    adbCommandToRun: string;
    osPlatform: string;
    saveLogcatPath: string;
    webUrl = environment.configuration.web_url;
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
        public processService: ProcessBucketService,
        private router: Router
    ) {
        this.osPlatform = this.appService.os.platform();
        console.log('Platform: ' + this.osPlatform);
        this.resetFavourites('browserFavourites');
        this.resetFavourites('fileFavourites');
        this.resetFavourites('commandFavourites');
        this.appService.headerComponent = this;
    }
    doBack() {
        if (
            this.appService.isTasksOpen ||
            this.appService.isFilesOpen ||
            this.appService.isPackagesOpen ||
            this.appService.isSettingsOpen
        ) {
            this.router.navigateByUrl('/webview');
            return;
        } else {
            this.webService.back();
        }
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
            {"name":"SynthRiders", "uri": "/sdcard/SynthRidersUC/", "icon": "https://i.imgur.com/cmH6q6D.png"},
            {"name":"Song Beater", "uri": "/sdcard/Android/data/com.Playito.SongBeater/CustomSongs/", "icon": "https://i.imgur.com/dOx0OEl.png"},
            {"name":"VRtuos", "uri": "/sdcard/Android/data/com.PavelMarceluch.VRtuos/files/Midis/", "icon": "https://i.imgur.com/7G0OpJi.png"},
            {"name":"Audica", "uri": "/sdcard/Audica/", "icon": "https://i.imgur.com/40sUjye.png"},
            {"name":"Audio Trip", "uri": "/sdcard/Android/data/com.KinemotikStudios.AudioTripQuest/files/Songs/", "icon": "https://i.imgur.com/5EgzxTl.png"},
            {"name":"OhShape", "uri": "/sdcard/OhShape/Songs/", "icon": "https://i.imgur.com/yIu0sSQ.png"},
            {"name":"Battle Talent", "uri": "/sdcard/Android/data/com.CyDream.BattleTalent/files/Mods/", "icon": "https://i.imgur.com/MFdfn9J.png"},
            {"name":"Blade and Sorcery", "uri": "/sdcard/Android/data/com.Warpfrog.BladeAndSorcery/files/Mods/", "icon": "https://i.imgur.com/lxK5bny.png"},
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
    async setLocalIcon(fav: FavouriteItem) {
        const res = await this.appService.remote.dialog.showOpenDialog({
            filters: [{ name: 'Pictures', extensions: ['png', 'jpg', 'jpeg'] }],
            properties: ['openFile'],
            defaultPath: this.appService.backupPath,
        });
        if (res && res.filePaths && res.filePaths.length === 1) {
            fav.icon = res.filePaths[0];
        }
    }
    ngOnInit() {}
    runAdbCommand() {
        return this.adbService.runAdbCommand(this.adbCommandToRun).catch(e => {
            this.statusService.showStatus(e, true);
        });
    }
    isConnected() {
        return this.adbService.deviceStatus === ConnectionStatus.CONNECTED;
    }

    updateAvailable() {
        this.appService.opn(`${environment.configuration.web_url || 'https://sidequestvr.com'}/download`);
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
    async selectLogcatOutput() {
        const res = await this.appService.remote.dialog.showOpenDialog({
            properties: ['openDirectory'],
            defaultPath: this.adbService.savePath,
        });
        res.filePaths.forEach(filepath => {
            this.saveLogcatPath = filepath;
        });
    }
    clearLogcatFile() {
        if (this.saveLogcatPath) {
            if (this.appService.fs.existsSync(this.saveLogcatPath)) {
                this.appService.fs.writeFile(this.appService.path.join(this.saveLogcatPath, 'logcat.log'), '', () => {});
                this.statusService.showStatus('Cleared log file');
            } else {
                this.statusService.showStatus('Log file does not exist', true);
            }
        } else {
            this.statusService.showStatus('NO log file selected', true);
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
    async selectAppToInstall() {
        let files = await this.appService.remote.dialog.showOpenDialog({
            properties: ['openFile', 'multiSelections'],
            defaultPath: this.adbService.savePath,
        });
        files.filePaths.forEach(filepath => {
            this.adbService.savePath = this.appService.path.dirname(filepath);
            let install = this.adbService.installMultiFile(filepath);
            if (install) {
                install.catch(e => {
                    this.statusService.showStatus(e.toString(), true);
                });
            }
        });
    }
}
