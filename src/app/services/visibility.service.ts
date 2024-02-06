import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs/internal/BehaviorSubject';

@Injectable()
export class VisibilityService {

    private _isActive = new BehaviorSubject<boolean>(true);
   

    constructor(){
      
        document.addEventListener(
            "visibilitychange"
            , () => { 
              if (document.hidden) { 
                this._isActive.next(false);
              }else{
                this._isActive.next(true);
              }
            }
          );
    }

    public isActive() {
        return this._isActive;
    }

    public getCurrentIsActive(){
        return this._isActive.getValue();
    }
}