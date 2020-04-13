import { Injectable } from '@angular/core';
import { AppService } from './app.service';

@Injectable({
    providedIn: 'root',
})
export class WebviewService {
    webView: any;
    isWebviewOpen: boolean;
    currentAddress: string = 'https://sidequestvr.com';
    isWebviewLoading: boolean = false;
    isLoaded = () => {};
    constructor(private appService: AppService) {
        appService.setWebviewService(this);
    }
    setWebView(webView) {
        this.webView = webView;
        this.setupWebview();
    }
    setupWebview() {
        let customCss = `
            ::-webkit-scrollbar {
                height: 16px;
                width: 16px;
                background: #e0e0e0;
            }
            ::-webkit-scrollbar-corner {
                background: #cfcfcf;
            }
            ::-webkit-scrollbar-thumb {
                background: #ed4e7a;
            }
            .-sidequest{
                background-image: url('https://i.imgur.com/Hy2oclv.png');
                background-size: 12.814px 15px;
            }
            .bsaber-tooltip.-sidequest::after {
                content: "Add to SideQuest";
            }
            .-sidequest-remove{
                background-image: url('https://i.imgur.com/5ZPR9L1.png');
                background-size: 15px 15px;
            }
            .bsaber-tooltip.-sidequest-remove::after {
                content: "Remove Custom Level";
            }`;
        this.webView.addEventListener('did-start-loading', e => {
            //this.currentAddress = this.webView.getURL();
            this.isWebviewLoading = true;
            this.webView.insertCSS(customCss);
        });
        this.webView.addEventListener('did-navigate-in-page', () => {
            this.currentAddress = this.webView.getURL();
        });
        this.webView.addEventListener('did-stop-loading', async e => {
            this.currentAddress = this.webView.getURL();
            this.isWebviewLoading = false;
            this.webView.insertCSS(customCss);
            this.isLoaded();
            this.webView.openDevTools();
        });
    }
    back() {
        if (this.webView.canGoBack()) {
            this.webView.goBack();
        }
    }
    forward() {
        if (this.webView.canGoForward()) {
            this.webView.goForward();
        }
    }
    getTitle() {
        return this.webView.getTitle();
    }
    send() {
        this.webView.loadURL(this.currentAddress);
    }
    loadUrl(url: string) {
        if (!/^(?:f|ht)tps?\:\/\//.test(url)) {
            url = 'https://' + url;
        }
        this.currentAddress = url;
        this.webView.loadURL(url);
    }
}
