import * as Config from '../config.json';
import { DeviceDetectorService } from './deviceDetectorService.service';
import { navigate } from "svelte-routing";

export class ProfileService {
    constructor(){}

    static getInstance() {
        return this._instance || (this._instance = new this());
    }

    async getUserProfile(authService) {
        if(DeviceDetectorService.isBrowser){
            const email = new URLSearchParams(window.location.search).get("email");
            let result;
            if(email !== null){
                const response = await fetch(`${Config.baseAPIUrl}/profile?email=${email}`);
                result = await response.json();
                if (result.error !== undefined) {
                    navigate("/profile");
                    return;
                }
            } else {
                const response = await fetch(`${Config.baseAPIUrl}/profile`, {
                    method: "POST",
                    body: JSON.stringify({
                        token: authService.getToken()
                    })
                });
                result = await response.json();
            }
            return result.user;
        } else return; 
    }
}