import * as Config from '../config.json';
import { DeviceDetectorService } from './deviceDetectorService.service';

export class ProfileService {
    constructor(){}

    static getInstance() {
        return this._instance || (this._instance = new this());
    }

    async getUserProfile() {
        if(DeviceDetectorService.isBrowser){
            const email = new URLSearchParams(window.location.search).get("email");
            const response = await fetch(`${Config.baseAPIUrl}/profile?email=${email}`);
            const result = await response.json();
            return result;
        } else return; 
    }
}