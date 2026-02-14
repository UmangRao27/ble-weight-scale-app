import { Component } from '@angular/core';
import { BleService } from '../services/ble';
import { BluetoothService } from '../services/bluetooth';
import { NetworkService } from '../services/network';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  standalone:false
})
export class HomePage {
  isEnablingBluetooth = false;

  constructor(
    public ble: BleService,
    public bluetooth: BluetoothService,
    public network: NetworkService
  ) {}

  async enableBluetoothFromApp(): Promise<void> {
    if (this.isEnablingBluetooth) return;
    this.isEnablingBluetooth = true;

    try {
      await this.bluetooth.enableBluetooth();
    } finally {
      this.isEnablingBluetooth = false;
    }
  }

  captureWeight(): void {
    this.ble.captureFinalWeight();
  }
}
