import { Injectable } from '@angular/core';
import { LoadingSpinnerComponent } from './loading-spinner/loading-spinner.component';

@Injectable({
    providedIn: 'root',
})
export class LoadingSpinnerService {
    spinner: LoadingSpinnerComponent;
    constructor() {}
    setSpinner(spinner: LoadingSpinnerComponent) {
        this.spinner = spinner;
    }
    setMessage(message, task?) {
        if (this.spinner) {
            // if(this.processService.tasks.length){
            //   this.processService.tasks[0].status = message;
            // }
            this.spinner.loadingMessage = message;
            this.spinner.loadingTask = task;
        }
    }
    showDrag() {
        if (this.spinner) {
            this.spinner.isLoading = false;
            this.spinner.isActive = true;
        }
    }
    showLoader() {
        if (this.spinner) {
            this.spinner.isLoading = this.spinner.isActive = true;
        }
    }
    hideLoader() {
        if (this.spinner) {
            this.spinner.isLoading = this.spinner.isActive = false;
            this.spinner.loadingTask = null;
        }
    }
    setupConfirm() : Promise<void> {
        return new Promise((resolve, reject) => {
            this.spinner.isConfirm = true;
            this.spinner.confirmResolve = resolve;
            this.spinner.confirmReject = reject;
        });
    }
}
