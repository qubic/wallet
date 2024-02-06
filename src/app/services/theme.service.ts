import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {

  public isDarkTheme = false;

  constructor() {
    var currentTheme = localStorage.getItem("theme");
    this.isDarkTheme =  !currentTheme || currentTheme== 'dark';
   }

   public toggleTheme(): void {
      this.isDarkTheme = !this.isDarkTheme;
      localStorage.setItem("theme", this.isDarkTheme ? 'dark': 'light');             
      window.location.reload();
   }
}
