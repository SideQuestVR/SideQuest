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
            let parts = downloadUrl.split('/');
            let zipPath = this.appService.path.join(this.appService.appData, this.appService.path.basename(downloadUrl));
            let ws = this.appService.fs.createWriteStream(zipPath);
            //let name = parts[parts.length - 1].split('.')[0];
            const requestOptions = {
                timeout: 30000,
                'User-Agent': this.appService.getUserAgent(),
            };
            task.status = 'Saving to SynthRiders...';
            return new Promise((resolve, reject) => {
                let request = this.appService
                    .progress(this.appService.request(downloadUrl, requestOptions), { throttle: 50 })
                    .on('error', error => {
                        task.failed = true;
                        task.status = 'Failed to save item... ' + error.toString();
                        reject(error);
                    })
                    .on('progress', state => {
                        task.status = 'Saving to SynthRiders... ' + Math.round(state.percent * 100) + '%';
                    })
                    .on('response', response => {
                        var regexp = /filename=\"(.*)\"/gi;
                        var _regResult = regexp.exec(response.headers['content-disposition']);
                        if (_regResult && _regResult.length) {
                            zipPath = this.appService.path.join(this.appService.appData, decodeURIComponent(_regResult[1]));
                        }
                        request.pipe(this.appService.fs.createWriteStream(zipPath));
                    })
                    .on('end', async () => {
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
                    });
            });
        });
    }
}
