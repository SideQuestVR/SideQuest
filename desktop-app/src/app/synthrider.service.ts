import { Injectable } from '@angular/core';
import { LoadingSpinnerService } from './loading-spinner.service';
import { HttpClient } from '@angular/common/http';
import { ProcessBucketService } from './process-bucket.service';
import { StatusBarService } from './status-bar.service';
import { AppService } from './app.service';

@Injectable({
    providedIn: 'root',
})
export class SynthriderService {
    constructor(
        private http: HttpClient,
        private spinnerService: LoadingSpinnerService,
        private statusService: StatusBarService,
        private appService: AppService,
        private processService: ProcessBucketService
    ) {}

    downloadSong(downloadUrl, adbService) {
        return this.processService.addItem('song_download', async (task) : Promise<void> => {
            let zipPath = this.appService.path.join(this.appService.appData, this.appService.path.basename(downloadUrl));
            const requestOptions = {
                timeout: 30000,
                'User-Agent': this.appService.getUserAgent(),
                useContentDispositionFilename: true,
            };
            task.status = 'Saving to SynthRiders...';
            return new Promise((resolve, reject) => {
              this.appService.downloadFileAPI( downloadUrl, null, zipPath, requestOptions, task).then( async (fileName) => {
                        let zipPath = fileName;
                        let ext = this.appService.path.extname(zipPath).toLowerCase();
                        let basename = this.appService.path.basename(zipPath);
                        await adbService.uploadFile(
                            [
                                {
                                    name: zipPath,
                                    savePath:
                                        '/sdcard/SynthRidersUC/' +
                                        (ext.toLowerCase() === '.synth'
                                            ? 'CustomSongs/'
                                            : ext.toLowerCase() === '.playlist'
                                            ? 'Playlist/'
                                            : ext.toLowerCase() === '.stagequest' || ext.toLowerCase() === '.spinstagequest'
                                            ? 'CustomStages/'
                                            : 'Mods/') +
                                        basename,
                                },
                            ],
                            task
                        );
                        task.status = 'Saved! ' + basename;
                        this.appService.fs.unlink(zipPath, err => {
                            if (err) console.warn(err);
                        });
                        resolve();
                    }).catch((error) => {
                      task.failed = true;
                      task.status = 'Failed to save item... ' + error.toString();
                      reject(error);
                    });
            });
        });
    }
}
