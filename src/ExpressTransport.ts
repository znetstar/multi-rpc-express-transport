import { Transport, Serializer, ServerSideTransport, ClientRequest, Response } from "multi-rpc-common";
import { Server as HTTPServer, IncomingMessage, ServerResponse } from "http";
import { Server as HTTPSServer } from "https";
import * as express from 'express';
import * as bodyParser from 'body-parser';
import { Router } from "express";

/**
 * A transport that uses HTTP as its protocol.
 */
export default class ExpressTransport extends Transport implements ServerSideTransport {
    constructor(protected serializer: Serializer, public router: Router = Router()) {
        super(serializer);
    }

    /**
     * This method will be used validate the "origin" header in each incoming WebSocket request.
     * This function can be replaced to implement a custom validation.
     * By default will return true, allowing all origins.
     * @param origin - The "origin" header for each request.
     */
    public authorizeOrigin(origin: string): boolean {
        return true;
    }

    /**
     * Sets up the HTTP(s) Server (sets up the routes).
     * @ignore
     */
    protected setupHTTPServer(): void {
        this.server.on("request", (req: IncomingMessage, res: ServerResponse) => {
            const origin = req.headers.origin && req.headers.origin[0];

            if (!this.authorizeOrigin(origin)) {
                res.writeHead(403, "Invalid origin");
                res.end();
                return;
            }
            

            if (typeof(this.endpoint) === 'string' && req.url !== this.endpoint) {
                res.writeHead(404, `${req.url} does not exist`);
                return;
            }

            const data: Array<Buffer> = [];

            req.on("data", (chunk) => {
                data.push(chunk);
            });

            req.on("end", () => {
                const rawReq = new Uint8Array(Buffer.concat(data));
                const clientRequest = new ClientRequest(Transport.uniqueId(), (response?: Response) => {
                    const headers: any = {};

                    if (origin) {
                        headers["Access-Control-Allow-Origin"] = origin;
                    }

                    if (response) {
                        headers["Content-Type"] = this.serializer.content_type;
                        
                        res.writeHead(200, headers);
                        res.end(this.serializer.serialize(response));
                    } else {
                        res.writeHead(204, headers);
                        res.end();
                    }
                });

                this.receive(rawReq, clientRequest);
            });
        });
    }
    
    /**
     * Begins listening for connections using the HTTP(S) Server.
     * If a server was passed in the constructor, this function does nothing.
     * @async
     */
    public async listen(): Promise<void> {
        if (this.server)
            return;

        
        this.server = new HTTPServer();
        this.serverCreated = true;
        this.setupHTTPServer();

        return new Promise<void>((resolve, reject) => {
            const listenError = (error: Error) => {
                reject(error);
            };

            this.server.once('error', listenError);

            const listenSuccess = () => {
                this.server.off('error', listenError);
                resolve();
            };

            if (typeof(this.port) === 'number') 
                this.server.listen(this.port, this.host, listenSuccess);
            else
                this.server.listen(this.urlOrPath, listenSuccess);
        });
    }

    /**
     * Closes the HTTP server.
     * @async
     */
    public async close(code?: number, reason?: string): Promise<void> {
        if (this.server && this.serverCreated) {
            this.server.close();
        } 
    }
}