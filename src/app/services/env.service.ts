import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class EnvironmentService {

  public isElectron = true;

  constructor() {
    this.isElectron = this.detectIsElectron();
   }

   private detectIsElectron() {
    // Renderer process
    if (typeof window !== 'undefined' && typeof window.process === 'object' && (<any>window).process.type === 'renderer') {
        return true;
    }

    // Main process
    if (typeof process !== 'undefined' && typeof process.versions === 'object' && !!process.versions['electron']) {
        return true;
    }

    // Detect the user agent when the `nodeIntegration` option is set to true
    if (typeof navigator === 'object' && typeof navigator.userAgent === 'string' && navigator.userAgent.indexOf('Electron') >= 0) {
        return true;
    }

    return false;
}
}
