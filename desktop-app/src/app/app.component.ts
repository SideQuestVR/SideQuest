import { Component, isDevMode, ViewChild } from '@angular/core';
import { AppService } from './app.service';
import { LoadingSpinnerService } from './loading-spinner.service';
import { StatusBarService } from './status-bar.service';
import { WebviewService } from './webview.service';
import { DragAndDropService } from './drag-and-drop.service';
import { ElectronService } from './electron.service';
import { AdbClientService } from './adb-client.service';
@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css'],
})
export class AppComponent {
    @ViewChild('spinner', { static: false }) spinner;
    @ViewChild('status', { static: false }) status;
    @ViewChild('webview', { static: false }) webview;
    helpStatus: string;
    devMode: boolean;
    constructor(
        private spinnerService: LoadingSpinnerService,
        public statusService: StatusBarService,
        private adbService: AdbClientService,
        public appService: AppService,
        public webService: WebviewService,
        public dragService: DragAndDropService,
        private electronService: ElectronService
    ) {
        this.devMode = isDevMode();
    }
    ngOnInit() {
        this.adbService
            .setupAdb()
            .then(() => this.appService.downloadScrCpyBinary())
            .then(() => this.adbService.connectedStatus())
            .then(() => {
                if (!localStorage.getItem('first_run')) {
                    localStorage.setItem('first_run', 'true');
                    this.statusService.showStatus(
                        'Thanks for downloading SideQuest! Please click "Setup" on the top menu to begin and then "Sign Up" to get app updates, remote installing and more!'
                    );
                }

                this.dragService.setupDragAndDrop(this.webview.nativeElement);
            });
    }
    ngAfterViewInit() {
        this.spinnerService.setSpinner(this.spinner);
        this.statusService.setStatus(this.status);
        this.webService.setWebView(this.webview.nativeElement);
    }
}
