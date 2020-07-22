import * as Config from '../config.json';

export class AuthService {
    constructor() { }

    static getInstance() {
        return this._instance || (this._instance = new this());
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

    get emailRegex() {
        return /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/;
    }
}