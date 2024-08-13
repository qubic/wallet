import { Injectable } from '@angular/core';
import { interval, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class TimeService {

  constructor() { }

  getTimeToNewEpoch(): Observable<{ days: number, hours: number, minutes: number }> {
    return interval(1000).pipe(
      map(() => {
        const now = new Date();
        const currentDay = now.getUTCDay();
        let daysToAdd = 3 - currentDay;
        if (daysToAdd < 0) {
          daysToAdd += 7;
        }
        const nextWednesday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysToAdd, 12, 0, 0));
        const diff = nextWednesday.getTime() - now.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        return { days, hours, minutes };
      })
    );
  }
}
