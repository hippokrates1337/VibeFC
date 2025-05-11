import { Request } from 'express';
export declare class TestAuthController {
    testAuth(req: Request): {
        user: any;
        authHeader: string | undefined;
    };
}
