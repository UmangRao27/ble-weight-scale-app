import { Component, OnInit } from '@angular/core';
import { AlertController } from '@ionic/angular';
import { App } from '@capacitor/app';
import { Subscription } from 'rxjs';
import { auditTime, distinctUntilChanged, skip } from 'rxjs/operators';
import { NetworkService } from './services/network';
import { BluetoothService } from './services/bluetooth';
import { BleService } from './services/ble';
import { PermissionService } from './services/permission';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  standalone: false
})
export class AppComponent implements OnInit {

  private offlineAlert: HTMLIonAlertElement | null = null;
  private noBleAlert: HTMLIonAlertElement | null = null;
  private enableBtAlert: HTMLIonAlertElement | null = null;
  private flowInFlight = false;
  private btEnableInFlight = false;
  private btSub?: Subscription;

  constructor(
    public network: NetworkService,
    private bluetooth: BluetoothService,
    private ble: BleService,
    private permission: PermissionService,
    private alertCtrl: AlertController
  ) {}

  async ngOnInit() {
    this.bluetooth.initStateNotifications();
    this.attachBluetoothWatcher();

    this.network.isOnline$
      .pipe(distinctUntilChanged(), auditTime(250))
      .subscribe(async online => {
        if (!online) {
          await this.showOfflineAlert();
          this.ble.stopScan();
          this.ble.disconnect();
          await this.dismissNoBleAlert();
          return;
        }

        await this.dismissOfflineAlert();
        await this.initBleFlow();
        this.scheduleScanKickoff();
      });

    App.addListener('resume', async () => {
      if (!this.network.isOnline$.value) return;
      if (this.permission.isRequestInFlight()) return;
      await this.initBleFlow();
      this.scheduleScanKickoff();
    });

    this.ble.scanCompleted$.subscribe(done => {
      if (done && this.network.isOnline$.value && this.bluetooth.isBluetoothOn$.value && !this.ble.isConnected$.value) {
        this.showNoBleFoundAlert();
      }
    });
  }

  private async initBleFlow() {
    if (this.flowInFlight) return;
    this.flowInFlight = true;

    try {
      const granted = await this.permission.requestBlePermissions();
      if (!granted) return;

      await this.bluetooth.checkBluetooth();

      if (!this.bluetooth.isBluetoothOn$.value) {
        await this.promptEnableBluetooth();
        return;
      }

      await this.dismissNoBleAlert();

      if (!this.ble.isScanning$.value && !this.ble.isConnected$.value) {
        this.ble.startScan();
      }
    } catch (err) {
      console.error('[App] BLE Flow error:', err);
    } finally {
      this.flowInFlight = false;
    }
  }

  private scheduleScanKickoff() {
    setTimeout(() => {
      if (!this.network.isOnline$.value) return;
      if (!this.bluetooth.isBluetoothOn$.value) return;
      if (this.ble.isConnected$.value) return;
      if (this.ble.isScanning$.value) return;
      this.ble.startScan();
    }, 800);
  }

  private attachBluetoothWatcher() {
    this.btSub?.unsubscribe();

    this.btSub = this.bluetooth.isBluetoothOn$.pipe(skip(1)).subscribe(async on => {
      if (!this.network.isOnline$.value) return;

      if (on) {
        await this.dismissEnableBtAlert();
        await this.dismissNoBleAlert();
        this.ble.startScan();
      } else {
        this.ble.stopScan();
        await this.promptEnableBluetooth();
      }
    });
  }

  private async showOfflineAlert() {
    if (this.offlineAlert) return;

    this.offlineAlert = await this.alertCtrl.create({
      header: 'No Internet',
      message: 'Please connect to internet to continue.',
      backdropDismiss: false
    });

    await this.offlineAlert.present();
  }

  private async dismissOfflineAlert() {
    if (!this.offlineAlert) return;
    await this.offlineAlert.dismiss();
    this.offlineAlert = null;
  }

  private async dismissNoBleAlert() {
    if (!this.noBleAlert) return;
    await this.noBleAlert.dismiss();
    this.noBleAlert = null;
  }

  private async dismissEnableBtAlert() {
    if (!this.enableBtAlert) return;
    await this.enableBtAlert.dismiss();
    this.enableBtAlert = null;
  }

  private async promptEnableBluetooth() {
    if (!this.network.isOnline$.value) return;
    if (this.bluetooth.isBluetoothOn$.value) return;
    if (this.enableBtAlert || this.btEnableInFlight) return;

    this.enableBtAlert = await this.alertCtrl.create({
      header: 'Bluetooth Off',
      message: 'Turn on Bluetooth to continue.',
      backdropDismiss: false,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          handler: () => {
            this.enableBtAlert = null;
          }
        },
        {
          text: 'Turn On',
          handler: async () => {
            this.enableBtAlert = null;
            this.btEnableInFlight = true;
            try {
              const enabled = await this.bluetooth.enableBluetooth();
              if (!enabled) return;
              setTimeout(() => {
                if (!this.network.isOnline$.value) return;
                if (!this.bluetooth.isBluetoothOn$.value) return;
                if (this.ble.isConnected$.value || this.ble.isScanning$.value) return;
                this.ble.startScan();
              }, 0);
            } finally {
              this.btEnableInFlight = false;
            }
          }
        }
      ]
    });

    await this.enableBtAlert.present();
  }

  private async showNoBleFoundAlert() {
    if (this.noBleAlert || this.ble.isConnected$.value) return;

    this.noBleAlert = await this.alertCtrl.create({
      header: 'BLE Device Not Found',
      message: 'SMBLEWS not detected.',
      backdropDismiss: false,
      buttons: [
        {
          text: 'Stop',
          role: 'cancel',
          handler: () => {
            this.ble.stopScan();
            this.noBleAlert = null;
          }
        },
        {
          text: 'Retry',
          handler: async () => {
            this.noBleAlert = null;
            if (!this.network.isOnline$.value) return;
            await this.bluetooth.checkBluetooth();
            if (!this.bluetooth.isBluetoothOn$.value) return;
            this.ble.retryScan();
          }
        }
      ]
    });

    await this.noBleAlert.present();
  }
}
