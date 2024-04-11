import { Injectable } from '@angular/core';
import { LoadingSpinnerService } from './loading-spinner.service';
import { WebviewService } from './webview.service';
import { FilesComponent } from './files/files.component';
import { HeaderComponent } from './header/header.component';
import { Router } from '@angular/router';
declare let __dirname, process;
export enum FolderType {
    MAIN,
    ADB,
    BSABER,
    BSABER_BACKUPS,
    APK_BACKUPS,
    DATA_BACKUPS,
    QUEST_SABER_PATCH,
    APP_BACKUP,
    SONG_FOLDER,
}

@Injectable({
    providedIn: 'root',
})
export class AppService {
    showSearch: boolean;
    showBrowserBar: boolean;
    showCustomActions: boolean;
    showTaskActions: boolean;
    updateAvailable: boolean;
    showRepo: boolean;
    // isSetupOpen: boolean;
    // isFilesOpen: boolean;
    // isPackagesOpen: boolean;
    // isSettingsOpen: boolean;
    // isTasksOpen: boolean;
    hideNSFW: boolean;
    filesComponent: FilesComponent;
    appData: string;
    apkPath: string;
    fs: any;
    path: any;
    nativeApp: any;
    remote: any;
    electron: any;
    os: any;
    Readable: any;
    opn: any;
    spawn: any;
    md5: any;
    semver: any;
    exec: any;
    execSync: any;
    uuidv4: any;
    ping: any;
    crypto: any;
    titleEle: HTMLElement;
    webService: WebviewService;
    currentTheme: string = 'dark';
    versionName: string;
    showBack: boolean = false;
    backupPath: string;
    scrcpyBinaryPath: string;
    downloadResolves: any = {};
    extractResolves: any = {};
    headerComponent: HeaderComponent;
    constructor(private spinnerService: LoadingSpinnerService, private router: Router) {
        this.path = (<any>window).require('path');
        this.fs = (<any>window).require('fs');
        this.os = (<any>window).require('os');
        this.Readable = (<any>window).require('stream').Readable;
        this.opn = (<any>window).require('opn');
        this.md5 = (<any>window).require('md5');
        this.spawn = (<any>window).require('child_process').spawn;
        this.semver = (<any>window).require('semver');
        this.crypto = (<any>window).require('crypto');
        this.electron = (<any>window).require('electron');
        this.remote = (<any>window).require('@electron/remote');
        this.nativeApp = this.remote.app;
        this.appData = this.path.join(this.nativeApp.getPath('appData'), 'SideQuest');

        this.apkPath = this.path.join(this.appData, 'experimental.apk');
        this.exec = (<any>window).require('child_process').exec;
        this.execSync = (<any>window).require('child_process').execSync;
        this.uuidv4 = (<any>window).require('uuid/v4');
        this.ping = (<any>window).require('ping');
        this.makeFolders();
        let theme = localStorage.getItem('theme');
        if (theme && theme === 'light') {
            this.currentTheme = 'light';
        }
        this.hideNSFW = !!localStorage.getItem('hideNSFW');
        this.backupPath = localStorage.getItem('backup-path');
        if (!this.backupPath) {
            this.backupPath = this.path.join(this.appData, 'backups');
            localStorage.setItem('backup-path', this.backupPath);
        }
        this.versionName = 'v' + this.remote.app.getVersion();
        this.electron.ipcRenderer.on('extract-file', (event, data) => {
            console.log('download-url-progress');
            if (!!this.extractResolves[data.token]) {
                this.extractResolves[data.token].resolve();
                delete this.extractResolves[data.token];
            }
        });
        this.electron.ipcRenderer.on('extract-progress', (event, data) => {
            console.log('download-url-progress');
            if (!!this.extractResolves[data.token]) {
                this.extractResolves[data.token].scb(data.stats);
            }
        });
        this.electron.ipcRenderer.on('download-url-fail', (event, data) => {
            console.log('download-url-progress');
            if (!!this.downloadResolves[data.token]) {
                this.downloadResolves[data.token].reject(data.e);
                delete this.downloadResolves[data.token];
            }
        });
        this.electron.ipcRenderer.on('download-url', (event, data) => {
            console.log('download-url-progress');
            if (!!this.downloadResolves[data.token]) {
                this.downloadResolves[data.token].resolve();
                delete this.downloadResolves[data.token];
            }
        });
        this.electron.ipcRenderer.on('download-progress', (event, data) => {
            if (!!this.downloadResolves[data.token]) {
                this.downloadResolves[data.token].scb(data.stats);
            }
        });
    }

