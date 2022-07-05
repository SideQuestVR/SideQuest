import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { LoadingSpinnerService } from '../loading-spinner.service';

@Component({
    selector: 'app-loading-spinner',
    templateUrl: './loading-spinner.component.html',
    styleUrls: ['./loading-spinner.component.scss'],
})
export class LoadingSpinnerComponent implements OnInit {
    isActive: boolean;
    isConfirm: boolean;
    isLoading: boolean;
    loadingMessage: string;
    loadingTask: any;
    confirmResolve: () => void;
    confirmReject: () => void;
    constructor(private spinnerService: LoadingSpinnerService, public changes: ChangeDetectorRef) {
        spinnerService.setSpinner(this);
    }
    ngOnInit() {}
    confirm() {
        if (this.confirmResolve) {
            this.confirmResolve();
        }
        this.isConfirm = false;
        this.confirmResolve = null;
        this.confirmReject = null;
        this.spinnerService.hideLoader();
    }
    cancel() {
        if (this.confirmReject) {
            this.confirmReject();
        }
        this.isConfirm = false;
        this.confirmResolve = null;
        this.confirmReject = null;
        this.spinnerService.hideLoader();
    }
}
