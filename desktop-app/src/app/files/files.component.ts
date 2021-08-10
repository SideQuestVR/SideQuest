import { AfterViewInit, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { AdbClientService, ConnectionStatus } from '../adb-client.service';
import { AppService } from '../app.service';
import { LoadingSpinnerService } from '../loading-spinner.service';
import { StatusBarService } from '../status-bar.service';
import { ProcessBucketService } from '../process-bucket.service';
interface FileFolderListing {
    name: string;
    icon: string;
    size: number;
    time: Date;
    filePath: string;
}
interface BreadcrumbListing {
    name: string;
    path: string;
}
declare let M;
@Component({
    selector: 'app-files',
    templateUrl: './files.component.html',
    styleUrls: ['./files.component.css'],
})
export class FilesComponent implements OnInit {
    @ViewChild('filesModal', { static: false }) filesModal;
    @ViewChild('fixedAction', { static: false }) fixedAction;
    @ViewChild('downloadMediaModal', { static: false }) downloadMediaModal;
    files: FileFolderListing[] = [];
    selectedFiles: FileFolderListing[] = [];
    filesToBeSaved: FileFolderListing[];
    filesToBeDeleted: FileFolderListing[];
    breadcrumbs: BreadcrumbListing[] = [];
    isOpen = false;
    currentPath: string;
    folderName: string;
    folderSize: string;
    currentFile: FileFolderListing;
    quickSaveModels: string[] = ['Quest', 'Go'];
    constructor(
        public spinnerService: LoadingSpinnerService,
        public adbService: AdbClientService,
        public appService: AppService,
        public statusService: StatusBarService,
        private processService: ProcessBucketService
    ) {
        this.appService.resetTop();
        appService.filesComponent = this;
        appService.isFilesOpen = true;
        appService.webService.isWebviewOpen = false;
    }
    ngOnAfterViewInit() {
        M.FloatingActionButton.init(this.fixedAction.nativeElement, {});
    }
    ngOnInit() {
        this.appService.setTitle('Headset Files');
    }
    async makeFolder() {
        if (
            !!~this.files
                .filter(f => f.icon === 'folder')
                .map(f => f.name)
                .indexOf(this.folderName)
        ) {
            return this.statusService.showStatus('A folder already exists with that name!!', true);
        } else {
            await this.adbService.makeDirectory(this.appService.path.posix.join(this.currentPath, this.folderName)).then(r => {
                this.folderName = '';
                this.open(this.currentPath);
            });
        }
    }
    selectFile(event: Event, file: FileFolderListing) {
        let fileElement = event.target as Element;

        if (file.icon === 'folder' && !(fileElement.classList.contains('save-icon') || fileElement.classList.contains('delete'))) {
            this.selectedFiles.length = 0;
            this.open(this.appService.path.posix.join(this.currentPath, file.name));
        } else if (!fileElement.classList.contains('delete') && !fileElement.classList.contains('save-icon')) {
            while (!fileElement.classList.contains('file')) {
                fileElement = fileElement.parentElement;
            }

            if (this.selectedFiles.includes(file)) {
                this.selectedFiles.splice(this.selectedFiles.indexOf(file), 1);
                fileElement.classList.remove('selected');
            } else {
                this.selectedFiles.push(file);
                fileElement.classList.add('selected');
            }
        }
    }
    clearSelection(files?: FileFolderListing[]) {
        if (files) {
            for (const file of files) {
                document
                    .querySelectorAll('.file')
                    .item(this.files.indexOf(file))
                    .classList.remove('selected');
                this.selectedFiles = this.selectedFiles.filter(f => f !== file);
            }
        } else {
            document.querySelectorAll('.selected').forEach(element => {
                element.classList.remove('selected');
            });
            this.selectedFiles.length = 0;
        }
    }
    async uploadFolder(folder, files, task) {
        task.status = 'Restoring Folder... ' + folder;
        if (this.appService.fs.existsSync(folder)) {
            this.adbService.localFiles = [];
            await this.adbService
                .getLocalFoldersRecursive(folder)
                .then(() => {
                    this.adbService.localFiles.forEach(file => {
                        file.savePath = this.appService.path.posix.join(
                            this.currentPath,
                            file.name
                                .replace(folder, this.appService.path.basename(folder))
                                .split('\\')
                                .join('/')
                        );
                    });
                    return this.adbService.uploadFile(this.adbService.localFiles.filter(f => f.__isFile), task);
                })
                .then(() => setTimeout(() => this.uploadFile(files, task), 500));
        }
    }
    uploadFile(files, task): Promise<any> {
        if (!files.length) {
            return Promise.resolve();
        }
        const f = files.shift();
        const savePath = this.appService.path.posix.join(this.currentPath, this.appService.path.basename(f));
        if (!this.appService.fs.existsSync(f)) {
            return Promise.resolve().then(() => setTimeout(() => this.uploadFile(files, task), 500));
        }
        if (this.appService.fs.lstatSync(f).isDirectory()) {
            return new Promise(async resolve => {
                this.folderName = this.appService.path.basename(f);
                await this.makeFolder();
                await this.uploadFolder(f, files, task);
                resolve();
            });
        }
        return this.adbService
            .adbCommand('push', { serial: this.adbService.deviceSerial, path: f, savePath }, stats => {
                task.status =
                    'File uploading: ' +
                    this.appService.path.basename(f) +
                    ' ' +
                    Math.round((stats.bytesTransferred / 1024 / 1024) * 100) / 100 +
                    'MB';
            })
            .then(() => {
                return new Promise(resolve => {
                    setTimeout(() => this.uploadFile(files, task).then(() => resolve()), 500);
                });
            });
    }
    uploadFilesFromList(files: string[]) {
        if (files !== undefined && files.length) {
            return this.processService.addItem('restore_files', async task => {
                task.status = 'Starting Upload to ' + this.currentPath;
                return this.uploadFile(files, task)
                    .then(() => {
                        setTimeout(() => {
                            this.open(this.currentPath);
                        }, 1500);
                        task.status = 'Upload complete!';
                    })
                    .catch(e => this.statusService.showStatus(e.toString(), true));
            });
        }
    }
    async uploadFiles() {
        let res = await this.appService.electron.remote.dialog.showOpenDialog({
            properties: ['openFile', 'multiSelections'],
            defaultPath: this.adbService.savePath,
        });
        this.uploadFilesFromList(res.filePaths);
    }
    quickSaveSupported() {
        return this.quickSaveModels.includes(this.adbService.deviceModel);
    }
    async downloadMedia() {
        let paths = [];
        let media: FileFolderListing[] = [];

        if (this.adbService.deviceModel === 'Quest' || this.adbService.deviceModel === 'Go') {
            paths = ['/sdcard/Oculus/Screenshots', '/sdcard/Oculus/VideoShots'];
        }

        for (const path of paths) {
            await this.readdir(path).then(dirContents => {
                media = media.concat(dirContents.filter(file => file.icon !== 'folder'));
            });
        }

        this.saveFiles(media);
    }
    deleteFiles(files: FileFolderListing[]) {
        for (const file of files) {
            this.deleteFile(file);
        }

        this.statusService.showStatus(files.length + ' Item(s) Deleted!!');
    }
    deleteFile(file: FileFolderListing) {
        this.adbService
            .adbCommand('shell', { serial: this.adbService.deviceSerial, command: 'rm "' + file.filePath + '" -r' })
            .then(r => {
                this.files.splice(this.files.indexOf(file), 1);
            });
    }
    saveFiles(files: FileFolderListing[]) {
        this.filesModal.closeModal();
        for (const file of files) {
            if (file.icon !== 'folder') {
                this.saveFile(file);
            } else {
                this.saveFolder(file);
            }
        }
    }
    saveFile(file: FileFolderListing) {
        const savePath = this.appService.path.join(this.adbService.savePath, file.name);
        const path = file.filePath;
        return this.processService.addItem('save_files', async task => {
            return this.adbService
                .adbCommand('pull', { serial: this.adbService.deviceSerial, path, savePath }, stats => {
                    task.status =
                        'File downloading: ' +
                        this.appService.path.basename(savePath) +
                        ' - ' +
                        Math.round(stats.bytesTransferred / 1024 / 1024) +
                        ' / ' +
                        file.size +
                        ' MB';
                })
                .then(() => {
                    task.status = 'Files Saved to ' + savePath + '!!';
                    this.statusService.showStatus('File (' + file.name + ') Saved OK!');
                })
                .catch(e => this.statusService.showStatus(e.toString(), true));
        });
    }
    saveFolder(file: FileFolderListing) {
        this.filesModal.closeModal();
        const savePath = this.appService.path.join(this.adbService.savePath, file.name);
        const path = file.filePath;
        this.adbService.files = [];
        return this.processService.addItem('save_files', async task => {
            return this.adbService
                .getFoldersRecursive(path)
                .then(() => this.appService.mkdir(savePath))
                .then(
                    () =>
                        (this.adbService.files = this.adbService.files.map(f => {
                            f.saveName = this.appService.path.join(savePath, f.name.replace(path, ''));
                            return f;
                        }))
                )
                .then(() => this.adbService.makeFolder(this.adbService.files.filter(f => !f.__isFile)))
                .then(() => this.adbService.downloadFile(this.adbService.files.filter(f => f.__isFile), task))
                .then(() => this.statusService.showStatus('Folder Saved OK!'));
        });
    }
    async pickLocation() {
        let res = await this.appService.electron.remote.dialog.showOpenDialog({
            properties: ['openDirectory'],
            defaultPath: this.adbService.savePath,
        });
        if (res && res.filePaths && res.filePaths.length === 1) {
            this.adbService.savePath = res.filePaths[0];
            this.adbService.setSavePath();
        }
    }
    isConnected() {
        const isConnected = this.adbService.deviceStatus === ConnectionStatus.CONNECTED;
        if (isConnected && !this.isOpen) {
            this.isOpen = true;
            this.open('/sdcard/');
        }
        return isConnected;
    }
    getCrumb(path: string) {
        const parts = path.split('/');
        const name = parts.pop();
        const parentPath = parts.join('/');
        if (parts.length > 0) {
            this.getCrumb(parentPath);
        }
        this.breadcrumbs.push({ path, name });
    }
    open(path: string) {
        this.currentPath = path;
        this.breadcrumbs = [];
        this.selectedFiles.length = 0;
        this.files.length = 0;
        this.getCrumb(
            this.currentPath
                .split('/')
                .filter(d => d)
                .join('/')
        );
        if (!this.isConnected()) {
            return Promise.resolve();
        }
        this.readdir(path).then(dirContents => {
            this.files = dirContents;
            this.files.sort(function(a, b) {
                const textA = a.name.toUpperCase();
                const textB = b.name.toUpperCase();
                return textA < textB ? -1 : textA > textB ? 1 : 0;
            });
            this.files = this.files.filter(d => d.icon === 'folder').concat(this.files.filter(d => d.icon !== 'folder'));
        });
    }
    openSaveLocation() {
        this.appService.electron.remote.shell.openItem(this.adbService.savePath);
    }
    async readdir(path: string) {
        let dirContents: FileFolderListing[];
        let isRoot = ['/sdcard/', 'sdcard', 'sdcard/', '/sdcard'].indexOf(path) > -1;
        if (isRoot) {
            this.folderSize = null;
        } else {
            this.folderSize = await this.adbService.adbCommand('shell', {
                serial: this.adbService.deviceSerial,
                command: 'du -sh "' + path + '"',
            });
            this.folderSize = this.folderSize.split('\t')[0];
        }
        await this.adbService.adbCommand('readdir', { serial: this.adbService.deviceSerial, path }).then(files => {
            dirContents = files.map(file => {
                const name = file.name;
                const size = Math.round((file.size / 1024 / 1024) * 100) / 100;
                const time = file.mtime;
                const filePath = this.appService.path.posix.join(path, file.name);
                let icon = 'folder';
                if (file.__isFile) {
                    const fileParts = file.name.split('.');
                    const extension = (fileParts[fileParts.length - 1] || '').toLowerCase();
                    switch (extension) {
                        case 'gif':
                        case 'png':
                        case 'jpeg':
                        case 'jpg':
                            icon = 'photo';
                            break;
                        case 'wav':
                        case 'ogg':
                        case 'mp3':
                            icon = 'music_note';
                            break;
                        case 'avi':
                        case 'mp4':
                            icon = 'ondemand_video';
                            break;
                        case 'txt':
                        case 'docx':
                        case 'doc':
                            icon = 'receipt';
                            break;
                        case 'pptx':
                        case 'ppt':
                            icon = 'picture_in_picture';
                            break;
                        case 'xlsx':
                        case 'xls':
                            icon = 'grid_on';
                            break;
                        default:
                            icon = 'receipt';
                            break;
                    }
                }
                return { name, icon, size, time, filePath };
            });
        });
        return dirContents;
    }
}