    isPageOpen(page: string) {
        return this.router.url.includes(page);
    }

    get pageTitle() {
        if (this.isSettingsOpen) {
            return 'Headset Settings';
        } else if (this.isFilesOpen) {
            return 'File Manager';
        } else if (this.isPackagesOpen) {
            return 'App Manager';
        } else if (this.isTasksOpen) {
            return 'Task Manager';
        } else if (this.isSetupOpen) {
            return 'Setup & Support';
        } else if (this.isWirelessOpen) {
            return 'Wireless Connection';
        } else if (this.isStreamingOpen) {
            return 'Streaming Options';
        }
    }
    get isSetupOpen() {
        return this.isPageOpen('/setup');
    }
    get isFilesOpen() {
        return this.isPageOpen('/device-files');
    }
    get isPackagesOpen() {
        return this.isPageOpen('/packages');
    }
    get isSettingsOpen() {
        return this.isPageOpen('/tools');
    }
    get isTasksOpen() {
        return this.isPageOpen('/tasks');
    }
    get isWirelessOpen() {
        return this.isPageOpen('/wireless');
    }
    get isStreamingOpen() {
        return this.isPageOpen('/streaming');
    }

    extract(path, options, callback, task?) {
        return this.extractFileAPI(options.dir, path, task).then(callback);
    }
    extractFileAPI(directory, filename, task?) {
        return new Promise(resolve => {
            let token = this.uuidv4();
            this.extractResolves[token] = {
                scb: stats => {
                    if (task) {
                        task.status = (task.app_name ? task.app_name + ': ' : '') + 'Extracting... ' + stats;
                    }
                },
                resolve,
            };
            this.electron.ipcRenderer.send('extract-file', { token, directory, filename });
        });
    }
    getBase64Image(imagePath: string) {
        try {
            return (
                'data:image/' + (<any>imagePath).split('.').pop() + ';base64,' + this.fs.readFileSync(imagePath).toString('base64')
            );
        } catch (e) {
            return null;
        }
    }
    resetTop() {
        this.showBrowserBar = false;
        this.showCustomActions = false;
        this.showTaskActions = false;
        this.showRepo = false;
    }
    doesFileExist(path) {
        try {
            return this.fs.existsSync(path);
        } catch (err) {
            return false;
        }
    }
    setWebviewService(webService: WebviewService) {
        this.webService = webService;
    }
    setTitleEle(ele: HTMLElement) {
        this.titleEle = ele;
    }
    setTitle(title: string) {
        if (this.titleEle) {
            this.titleEle.innerHTML = title;
        }
    }
    isTheme(theme: string) {
        return this.currentTheme === theme;
    }
    setTheme(theme: string) {
        this.currentTheme = theme;
        localStorage.setItem('theme', theme === 'dark' ? 'dark' : 'light');
    }
    getThemeCssClass(prefix: string, isButton?: boolean) {
        let classes = {};
        classes[prefix + '-dark-theme'] = this.isTheme('dark');
        classes[prefix + '-light-theme'] = this.isTheme('light');
        if (isButton || prefix === 'button') {
            classes['waves-dark'] = true;
            classes['waves-light'] = false;
        }
        return classes;
    }
    openFolder(folder: FolderType, packageName?: string) {
        switch (folder) {
            case FolderType.MAIN:
                this.electron.shell.openPath(this.appData);
                break;
            case FolderType.BSABER:
                this.electron.shell.openPath(this.path.join(this.appData, 'bsaber'));
                break;
            case FolderType.BSABER_BACKUPS:
                this.electron.shell.openPath(this.path.join(this.appData, 'bsaber-backups'));
                break;
            case FolderType.ADB:
                this.electron.shell.openPath(this.path.join(this.appData, 'platform-tools'));
                break;
            case FolderType.APK_BACKUPS:
                this.electron.shell.openPath(this.path.join(this.appData, 'backups'));
                break;
            case FolderType.DATA_BACKUPS:
                this.electron.shell.openPath(this.path.join(this.appData, 'bsaber-data-backups'));
                break;
            case FolderType.QUEST_SABER_PATCH:
                this.electron.shell.openPath(this.path.join(this.appData, 'saber-quest-patch', 'questsaberpatch'));
                break;
            case FolderType.APP_BACKUP:
                this.electron.shell.openPath(this.path.join(this.backupPath, packageName));
                break;
            case FolderType.SONG_FOLDER:
                this.electron.shell.openPath(this.path.join(this.appData, 'bsaber', packageName));
                break;
        }
    }

