import * as tc from "telemetryclient-team-services-extension";

export const telemetrySettings: tc.TelemetryClientSettings = {
    key: "__INSTRUMENTATIONKEY__",
    extensioncontext: "ImportExportKanban",
    disableTelemetry: "false",
    disableAjaxTracking: "false",
    enableDebug: "false",
};

export class Telemetry {
    public static Client(): any {
        return tc.TelemetryClient.getClient(telemetrySettings);
    }
}
