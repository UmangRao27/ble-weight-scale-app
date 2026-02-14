import { Injectable, OnDestroy } from '@angular/core';
import { BLE } from '@awesome-cordova-plugins/ble/ngx';
import { BehaviorSubject, Subscription } from 'rxjs';
import { BleModel } from '../models/ble-model.model';

@Injectable({
  providedIn: 'root'
})
export class BleService implements OnDestroy {

  // Device State
  deviceData$ = new BehaviorSubject<BleModel>({
    status: 'DISCONNECTED'
  });

  isScanning$ = new BehaviorSubject<boolean>(false);
  isConnected$ = new BehaviorSubject<boolean>(false);
  scanCompleted$ = new BehaviorSubject<boolean>(false);
  liveWeight$ = new BehaviorSubject<number | null>(null);
  finalWeight$ = new BehaviorSubject<number | null>(null);

  // Internals
  private scanSub: Subscription | null = null;
  private connectSub: Subscription | null = null;
  private notifySub: Subscription | null = null;
  private scanTimer: ReturnType<typeof setTimeout> | null = null;
  private connectTimer: ReturnType<typeof setTimeout> | null = null;
  private currentDeviceId: string | null = null;
  private connectingInFlight = false;
  private readServiceId: string | null = null;
  private readCharacteristicId: string | null = null;

  private readonly SCAN_TIMEOUT = 10000;
  private readonly CONNECT_TIMEOUT = 12000;
  private readonly TARGET_DEVICE = 'SMBLEWS';

  constructor(private ble: BLE) {}

  startScan() {
    if (this.isScanning$.value || this.isConnected$.value || this.connectingInFlight) {
      console.log('[BLE] Scan ignored');
      return;
    }

    console.log('[BLE] Scan started');

    this.scanCompleted$.next(false);
    this.isScanning$.next(true);
    this.deviceData$.next({ status: 'SCANNING' });

    this.scanSub?.unsubscribe();
    this.scanSub = null;

    this.scanSub = this.ble.startScan([]).subscribe({
      next: device => {
        if (!this.isTargetDevice(device) || this.connectingInFlight) return;

        console.log('[BLE] Target device found');

        this.stopScan();

        this.deviceData$.next({
          name: device.name,
          id: device.id,
          rssi: device.rssi,
          status: 'CONNECTING'
        });

        // Placeholder until real weight notifications are wired.
        this.liveWeight$.next(null);

        this.connect(device.id);
      },
      error: err => {
        console.log('[BLE] Scan error', err);
        this.stopScan();
        this.scanCompleted$.next(true);
        this.connectingInFlight = false;
      }
    });

    this.scanTimer = setTimeout(() => {
      if (!this.isConnected$.value) {
        console.log('[BLE] Scan timeout');
        this.stopScan();
        this.scanCompleted$.next(true);
        this.deviceData$.next({ status: 'DISCONNECTED' });
      }
    }, this.SCAN_TIMEOUT);
  }

  stopScan() {
    if (!this.isScanning$.value) return;

    console.log('[BLE] Scan stopped');

    try {
      this.ble.stopScan();
    } catch {}

    this.scanSub?.unsubscribe();
    this.scanSub = null;

    if (this.scanTimer) {
      clearTimeout(this.scanTimer);
      this.scanTimer = null;
    }

    this.isScanning$.next(false);
  }

  connect(deviceId: string) {
    if (this.isConnected$.value || this.connectingInFlight) return;

    console.log('[BLE] Connecting to', deviceId);
    this.connectingInFlight = true;
    this.currentDeviceId = deviceId;
    const current = this.deviceData$.value;
    this.deviceData$.next({ ...current, id: deviceId, status: 'CONNECTING' });

    this.connectSub?.unsubscribe();
    this.connectSub = null;
    if (this.connectTimer) {
      clearTimeout(this.connectTimer);
      this.connectTimer = null;
    }

    const startFreshConnect = () => {
      this.connectSub = this.ble.connect(deviceId).subscribe({
        next: (data: any) => {
          if (!this.connectingInFlight && this.isConnected$.value) return;

          console.log('[BLE] Connected');
          this.stopScan();
          this.isConnected$.next(true);
          this.connectingInFlight = false;
          this.scanCompleted$.next(false);
          if (this.connectTimer) {
            clearTimeout(this.connectTimer);
            this.connectTimer = null;
          }
          const current = this.deviceData$.value;
          this.deviceData$.next({ ...current, status: 'CONNECTED', id: deviceId });

          this.resolveReadCharacteristic(data);
          this.startWeightNotifications();
        },
        error: err => {
          console.log('[BLE] Connect/Disconnected event', err);
          this.connectingInFlight = false;
          this.handleDisconnect();
        }
      });

      this.connectTimer = setTimeout(() => {
        if (this.isConnected$.value) return;
        console.log('[BLE] Connect timeout');
        this.connectingInFlight = false;
        this.handleDisconnect();
      }, this.CONNECT_TIMEOUT);
    };

    Promise.resolve(this.ble.disconnect(deviceId))
      .catch(() => null)
      .finally(() => {
        setTimeout(() => startFreshConnect(), 250);
      });
  }

  disconnect() {
    console.log('[BLE] Manual disconnect');

    if (this.currentDeviceId) {
      try {
        this.ble.disconnect(this.currentDeviceId);
      } catch {}
      this.currentDeviceId = null;
    }

    this.connectSub?.unsubscribe();
    this.connectSub = null;
    this.notifySub?.unsubscribe();
    this.notifySub = null;
    if (this.connectTimer) {
      clearTimeout(this.connectTimer);
      this.connectTimer = null;
    }

    this.stopScan();
    this.connectingInFlight = false;
    this.isConnected$.next(false);
    this.deviceData$.next({ status: 'DISCONNECTED' });
    this.readServiceId = null;
    this.readCharacteristicId = null;
    this.liveWeight$.next(null);
    this.finalWeight$.next(null);
  }

