// ---------------------------------------------------------------------
// <copyright file="TelemetryClient.ts">
//    This code is licensed under the MIT License.
//    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF
//    ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED
//    TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
//    PARTICULAR PURPOSE AND NONINFRINGEMENT.
// </copyright>
// <summary>Application Insights Telemetry Client Class</summary>
// ---------------------------------------------------------------------

import { AppInsights } from "applicationinsights-js";

export class TelemetryClient {

    private static TestingKey = "";
    private static DevLabs = "__INSTRUMENTATIONKEY__";

    private static telemetryClient: TelemetryClient;

    private static ExtensionContext: string = "ImportExportKanban";

    private IsAvailable: boolean = true;

    public static getClient(): TelemetryClient {

        if (!this.telemetryClient) {
            this.telemetryClient = new TelemetryClient();
            this.telemetryClient.Init();
        }

        return this.telemetryClient;

    }

    private Init() {
        let config: any = {
            instrumentationKey: TelemetryClient.DevLabs
        };

        try {
            let webContext = VSS.getWebContext();
            this.IsAvailable = webContext.account.uri.indexOf("visualstudio.com") > 0;

            if (this.IsAvailable) {
                AppInsights.downloadAndSetup(config);
                AppInsights.setAuthenticatedUserContext(webContext.user.id, webContext.collection.id);
            }
        }
        catch (e) {
            console.log(e);
        }
    }

    public trackPageView(name?: string, url?: string, properties?: { [name: string]: string; }, measurements?: { [name: string]: number; }, duration?: number) {
        try {
            if (this.IsAvailable) {
                AppInsights.trackPageView(TelemetryClient.ExtensionContext + "." + name, url, properties, measurements, duration);
                AppInsights.flush();
            }
        }
        catch (e) {
            console.log(e);
        }
    }

    public trackEvent(name: string, properties?: { [name: string]: string; }, measurements?: { [name: string]: number; }) {
        try {
            if (this.IsAvailable) {
                AppInsights.trackEvent(TelemetryClient.ExtensionContext + "." + name, properties, measurements);
                AppInsights.flush();
            }
        }
        catch (e) {
            console.log(e);
        }
    }

    public trackException(exceptionMessage: string, handledAt?: string, properties?: { [name: string]: string; }, measurements?: { [name: string]: number; }) {
        try {
            if (this.IsAvailable) {
                console.error(exceptionMessage);

                let error: Error = {
                    name: TelemetryClient.ExtensionContext + "." + handledAt,
                    message: exceptionMessage
                };

                AppInsights.trackException(error, handledAt, properties, measurements);
                AppInsights.flush();
            }
        }
        catch (e) {
            console.log(e);
        }
    }

    public trackMetric(name: string, average: number, sampleCount?: number, min?: number, max?: number, properties?: { [name: string]: string; }) {
        try {
            if (this.IsAvailable) {
                AppInsights.trackMetric(TelemetryClient.ExtensionContext + "." + name, average, sampleCount, min, max, properties);
                AppInsights.flush();
            }
        }
        catch (e) {
            console.log(e);
        }
    }

}