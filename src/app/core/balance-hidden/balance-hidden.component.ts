import { AfterViewInit, Component, HostListener } from '@angular/core';

@Component({
  selector: 'qli-balance-hidden',
  templateUrl: './balance-hidden.component.html',
  styleUrls: ['./balance-hidden.component.scss']
})
export class BalanceHiddenComponent  implements AfterViewInit {  
  public isBalanceHidden: boolean = false;

  ngAfterViewInit(): void {
    this.isBalanceHidden = localStorage.getItem("balance-hidden") == '1' ? true : false;
    if (this.isBalanceHidden) {
      this.balanceHidden();
    }
  }

  @HostListener('document:keydown.escape', ['$event'])
  handleEscapeKey(event: KeyboardEvent): void {
    this.balanceHidden();
  }
  
  
  /**
   * Toggles the visibility of balance-related elements on the page.
   * When the balance is hidden, the elements with the 'disable-area' class are blurred.
   * The hidden state is persisted in the browser's localStorage.
   */
  balanceHidden(): void {
    const disableAreasElements = document.querySelectorAll('.disable-area') as NodeListOf<HTMLElement>;
    disableAreasElements.forEach((area: HTMLElement) => {
      if (area.classList.contains('blurred')) {
        area.classList.remove('blurred');
        this.isBalanceHidden = false;
      } else {
        area.classList.add('blurred');
        this.isBalanceHidden = true;
      }
      localStorage.setItem("balance-hidden", this.isBalanceHidden ? '1' : '0');
    });
  }
}
