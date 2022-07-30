import { Routes } from '@angular/router';
import { PackagesComponent } from './packages/packages.component';
import { WebviewComponent } from './webview/webview.component';
import { FilesComponent } from './files/files.component';
import { CurrentTasksComponent } from './current-tasks/current-tasks.component';
import { HeadsetSettingsComponent } from './headset-settings/headset-settings.component';
import { SetupGuideComponent } from './setup-guide/setup-guide.component';
import { WirelessConnectionComponent } from './wireless-connection/wireless-connection.component';
import { StreamOptionsComponent } from './stream-options/stream-options.component';

export const AppRoutes: Routes = [
    { path: 'tasks', component: CurrentTasksComponent },
    { path: 'packages', component: PackagesComponent },
    { path: 'packages/:packageName', component: PackagesComponent },
    { path: 'tools', component: HeadsetSettingsComponent },
    { path: 'setup', component: SetupGuideComponent },
    { path: 'webview', component: WebviewComponent },
    { path: 'wireless', component: WirelessConnectionComponent },
    { path: 'streaming', component: StreamOptionsComponent },
    { path: 'device-files', component: FilesComponent },
    { path: '**', component: WebviewComponent },
];
