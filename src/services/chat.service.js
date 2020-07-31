import { AuthService } from "../services/auth.service";


export class ChatService {
    constructor() {

    }

    static getInstance() {
        return this._instance || (this._instance = new this());
    }

    connect(username, func) {        
        return new Promise((res, rej) => {
            this.ws = new WebSocket("ws://localhost:8082/chat/" + username + "/" +  AuthService.getInstance().getToken());
            this.ws.onmessage = func;
            this.ws.onopen = function (event) {
                res();   
            }
            this.ws.onerror = function (event) {
                rej();
            }
        })
    }
    
    send(content, to) {
        var json = JSON.stringify({
            "to": to,
            "content": content
        });
        this.ws.send(json);
        // log.innerHTML += "Me : " + content + "\n"
    }
    
}