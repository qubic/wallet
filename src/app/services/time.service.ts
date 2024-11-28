import { Injectable } from '@angular/core';
import { interval, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ZonedDateTime, ZoneOffset, Duration, DayOfWeek } from '@js-joda/core';

@Injectable({
  providedIn: 'root',
})
export class TimeService {
  constructor() {}

  getTimeToNewEpoch(): Observable<{ days: number; hours: number; minutes: number }> {
    return interval(1000).pipe(
      map(() => {
        const now = ZonedDateTime.now(ZoneOffset.UTC);
        const currentDay = now.dayOfWeek().value(); // Monday = 1
        const currentHour = now.hour();

        // Calculate days to next Wednesday
        let daysToAdd = DayOfWeek.WEDNESDAY.value() - currentDay; // Wednesday = 3
        if (daysToAdd < 0 || (daysToAdd === 0 && currentHour >= 12)) {
          // If it's already Wednesday after 12:00 UTC, target the next Wednesday
          daysToAdd += 7;
        }

        // Calculate next Wednesday at 12:00 UTC
        const nextWednesday = now.plusDays(daysToAdd).withHour(12).withMinute(0).withSecond(0).withNano(0);
        const duration = Duration.between(now, nextWednesday);

        // Convert difference to days, hours, and minutes
        const days = Math.floor(duration.toDays());
        const hours = duration.toHours() % 24;
        const minutes = duration.toMinutes() % 60;

        return { days, hours, minutes };
      })
    );
  }
}
