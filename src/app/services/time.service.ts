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
        const currentHour = now.getUTCHours();

        // Calculate days to next Wednesday
        let daysToAdd = 3 - currentDay; // 3 is Wednesday
        if (daysToAdd < 0 || (daysToAdd === 0 && currentHour >= 12)) {
          // If it's already Wednesday after 12:00 UTC, target the next Wednesday
          daysToAdd += 7;
        }

        // Calculate next Wednesday at 12:00 UTC
        const nextWednesday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysToAdd, 12, 0, 0));
        const diff = nextWednesday.getTime() - now.getTime();

        // Convert difference to days, hours, and minutes
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        return { days, hours, minutes };
      })
    );
  }
}
