import * as Config from '../config.json';

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
        const res = await (await fetch(`${Config.googleAPIUrl}place/autocomplete/json?input=${place}&key=${GoogleService.apiKey}`)).json();
        return res;
    }
}