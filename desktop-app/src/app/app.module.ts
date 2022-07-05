import { BrowserModule } from '@angular/platform-browser';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { AppComponent } from './app.component';
import { ContentComponent } from './content/content.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { MzButtonModule, MzCheckboxModule, MzModalModule, MzTooltipModule } from 'ngx-materialize';
import { DragulaModule } from 'ng2-dragula';
import { HeaderComponent } from './header/header.component';
import { StatusBarComponent } from './status-bar/status-bar.component';
import { LoadingSpinnerComponent } from './loading-spinner/loading-spinner.component';
import { RouterModule } from '@angular/router';
import { SetupComponent } from './setup/setup.component';
import { AppRoutes } from './app.routes';
import { LoadingSpinnerSmallComponent } from './loading-spinner-small/loading-spinner-small.component';
import { PackagesComponent } from './packages/packages.component';
import { PackageItemComponent } from './package-item/package-item.component';
import { LinkComponent } from './link/link.component';
import { FormsModule } from '@angular/forms';
import { SanitizeHtmlPipe } from './sanitize-html.pipe';
import { WebviewComponent } from './webview/webview.component';
import { WebviewDirective } from './webview.directive';
import { FilesComponent } from './files/files.component';
import { ColorPickerModule } from 'ngx-color-picker';
import { HttpClientModule } from '@angular/common/http';
import { CurrentTasksComponent } from './current-tasks/current-tasks.component';
import { CurrentTaskItemComponent } from './current-task-item/current-task-item.component';
import { VirtualScrollerModule } from 'ngx-virtual-scroller';
import { HeadsetSettingsComponent } from './headset-settings/headset-settings.component';
@NgModule({
    declarations: [
        AppComponent,
        ContentComponent,
        HeaderComponent,
        StatusBarComponent,
        LoadingSpinnerComponent,
        SetupComponent,
        LoadingSpinnerSmallComponent,
        PackagesComponent,
        PackageItemComponent,
        LinkComponent,
        SanitizeHtmlPipe,
        WebviewComponent,
        WebviewDirective,
        FilesComponent,
        CurrentTasksComponent,
        CurrentTaskItemComponent,
        HeadsetSettingsComponent,
    ],
    imports: [
        BrowserModule,
        DragulaModule.forRoot(),
        FormsModule,
        RouterModule.forRoot(AppRoutes, { useHash: true }),
        MzTooltipModule,
        MzModalModule,
        MzButtonModule,
        HttpClientModule,
        MzCheckboxModule,
        ColorPickerModule,
        BrowserAnimationsModule,
        VirtualScrollerModule,
    ],
    providers: [],
    bootstrap: [AppComponent],
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class AppModule {}
