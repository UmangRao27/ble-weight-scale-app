import { Injectable } from '@angular/core';
import { Network } from '@capacitor/network';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class NetworkService {
  init() {
    throw new Error('Method not implemented.');
  }

  isOnline$ = new BehaviorSubject<boolean>(true);

  constructor() {
    Network.getStatus().then(s => this.isOnline$.next(s.connected));
    Network.addListener('networkStatusChange', s => {
      this.isOnline$.next(s.connected);
    });
  }
}
