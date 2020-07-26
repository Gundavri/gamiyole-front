export class DeviceDetectorService {
    constructor() {
    }

    static get isBrowser() {
        return typeof window !== 'undefined';
    }

    static get latUni() {
        return 41.805531179838034;
    }

    static get lngUni() {
        return 44.76849954114065;
    }

    static get maxAllowedDist() {
        return 0.0025;
    }
}