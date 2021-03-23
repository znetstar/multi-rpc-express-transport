import { Transport, Serializer, ServerSideTransport, ClientRequest, Response, Message} from "multi-rpc-common";
import {Server as HTTPServer, IncomingMessage, ServerResponse} from "http";
import {Server as HTTPSServer} from "https";
import * as express from 'express';
import * as bodyParser from 'body-parser';
import {Router} from "express";

/**
 * A transport that uses HTTP as its protocol.
 */
export default class ExpressTransport extends Transport implements ServerSideTransport {
    /**
     * Creates an express router transport
     * @param serializer - Serializer
     * @param router - Underlying express router, will create if not given.
     */
    constructor(protected serializer: Serializer, public router: Router = Router()) {
        super(serializer);

        router.use(bodyParser.raw({ type: '*/*' }));
        router.use(this.onRequest.bind(this));
    }


    protected onRequest(req: any, res: any) {
        const jsonData = (<Buffer>req.body);
        const rawReq = new Uint8Array(jsonData);
        const clientRequest = new ClientRequest(Transport.uniqueId(), (response?: Response) => {
            const headers: any = {};

            if (response) {
                headers["Content-Type"] = this.serializer.content_type;

                res.writeHead(200, headers);
                res.end(this.serializer.serialize(response));
            } else {
                res.writeHead(204, headers);
                res.end();
            }
        }, { req, res });

        this.receive(rawReq, clientRequest);
    }

    public send(message: Message): Promise<void> {
        throw new Error("Method not implemented.");
    }

    public async listen(): Promise<void> {
        return;
    }

    public async close(): Promise<void> {
        return;
    }
}