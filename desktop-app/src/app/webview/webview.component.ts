import { Component, OnInit } from '@angular/core';
import { WebviewService } from '../webview.service';
import { AppService } from '../app.service';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
    selector: 'app-webview',
    templateUrl: './webview.component.html',
    styleUrls: ['./webview.component.scss'],
})
export class WebviewComponent implements OnInit {
    constructor(webService: WebviewService, appService: AppService, router: Router, route: ActivatedRoute) {
        appService.resetTop();
        webService.isWebviewOpen = true;
        appService.showBrowserBar = true;
    }

    ngOnInit() {}
}
