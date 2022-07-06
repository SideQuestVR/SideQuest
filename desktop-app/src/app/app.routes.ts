import { SetupComponent } from './setup/setup.component';
import { Routes } from '@angular/router';
import { PackagesComponent } from './packages/packages.component';
import { WebviewComponent } from './webview/webview.component';
import { FilesComponent } from './files/files.component';
import { CurrentTasksComponent } from './current-tasks/current-tasks.component';
import { HeadsetSettingsComponent } from './headset-settings/headset-settings.component';
import { SetupGuideComponent } from './setup-guide/setup-guide.component';

export const AppRoutes: Routes = [
    // { path: 'setup', component: SetupComponent },
    { path: 'tasks', component: CurrentTasksComponent },
    { path: 'packages', component: PackagesComponent },
    { path: 'packages/:packageName', component: PackagesComponent },
    { path: 'tools', component: HeadsetSettingsComponent },
    { path: 'setup', component: SetupGuideComponent },
    { path: 'webview', component: WebviewComponent },
    { path: 'device-files', component: FilesComponent },
    { path: '**', component: WebviewComponent },
];