    private foundSeedToolsPath: string | null = null;
    getPlatformToolsSeedPath() {
        if (this.foundSeedToolsPath !== null) {
            return this.foundSeedToolsPath;
        }
        let ogSourcesPath = this.path.join(process.resourcesPath, 'build', 'platform-tools');
        let sourcesPath = ogSourcesPath;
        if (!this.doesFileExist(sourcesPath)) {
            sourcesPath = sourcesPath.replace('app.asar', 'app.asar.unpacked');
        }
        if (!this.doesFileExist(sourcesPath)) {
            sourcesPath = this.path.join(process.resourcesPath, 'app.asar.unpacked', 'build', 'platform-tools');
        }
        if (!this.doesFileExist(sourcesPath)) {
            sourcesPath = this.path.join(process.cwd(), 'build', 'platform-tools');
        }
        if (!this.doesFileExist(sourcesPath)) {
            return null;
        }
        this.foundSeedToolsPath = sourcesPath;
        return sourcesPath;
    }
    seedPlatformTools() {
        return new Promise<void>(async (resolve, reject) => {
            let sourcesPath = this.getPlatformToolsSeedPath();
            if (sourcesPath == null) {
                console.error('Unable to locate platform tools!  Try reinstalling sidequest.');
                reject('Unable to locate platform tools!  Try reinstalling sidequest.');
                return;
            }
            await this.mkdir(this.path.join(this.appData, 'platform-tools'));
            try {
                let files: [] = this.fs.readdirSync(sourcesPath);
                //always copy the adb executable last so this will retry in the event some copying fails
                files.sort((a: string, b) => (a.endsWith('adb') || a.endsWith('adb.exe') ? 1 : -1));
                for (let i = 0; i < files.length; i++) {
                    try {
                        this.fs.copyFileSync(
                            this.path.join(sourcesPath, files[i]),
                            this.path.join(this.appData, 'platform-tools', files[i])
                        );
                    } catch (e) {
                        console.error('Error copying platform tools file ' + files[i] + e);
                        //if the file exists and isn't writeable, don't give up, have some hope it's just in use and is fine.
                        if (!this.fs.existsSync(this.path.join(this.appData, 'platform-tools', files[i]))) {
                            throw 'Error copying platform tools file: ' + e.toString();
                        }
                    }
                }
                if (this.os.platform() === 'darwin' || this.os.platform() === 'linux') {
                    this.setExecutable(this.path.join(this.appData, 'platform-tools', 'adb')).then(() =>
                        setTimeout(() => resolve(), 8000)
                    );
                } else {
                    setTimeout(() => resolve(), 8000);
                }
            } catch (e) {
                console.error('Error seeding platform tools! ', e);
                reject('Error seeding platform tools: ' + e.toString());
            }
        });
    }
    makeFolders() {
        return this.mkdir(this.appData)
            .then(() => this.mkdir(this.path.join(this.appData, 'backups')))
            .then(() => this.mkdir(this.path.join(this.appData, 'tmp')))
            .then(() => {});
    }
    async mkdir(path) {
        return new Promise(resolve => {
            this.fs.mkdir(path, { recursive: true }, resolve);
        });
    }
    setExecutable(path) {
        return new Promise<void>(resolve => {
            const ls = this.spawn('chmod', ['+x', path]);
            ls.stdout.on('data', res => {
                console.log(res);
            });
            ls.on('close', code => {
                resolve();
            });
        });
    }
    async downloadFile(winUrl, linUrl, macUrl, getPath, task?) {
        let downloadUrl = linUrl;
        switch (this.os.platform()) {
            case 'win32':
                downloadUrl = winUrl;
                break;
            case 'darwin':
                downloadUrl = macUrl;
                break;
            case 'linux':
                downloadUrl = linUrl;
                break;
        }
        let downloadPath = getPath(downloadUrl);
        return this.downloadFileAPI(downloadUrl, this.path.dirname(downloadPath), this.path.basename(downloadPath), {}, task).then(
            () => downloadPath
        );


    }
    downloadFileAPI(url, directory, filename, options, task?): Promise<string> {
        // Send request to application thread to download a file. Store the callback for the response.
        return new Promise((resolve, reject) => {
            let token = this.uuidv4();
            this.downloadResolves[token] = {
                scb: stats => {
                    if (task) {
                        task.status = (task.app_name ? task.app_name + ': ' : '') + 'Downloading... ' + stats + '%';
                    }
                },
                resolve,
                reject,
            };
            this.electron.ipcRenderer.send('download-url', { token, url, directory, filename, options });
        });
    }

