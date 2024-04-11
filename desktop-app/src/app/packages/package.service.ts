import { Injectable } from '@angular/core';
import { AppService } from '../app.service';
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root',
})
export class PackageService {
    allApps: any = {};
    indexUrl = 'https://the-expanse.github.io/SideQuestRepos/';
    constructor(private appService: AppService) {
        this.getAppIndex();
    }
    async getAppIndex() {
      const request = await fetch(this.indexUrl, {
        method: 'GET',
        headers: { "Content-Type": "application/json" }
      });

      let json = await request.json();
      const request2 = await fetch(this.indexUrl + 'app-index.json', {
        method: 'GET',
        headers: { "Content-Type": "application/json" }
      });
      let body = await request2.json();

      Object.keys(body).forEach(packageName => {
          this.allApps[packageName] = body[packageName];
          this.allApps[packageName].icon = this.indexUrl + this.allApps[packageName].icon;
      });
      return true;
    }
}
