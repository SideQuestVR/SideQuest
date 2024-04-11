import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { LoadingSpinnerService } from './loading-spinner.service';
import { StatusBarService } from './status-bar.service';
import { AppService } from './app.service';
import { ProcessBucketService } from './process-bucket.service';

@Injectable({
    providedIn: 'root',
})
export class AudicaService {
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
                useContentDispositionFilename: true
            };
            task.status = 'Saving to Audica...';
            return new Promise((resolve, reject) => {
              this.appService.downloadFileAPI( downloadUrl, null, zipPath, requestOptions, task).then( async (fileName) => {
                let ext = this.appService.path.extname(fileName).toLowerCase();
                let basename = this.appService.path.basename(fileName);
                await adbService.uploadFile([ {
                      name: fileName,
                      savePath: '/sdcard/Audica/' + basename,
                    }], task);
                task.status = 'Saved! ' + basename;
                this.appService.fs.unlink(fileName, err => {
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
