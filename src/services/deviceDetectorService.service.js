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

    static isAtUni() {
        let lat, lng;
        navigator.geolocation.getCurrentPosition(pos => {
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
    
          const distanceFromCenter = Math.sqrt(
            Math.pow((lat - DeviceDetectorService.latUni)*2, 2) +
              Math.pow(lng - DeviceDetectorService.lngUni, 2)
          );
    
          return (distanceFromCenter <= DeviceDetectorService.maxAllowedDist) 
        });
      }

    static get maxAllowedDist() {
        return 0.0025;
    }
}