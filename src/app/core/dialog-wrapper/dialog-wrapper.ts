import { Component, Inject, Renderer2 } from '@angular/core';
import { ThemeService } from 'src/app/services/theme.service';


export class QubicDialogWrapper {
    constructor(private renderer: Renderer2, public themeService: ThemeService) {
        this.renderer.removeClass(document.body, 'dark');
        this.renderer.removeClass(document.body, 'light');
        this.renderer.addClass(document.body, this.themeService.isDarkTheme ? 'darkTheme' : 'light');
    }
}