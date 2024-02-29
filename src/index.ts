import express from 'express';
import {Request} from "express";
import WebSocket from 'ws';
import {randomUUID} from 'crypto';

(async () => {
    if (!process.env.KEY) {
        throw Error(`KEY environment variable not set`);
    }

    const app = express();
    const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
    const hostname = process.env.HOSTNAME || '0.0.0.0';
    const expectedKey = process.env.KEY;

    const secureKeysMap = new Map<string, 'publisher' | 'subscriber'>();
    const publisherSockets = new Set<WebSocket>();
    const subscriberSockets = new Set<WebSocket>();

    function generateSecureUrl(request: Request, role: 'publisher' | 'subscriber'): string | null {
        const isKeyValid = request.headers['secret-key'] === expectedKey;
        if (!isKeyValid) {
            return null;
        }

        const publicDomainAddress = (
            request.headers['public-domain-address']
            || `${hostname}:${port}`
        );

        const secureKey = randomUUID();
        secureKeysMap.set(secureKey, role);

        return `ws://${publicDomainAddress}?secureKey=${secureKey}`;
    }

    function afterConnectOrDisconnect() {
        console.log({
            publishers: publisherSockets.size,
            subscribers: subscriberSockets.size,
        });
    }

    app.get('/request-subscriber-url', (req, res, next) => {
        const secureUrl = generateSecureUrl(req, 'subscriber');
        if (!secureUrl) {
            return res.status(403).send({
                error: 'Unauthorized',
            });
        }

        res.status(200).send({
            secureUrl,
        });
    });

    app.get('/request-publisher-url', (req, res, next) => {
        const secureUrl = generateSecureUrl(req, 'publisher');
        if (!secureUrl) {
            return res.status(403).send({
                error: 'Unauthorized',
            });
        }

        res.status(200).send({
            secureUrl,
        });
    });

    const server = app.listen(port, hostname, () => {
        console.log(`Server is running at http://${hostname}:${port}`);
    });

    const webSocketServer = new WebSocket.WebSocketServer({
        server,
    });

    webSocketServer.on('connection', (ws, request) => {
        if (!request.url) {
            ws.close();
            return;
        }

        const {secureKey} = parseUrl(request.url);
        const role = secureKeysMap.get(secureKey);
        if (!secureKey || !role) {
            ws.close();
            return;
        }

        secureKeysMap.delete(secureKey);
        if (role === 'publisher') {
            publisherSockets.add(ws);
        } else {
            subscriberSockets.add(ws);
        }

        ws.on('message', data => {
            if (role === 'publisher') {
                subscriberSockets.forEach(subscriber => subscriber.send(data));
                ws.send('OK');
            }
        });

        ws.on('close', () => {
            if (role === 'publisher') {
                publisherSockets.delete(ws);
            } else {
                subscriberSockets.delete(ws);
            }

            afterConnectOrDisconnect();
        });

        afterConnectOrDisconnect();
    });
})();

function parseUrl(url: string): any {
    return url
        .substring(url.indexOf('?') + 1)
        .split('&')
        .map(val => val.split('='))
        .map(([key, value]) => ({[key]: value}))
        .reduce((prev, curr) => ({...prev, ...curr}), {});
}
