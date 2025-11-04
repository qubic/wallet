import { Pipe, PipeTransform } from '@angular/core';
import { DatePipe } from '@angular/common';

/**
 * Custom pipe for formatting dates with both date and time
 * Usage: {{ date | dateTime }}
 * Output: "Jan 1, 2025 14:30:45"
 */
@Pipe({
  name: 'dateTime'
})
export class DateTimePipe implements PipeTransform {
  private datePipe: DatePipe = new DatePipe('en-US');

  transform(value: Date | string | number | null | undefined): string {
    if (!value) {
      return '';
    }

    const dateStr = this.datePipe.transform(value, 'mediumDate');
    const timeStr = this.datePipe.transform(value, 'HH:mm:ss');

    return `${dateStr} ${timeStr}`;
  }
}
