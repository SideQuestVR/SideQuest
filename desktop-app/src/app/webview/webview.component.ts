import { Component, OnInit } from '@angular/core';
import { WebviewService } from '../webview.service';
import { AppService } from '../app.service';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs/Subscription';

@Component({
    selector: 'app-webview',
    templateUrl: './webview.component.html',
    styleUrls: ['./webview.component.css'],
})
export class WebviewComponent implements OnInit {
    constructor(webService: WebviewService, appService: AppService, router: Router, route: ActivatedRoute) {
        appService.resetTop();
        webService.isWebviewOpen = true;
        appService.showBrowserBar = true;
        appService.setTitle('<img src="assets/images/logo-textual.png" class="logo-img"/>');
    }

    ngOnInit() {}
}
