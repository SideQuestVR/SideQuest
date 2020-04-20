import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AppService } from './app.service';
import { environment } from './../environments/environment';
import { ElectronService } from './electron.service';
import { AdbClientService } from './adb-client.service';

interface CheckSubmissionResponse {
    found: boolean;
}

@Injectable({
    providedIn: 'root',
})
export class SafeSideService {
    constructor(private appService: AppService, private adbService: AdbClientService) {} // private http: HttpClient

    async checkAPK(updateStatus: (string) => void, filePath: string): Promise<boolean> {
        return this.adbService.adbCommand('hashCheck', { path: filePath }, updateStatus);
        // const hash = await this.computeFileHash(updateStatus, filePath);
        // const url = `${environment.safeSideApiUrl}/check-app-hash/${hash}`;
        // updateStatus('Checking APK against blacklist...');
        // const response = await this.http.get<CheckSubmissionResponse>(url).toPromise();
        // return response.found;
    }
    // async computeFileHash(updateStatus: (string) => void, filePath: string): Promise<string> {
    //     const fileSize = await this.computeFileSize(filePath);
    //     return new Promise((resolve, reject) => {
    //         let bytesRead: number = 0;
    //         const fd = this.appService.fs.createReadStream(filePath);
    //         const hash = this.appService.crypto.createHash('md5');
    //         hash.setEncoding('hex');
    //         fd.on('data', chunk => {
    //             bytesRead += chunk.length;
    //             const percentage = this.formattedPercentageComplete(bytesRead, fileSize);
    //             updateStatus(`Computing APK hash (${percentage})...`);
    //         });
    //         fd.on('end', () => {
    //             updateStatus(`Computing APK hash (100%)...`);
    //             hash.end();
    //             resolve(hash.read());
    //         });
    //         fd.on('error', error => {
    //             reject(error);
    //         });
    //         fd.pipe(hash);
    //     });
    // }
    // async computeFileSize(filePath: string): Promise<number> {
    //     return new Promise((resolve, reject) => {
    //         this.appService.fs.stat(filePath, (err, stats) => {
    //             if (err) {
    //                 reject(err);
    //             } else {
    //                 resolve(stats.size);
    //             }
    //         });
    //     });
    // }
    // formattedPercentageComplete(amount: number, total: number): string {
    //     const percentage = Math.round(Math.min(amount / total, 1) * 100);
    //     return `${percentage}%`;
    // }
}
