import * as tc from "TelemetryClient";

export const telemetrySettings: tc.TelemetryClientSettings = {
    key: "__INSTRUMENTATIONKEY__",
    extensioncontext: "ImportExportKanban"
};

export class Telemetry {
    public static Client(): any {
        return tc.TelemetryClient.getClient(telemetrySettings);
    }
}