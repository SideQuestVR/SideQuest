import { SetupComponent } from './setup/setup.component';
import { Routes } from '@angular/router';
import { PackagesComponent } from './packages/packages.component';
import { ToolsComponent } from './tools/tools.component';
import { WebviewComponent } from './webview/webview.component';
import { FilesComponent } from './files/files.component';
import { CurrentTasksComponent } from './current-tasks/current-tasks.component';

export const AppRoutes: Routes = [
    { path: 'setup', component: SetupComponent },
    { path: 'tasks', component: CurrentTasksComponent },
    { path: 'packages', component: PackagesComponent },
    { path: 'packages/:packageName', component: PackagesComponent },
    { path: 'tools', component: ToolsComponent },
    { path: 'webview', component: WebviewComponent },
    { path: 'device-files', component: FilesComponent },
    { path: '**', component: WebviewComponent },
];
