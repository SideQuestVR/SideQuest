import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { LoadingSpinnerService } from './loading-spinner.service';
import { StatusBarService } from './status-bar.service';
import { AppService } from './app.service';
import { ProcessBucketService } from './process-bucket.service';
import { AdbClientService } from './adb-client.service';

@Injectable({
    providedIn: 'root',
})
export class SongBeaterService {
    constructor(
        private http: HttpClient,
        private spinnerService: LoadingSpinnerService,
        private statusService: StatusBarService,
        private appService: AppService,
        private processService: ProcessBucketService
    ) {}
    async moveSongToDevice(packageBackupPath, adbService, task, name) {
        if (this.appService.fs.existsSync(packageBackupPath)) {
            adbService.localFiles = [];
            await adbService
                .getLocalFoldersRecursive(packageBackupPath)
                .then(
                    (): any => {
                        adbService.localFiles.forEach(file => {
                            console.log(
                                packageBackupPath,
                                file.name
                                    .replace(packageBackupPath, '')
                                    .split('\\')
                                    .join('/')
                            );
                            file.savePath = this.appService.path.posix.join(
                                '/sdcard/Android/data/com.playito.songbeater/CustomSongs',
                                name,
                                file.name
                                    .replace(packageBackupPath, '')
                                    .split('\\')
                                    .join('/')
                            );
                        });
                        return adbService.uploadFile(adbService.localFiles.filter(f => f.__isFile), task);
                    }
                )
                .then(() => {
                    task.succeeded = true;
                    this.statusService.showStatus('Synced to Song Beater OK!');
                });
        }
    }
    downloadSong(downloadUrl, adbService) {
        let parts = downloadUrl.split('/');
        let zipPath = this.appService.path.join(this.appService.appData, parts[parts.length - 1]);
        let name = parts[parts.length - 1].split('.')[0];
        const requestOptions = {
            timeout: 30000,
            'User-Agent': this.appService.getUserAgent()
        };
        return this.processService.addItem('song_download', async (task) : Promise<void> => {
            return new Promise((resolve, reject) => {
              this.spinnerService.setMessage('Saving to SongBeater... ');
              this.appService.downloadFileAPI( downloadUrl, null, zipPath, requestOptions, task).then( async (fileName) => {
                 let dir = this.appService.path.join(this.appService.appData, 'temp', name);
                        this.appService.fs.mkdir(dir, () => {
                            this.appService.extract(zipPath, { dir: dir }, error => {
                                this.appService.fs.unlink(zipPath, err => {
                                    if (error) {
                                        this.appService.deleteFolderRecursive(dir);
                                        reject(error);
                                    } else {
                                        this.moveSongToDevice(dir, adbService, task, name)
                                            .then(() => {
                                                task.status = 'Saved to Song Beater!';
                                                return this.appService.deleteFolderRecursive(dir);
                                            })
                                            .then(() => resolve());
                                    }
                                });
                            });
                        });
                    })
            });
        });
    }
}
