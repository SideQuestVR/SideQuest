import { Injectable } from '@angular/core';
import { AppService } from '../app.service';

@Injectable({
    providedIn: 'root',
})
export class PackageService {
    allApps: any = {};
    indexUrl = 'https://the-expanse.github.io/SideQuestRepos/';
    constructor(private appService: AppService) {
        this.getAppIndex();
    }
    getAppIndex() {
        this.appService.request(this.indexUrl);
        return new Promise((resolve, reject) => {
            this.appService.request(this.indexUrl + 'app-index.json', (error, response, body) => {
                if (error) {
                    return reject(error);
                } else {
                    try {
                        let body = JSON.parse(response.body);
                        Object.keys(body).forEach(packageName => {
                            this.allApps[packageName] = body[packageName];
                            this.allApps[packageName].icon = this.indexUrl + this.allApps[packageName].icon;
                        });
                        resolve(true);
                    } catch (e) {
                        return reject('JSON parse Error');
                    }
                }
            });
        });
    }
}
