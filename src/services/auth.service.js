import * as Config from '../config.json';
import { DeviceDetectorService } from './deviceDetectorService.service';
import { navigate } from 'svelte-routing';

export class AuthService {
    constructor() {
    }

    static getInstance() {
        return this._instance || (this._instance = new this());
    }

    async validateTokenAndNavigate() {
        if(!this.getToken()) {
            navigate('/login');
            return false;
        } else {
            const res = await this.validateToken();
            if(res.error) {
                navigate('/login');
            }
            return !res.error;
        }
    }

    async login(email, password) {
        const res = await (await fetch(Config.baseAPIUrl + '/login', {
            method: 'POST',
            body: JSON.stringify({
                email,
                password
            })
        })).json();
        return res;
    }

    async register(name, surname, email, password) {
        const res = await (await fetch(Config.baseAPIUrl + '/register', {
            method: 'POST',
            body: JSON.stringify({
                name,
                surname,
                email,
                password
            })
        })).json();
        return res;
    }

    async validateToken() {
        const res = await (await fetch(Config.baseAPIUrl + '/validate-token?token=' + this.getToken())).json();
        return res;
    }

    setToken(token) {
        if(DeviceDetectorService.isBrowser) {
            localStorage.setItem(this.TOKEN_KEY, token);
        }
    }

    getToken() {
        if(DeviceDetectorService.isBrowser) {
            return localStorage.getItem(this.TOKEN_KEY);
        }
    }

    deleteToken() {
        if(DeviceDetectorService.isBrowser) {
            localStorage.removeItem(this.TOKEN_KEY);
        }
    }

    get emailRegex() {
        return /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/;
    }

    get TOKEN_KEY() {
        return 'authTokenKey';
    }
}