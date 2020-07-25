export class DeviceDetectorService {
    constructor() {
    }

    static isBrowser() {
        return typeof window !== 'undefined';
    }
}