  uploadFileAPI(url,  filename, options, task?): Promise<string> {
    // Send request to application thread to upload a file. Store the callback for the response.
    return new Promise((resolve, reject) => {
      let token = this.uuidv4();
      this.downloadResolves[token] = {
        scb: stats => {
          if (task) {
            task.status = (task.app_name ? task.app_name + ': ' : '') + 'Uploading... ' + stats + '%';
          }
        },
        resolve,
        reject,
      };
      this.electron.ipcRenderer.send('upload-url', { token, url, filename, options });
    });
  }


  getUserAgent() {
        const nodeString = `NodeJs/${(<any>window).process.version}`;
        const packageString = 'OpenStoreVR';
        const computerString = `Hostname/${this.os.hostname()} Platform/${this.os.platform()} PlatformVersion/${this.os.release()}`;
        return `${packageString} ${nodeString} ${computerString}`;
    }

    startScrCpy(options: any) {
        return new Promise((resolve, reject) => {
            let command =
                '"' +
                this.scrcpyBinaryPath +
                '" --crop ' +
                options.crop +
                ' ' +
                ' -b ' +
                options.bit_rate +
                ' ' +
                (options.max_size ? ' --max-fps ' + options.max_fps + ' ' : '') +
                (options.max_size ? ' --max-size ' + options.max_size + ' ' : '') +
                (options.always_on_top ? '--always-on-top' : '') +
                ' ' +
                (options.fullscreen ? '-f' : '') +
                ' ' +
                (options.no_control ? '-n' : '') +
                ' --window-title "SideQuest Stream"' +
                ' ' +
                (options.device ? '-s ' + options.device : '');
            console.log(command);
            this.exec(command, function(err, stdout, stderr) {
                if (err) {
                    return reject({ err, stderr, command });
                }
                resolve(stdout);
            });
        });
    }

    runScrCpy(options: any) {
        let platform = this.os.platform();
        if (platform === 'linux' || platform === 'darwin') {
            return new Promise((resolve, reject) => {
                this.exec('scrcpy -v', (err, stdout, stderr) => {
                    if (err) {
                        return reject(err);
                    }
                    this.startScrCpy(options)
                        .then(resolve)
                        .catch(reject);
                });
            });
        } else {
            return this.startScrCpy(options);
        }
    }

    downloadScrCpyBinary(adbClientService) {
        if (this.os.platform() === 'win32') {
            this.spinnerService.showLoader();
            let task = { status: 'Downloading/Extracting ScrCpy...' };
            this.spinnerService.setMessage('', task);
            let url = 'https://github.com/Genymobile/scrcpy/releases/download/v2.0/scrcpy-win64-v2.0.zip';
            let folderName = 'scrcpy-win64-v2.0';
            let downloadPath = this.path.join(this.appData, folderName, 'scrcpy.exe');
            if (this.doesFileExist(downloadPath)) {
                this.scrcpyBinaryPath = downloadPath;
                this.spinnerService.hideLoader();
                return Promise.resolve();
            }
            return new Promise<void>((resolve, reject) => {
                this.downloadFile(
                    url,
                    url,
                    url,
                    () => {
                        return this.path.join(this.appData, 'scrcpy.zip');
                    },
                    task
                ).then((path: any) => {
                    let callback = error => {
                        if (error) return reject(error);
                        this.fs.unlink(path, err => {
                            // if(err) return reject(err);
                            this.spinnerService.hideLoader();
                            resolve(path.split('.')[0]);
                        });
                    };

                    this.extract(path, { dir: this.path.join(this.appData) }, callback);
                    this.scrcpyBinaryPath = downloadPath;
                });
            });
        } else {
            this.scrcpyBinaryPath = 'ADB=' + adbClientService.adbPath + ' scrcpy';
        }
    }
    deleteFolderRecursive(path) {
        if (this.fs.existsSync(path)) {
            this.fs.readdirSync(path).forEach(file => {
                let curPath = path + '/' + file;
                if (this.fs.lstatSync(curPath).isDirectory()) {
                    // recurse
                    this.deleteFolderRecursive(curPath);
                } else {
                    // delete file
                    this.fs.unlinkSync(curPath);
                }
            });
            this.fs.rmdirSync(path);
        }
    }
}
