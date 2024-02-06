import { HttpClient } from '@angular/common/http';
import {
  TRANSLOCO_LOADER,
  Translation,
  TranslocoLoader,
  TRANSLOCO_CONFIG,
  translocoConfig,
  TranslocoModule,
  provideTransloco
} from '@ngneat/transloco';
import { Injectable, isDevMode, NgModule } from '@angular/core';
import {
  provideTranslocoPersistLang,
} from '@ngneat/transloco-persist-lang';


@Injectable({ providedIn: 'root' })
export class TranslocoHttpLoader implements TranslocoLoader {
  constructor(private http: HttpClient) {}

  getTranslation(lang: string) {
    return this.http.get<Translation>(`assets/i18n/${lang}.json`);
  }
}

@NgModule({
  exports: [ TranslocoModule ],
  imports: [
  ],
  providers: [
    provideTranslocoPersistLang({
      storage: {
        useValue: localStorage,
      },
    }),
    provideTransloco({
      config: {
          availableLangs: ['en', 'de', 'es', 'ru', 'nl','fr','pt'],
          defaultLang: 'en',
          // Remove this option if your application doesn't support changing language in runtime.
          reRenderOnLangChange: true,
          prodMode: !isDevMode(),
      },
      loader: TranslocoHttpLoader
  }),
    { provide: TRANSLOCO_LOADER, useClass: TranslocoHttpLoader }
  ]
})
export class TranslocoRootModule {}
