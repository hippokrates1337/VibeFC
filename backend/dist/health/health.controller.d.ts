export declare class HealthController {
    constructor();
    check(): Promise<{
        status: string;
        timestamp: string;
    }>;
}
