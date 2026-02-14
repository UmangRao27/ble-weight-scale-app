import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { AndroidPermissions } from '@awesome-cordova-plugins/android-permissions/ngx';

@Injectable({ providedIn: 'root' })
export class PermissionService {

  private permissionGranted: boolean | null = null;
  private permissionRequestInFlight: Promise<boolean> | null = null;
  private lastDeniedAt = 0;

  constructor(private androidPermissions: AndroidPermissions) {}

  // Prevent multiple popups
  isRequestInFlight(): boolean {
    return this.permissionRequestInFlight !== null;
  }

  async requestBlePermissions(): Promise<boolean> {

    if (Capacitor.getPlatform() !== 'android') {
      return true;
    }

    if (this.permissionGranted === true) return true;
    if (this.permissionRequestInFlight) return this.permissionRequestInFlight;

    // 10s cooldown if denied
    if (this.permissionGranted === false && Date.now() - this.lastDeniedAt < 10000) {
      return false;
    }

    this.permissionRequestInFlight = (async () => {
      try {

        const perms = this.androidPermissions.PERMISSION;

        const needed = [
          perms.BLUETOOTH_SCAN,
          perms.BLUETOOTH_CONNECT
        ];

        // Check current status
        const checks = await Promise.all(
          needed.map(p => this.androidPermissions.checkPermission(p))
        );

        const missing = needed.filter((_, i) => !checks[i].hasPermission);

        if (missing.length > 0) {
          const request = await this.androidPermissions.requestPermissions(missing);

          if (!request.hasPermission) {
            this.permissionGranted = false;
            this.lastDeniedAt = Date.now();
            return false;
          }
        }

        this.permissionGranted = true;
        return true;

      } catch (error) {
        console.error('[Permission] Error:', error);
        this.permissionGranted = false;
        this.lastDeniedAt = Date.now();
        return false;

      } finally {
        this.permissionRequestInFlight = null;
      }
    })();

    return this.permissionRequestInFlight;
  }
}