  private handleDisconnect() {
    this.connectSub?.unsubscribe();
    this.connectSub = null;
    this.notifySub?.unsubscribe();
    this.notifySub = null;
    if (this.connectTimer) {
      clearTimeout(this.connectTimer);
      this.connectTimer = null;
    }
    this.connectingInFlight = false;
    this.currentDeviceId = null;
    this.isConnected$.next(false);
    this.deviceData$.next({ status: 'DISCONNECTED' });

    setTimeout(() => {
      if (!this.isConnected$.value) {
        console.log('[BLE] Attempting auto-rescan...');
        this.startScan();
      }
    }, 2000);
  }

  retryScan() {
    if (this.isConnected$.value) return;

    this.stopScan();
    this.scanCompleted$.next(false);
    this.connectingInFlight = false;

    setTimeout(() => {
      this.startScan();
    }, 500);
  }

  captureFinalWeight() {
    this.finalWeight$.next(this.liveWeight$.value);
  }

  private resolveReadCharacteristic(peripheralData: any) {
    const characteristics = peripheralData?.characteristics;

    if (!Array.isArray(characteristics)) {
      console.log('[BLE] No characteristics');
      return;
    }

    console.log('---- ALL CHARACTERISTICS ----');

    characteristics.forEach((ch: any) => {
      console.log(
        'Service:',
        ch.service,
        'Char:',
        ch.characteristic,
        'Props:',
        ch.properties
      );
    });

    console.log('------------------------------');

    // 🔥 Now select UART notify characteristic manually
    const notifyChar = characteristics.find((ch: any) => {
      return (
        ch.service?.toLowerCase() === 'fff0' &&
        ch.characteristic?.toLowerCase() === 'fff1'
      );
    });

    if (!notifyChar) {
      console.log('[BLE] UART notify characteristic not found');
      return;
    }

    this.readServiceId = notifyChar.service;
    this.readCharacteristicId = notifyChar.characteristic;

    console.log(
      '[BLE] Using characteristic:',
      this.readServiceId,
      this.readCharacteristicId
    );
  }



  private startWeightNotifications() {
    if (!this.currentDeviceId || !this.readServiceId || !this.readCharacteristicId) return;

    this.notifySub?.unsubscribe();
    this.notifySub = this.ble.startNotification(
      this.currentDeviceId,
      this.readServiceId,
      this.readCharacteristicId
    ).subscribe({
      next: payload => {
        const buffer = this.extractBuffer(payload);
        if (!buffer) return;

        const weight = this.decodeWeight(buffer);
        if (weight === null) return;
        this.liveWeight$.next(weight);
      },
      error: err => console.log('[BLE] Notification error', err)
    });
  }

  private decodeWeight(buffer: ArrayBuffer): number | null {
    const bytes = new Uint8Array(buffer);

    // Convert ASCII bytes to string
    const text = Array.from(bytes)
      .filter(b => b >= 32 && b <= 126) // printable ASCII only
      .map(b => String.fromCharCode(b))
      .join('')
      .trim();

    if (!text) return null;

    // Extract number (handles 76.94, -2.34 etc)
    const match = text.match(/-?\d+(\.\d+)?/);
    if (!match) return null;

    const weight = parseFloat(match[0])/100;

    if (isNaN(weight)) return null;

    console.log("ASCII:", text, "KG:", weight);

    return weight;
  }




  private decodeAsciiWeight(bytes: Uint8Array): number | null {
    const text = Array.from(bytes)
      .filter(v => v >= 32 && v <= 126)
      .map(v => String.fromCharCode(v))
      .join('')
      .trim();
    if (!text) return null;

    const match = text.match(/-?\d+(\.\d+)?/);
    if (!match) return null;
    const parsed = Number(match[0]);
    return Number.isNaN(parsed) ? null : parsed;
  }

  private isPlausibleWeight(value: number): boolean {
    if (!Number.isFinite(value)) return false;
    // Acceptable range for this use case; tune if needed.
    return value >= 0 && value <= 500;
  }

  private extractBuffer(payload: any): ArrayBuffer | null {
    if (payload instanceof ArrayBuffer) return payload;
    if (Array.isArray(payload) && payload[0] instanceof ArrayBuffer) return payload[0];
    if (payload?.buffer instanceof ArrayBuffer) return payload.buffer as ArrayBuffer;
    return null;
  }

  private toPropertyList(raw: any): string[] {
    if (Array.isArray(raw)) return raw.map(v => `${v}`.toLowerCase());
    if (typeof raw === 'string') return [raw.toLowerCase()];
    return [];
  }

  private isTargetDevice(device: any): boolean {
    const rawName = `${device?.name || device?.localName || ''}`.trim();
    if (!rawName) return false;

    const normalizedName = rawName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const normalizedTarget = this.TARGET_DEVICE.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

    return normalizedName.includes(normalizedTarget);
  }

  ngOnDestroy() {
    console.log('[BLE] Service destroyed');
    this.stopScan();
    this.disconnect();
    this.scanSub?.unsubscribe();
    this.connectSub?.unsubscribe();
    this.notifySub?.unsubscribe();
    if (this.connectTimer) {
      clearTimeout(this.connectTimer);
      this.connectTimer = null;
    }
  }
}
