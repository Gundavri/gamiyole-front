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
                result.isOwn = true;
            }
            return result.user;
        } else return; 
    }

    async updateUserProfile(user, authService) {
        if(DeviceDetectorService.isBrowser){
            let tmpUser = Object.assign({}, user);
            tmpUser.token = authService.getToken();
            const response = await fetch(`${Config.baseAPIUrl}/profile-edit`, {
                method: "POST",
                body: JSON.stringify({
                    token: tmpUser.token,
                    name: tmpUser.name,
                    phone: tmpUser.phone,
                    surname: tmpUser.surname
                })
            });
            return;
        }
    }
}