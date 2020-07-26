import * as Config from '../config.json';
import { AuthService } from '../services/auth.service';

const authService = AuthService.getInstance();

export class GoogleService {
    constructor() {

    }

    static getInstance() {
        return this._instance || (this._instance = new this());
    }

    static get apiKey() {
        return 'AIzaSyCAqZrL_-ZKPZ4q4gd_ct4SsLB39md6dd0';
    }

    async getSuggestedPlaces(place) {
        const res = await (await fetch(`${Config.baseAPIUrl}/destination-autocomplete?place=${place}&token=${authService.getToken()}`)).json();
        let toRet = [];
        for (let i = 0; i < res.predictions.length; i++) {
            toRet.push(res.predictions[i].description);
        }
        return toRet;
    }
}