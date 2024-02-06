import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs/internal/BehaviorSubject';

@Injectable()
export class TokenService {

    public token = new BehaviorSubject<string>("");
   

    constructor(){
      
        const token = localStorage.getItem("token");
        if(token)
            this.token.next(token);
    }

    getCurrentToken(){
        return this.token.getValue();
    }

    nextToken(token: string){
        localStorage.setItem('token', token);
        this.token.next(token);
    }


}