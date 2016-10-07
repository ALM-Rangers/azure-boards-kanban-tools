//---------------------------------------------------------------------
// <copyright file="TelemetryClient.ts">
//    This code is licensed under the MIT License.
//    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF 
//    ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED 
//    TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A 
//    PARTICULAR PURPOSE AND NONINFRINGEMENT.
// </copyright>
// <summary>Application Insights Telemetry Client Class</summary>
//---------------------------------------------------------------------
/// <reference path="../typings/tsd.d.ts" />


class TelemetryClient {

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

    private appInsightsClient: Microsoft.ApplicationInsights.AppInsights;

    private Init() {
        var snippet: any = {
            config: {
                instrumentationKey: TelemetryClient.DevLabs
            }
        };

        try {
            var webContext = VSS.getWebContext();

            this.IsAvailable = webContext.account.uri.indexOf("visualstudio.com") > 0;

            if (this.IsAvailable) {
                var init = new Microsoft.ApplicationInsights.Initialization(snippet);
                this.appInsightsClient = init.loadAppInsights();
                this.appInsightsClient.setAuthenticatedUserContext(webContext.user.id, webContext.collection.id);
            }
        }
        catch (e) {
            this.appInsightsClient = null;
            console.log(e);
        }
    }

    public trackPageView(name?: string, url?: string, properties?: Object, measurements?: Object, duration?: number) {
        try {
            if (this.IsAvailable) {
                this.appInsightsClient.trackPageView(TelemetryClient.ExtensionContext + "." + name, url, properties, measurements, duration);
                this.appInsightsClient.flush();
            }
        }
        catch (e) {
            this.appInsightsClient = null;
            console.log(e);
        }
    }

    public trackEvent(name: string, properties?: Object, measurements?: Object) {
        try {
            if (this.IsAvailable) {
                this.appInsightsClient.trackEvent(TelemetryClient.ExtensionContext + "." + name, properties, measurements);
                this.appInsightsClient.flush();
            }
        }
        catch (e) {
            this.appInsightsClient = null;
            console.log(e);
        }
    }

    public trackException(exceptionMessage: string, handledAt?: string, properties?: Object, measurements?: Object) {
        try {
            if (this.IsAvailable) {
                console.error(exceptionMessage);

                var error: Error = {
                    name: TelemetryClient.ExtensionContext + "." + handledAt,
                    message: exceptionMessage
                };

                this.appInsightsClient.trackException(error, handledAt, properties, measurements);
                this.appInsightsClient.flush();
            }
        }
        catch (e) {
            this.appInsightsClient = null;
            console.log(e);
        }
    }

    public trackMetric(name: string, average: number, sampleCount?: number, min?: number, max?: number, properties?: Object) {
        try {
            if (this.IsAvailable) {
                this.appInsightsClient.trackMetric(TelemetryClient.ExtensionContext + "." + name, average, sampleCount, min, max, properties);
                this.appInsightsClient.flush();
            }
        }
        catch (e) {
            this.appInsightsClient = null;
            console.log(e);
        }
    }

}