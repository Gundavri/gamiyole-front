import {AuthService} from "./auth.service"

export class MatcherService {
    constructor() {

    }

    static getInstance() {
        return this._instance || (this._instance = new this());
    }

    connect(func) {
        return new Promise((res, rej) => {
            this.ws = new WebSocket("ws://localhost:8082/match/"+ AuthService.getInstance().getToken());
            this.ws.onmessage = func;
            this.ws.onopen = function (event) {
                res();   
            }
            this.ws.onerror = function (event) {
                rej();
            }
        })
    }

    send(obj) {
        var json = JSON.stringify(obj);
        this.ws.send(json);
    }
    
}