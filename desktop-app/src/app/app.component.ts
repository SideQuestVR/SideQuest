import { AfterViewInit, Component, isDevMode, OnInit, ViewChild } from '@angular/core';
import { AppService } from './app.service';
import { LoadingSpinnerService } from './loading-spinner.service';
import { StatusBarService } from './status-bar.service';
import { WebviewService } from './webview.service';
import { DragAndDropService } from './drag-and-drop.service';
import { ElectronService } from './electron.service';
import { AdbClientService } from './adb-client.service';
import { environment } from '../environments/environment';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit, AfterViewInit {
    @ViewChild('spinner') spinner;
    @ViewChild('status') status;
    @ViewChild('webview') webview;
    helpStatus: string;
    extraHelpStatus: string;
    devMode: boolean;
    webUrl = environment.configuration.web_url;
    shortenerUrl = environment.configuration.shortenerUrl;
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
            .then(() => this.appService.downloadScrCpyBinary(this.adbService))
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
        this.webService.setWebView(this.webview.nativeElement);
    }
    setExterHelp() {
        let uninstall_instructions = `
      <div class="card-panel grey lighten-2 z-depth-1">
        <div class="row valign-wrapper">
          <div class="col s2">
            <img src="assets/images/app-icon.png" alt="" class="circle responsive-img">
          </div>
          <div class="col s10">
            <span class="black-text">
              SOLUTION: You may be able to resolve this issue by uninstalling the app first.<br><br>Click the <i class="material-icons vertical-align">apps</i> icon at the top, then click the <i class="material-icons vertical-align">settings</i> icon beside this app and finally click "Uninstall". You can then try to install this app again.
            </span>
          </div>
        </div>
      </div>`;
        switch (true) {
            case this.helpStatus.indexOf('INSTALL_FAILED_UPDATE_INCOMPATIBLE') > -1:
                this.extraHelpStatus = uninstall_instructions;
                break;
            default:
                this.extraHelpStatus = null;
                break;
        }
    }
}
