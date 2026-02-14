import { Injectable } from '@angular/core';
import { BLE } from '@awesome-cordova-plugins/ble/ngx';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class BluetoothService {

  isBluetoothOn$ = new BehaviorSubject<boolean>(false);

  constructor(private ble: BLE) {}

  async checkBluetooth() {
    try {
      await this.ble.isEnabled();
      this.isBluetoothOn$.next(true);
      console.log('[BT] Bluetooth ON');
    } catch {
      this.isBluetoothOn$.next(false);
      console.log('[BT] Bluetooth OFF');
    }
  }

  async enableBluetooth(): Promise<boolean> {
    try {
      await this.ble.enable();
      this.isBluetoothOn$.next(true);
      console.log('[BT] User enabled Bluetooth');
      return true;
    } catch {
      console.log('[BT] User rejected Bluetooth enable');
      this.isBluetoothOn$.next(false);
      return false;
    }
  }

  initStateNotifications() {
    this.ble.startStateNotifications().subscribe(state => {
      console.log('[BT] State changed:', state);
      this.isBluetoothOn$.next(state === 'on');
    });
  }
}
