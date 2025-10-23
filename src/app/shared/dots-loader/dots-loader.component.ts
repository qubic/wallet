import { Component } from '@angular/core';
import { TranslocoService } from '@ngneat/transloco';

@Component({
  selector: 'app-dots-loader',
  templateUrl: './dots-loader.component.html',
  styleUrls: ['./dots-loader.component.scss']
})
export class DotsLoaderComponent {
  constructor(private transloco: TranslocoService) {}

  t(key: string): string {
    return this.transloco.translate(key);
  }
}
