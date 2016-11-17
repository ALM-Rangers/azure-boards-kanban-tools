/// <reference path="../typings/index.d.ts" />

import WorkClient = require("TFS/Work/RestClient");
import CoreClient = require("TFS/Core/RestClient");
import WorkContracts = require("TFS/Work/Contracts");
import CoreContracts = require("TFS/Core/Contracts");

export interface IBoardCardSettings {
    boardName: string;
    cardSettings: WorkContracts.BoardCardSettings;
}

export interface IBoardSettings {
    version: string;
    name: string;
    cardSettings: IBoardCardSettings[];
}

export class BoardConfiguration {
    public process(): void {
        VSS.getService<IExtensionDataService>(VSS.ServiceIds.ExtensionData).then((eds) => {
        });
    }

    public export(boardName: string, settings: IBoardSettings): IPromise<boolean> {
        let self = this;
        let defer = Q.defer<boolean>();

        VSS.getService<IExtensionDataService>(VSS.ServiceIds.ExtensionData).then((eds) => {
        });

        return defer.promise;
    }

    public getCurrentConfiguration(): IPromise<IBoardSettings> {
        let self = this;
        let defer = Q.defer<IBoardSettings>();
        let workClient: WorkClient.WorkHttpClient2_3;
        let context = this.getTeamContext();

        workClient = WorkClient.getClient();

        let boardCards: IBoardCardSettings[] = new Array();
        let cardPromises: IPromise<WorkContracts.BoardCardSettings>[] = new Array();
        workClient.getProcessConfiguration(context.project).then((process) => {
            process.portfolioBacklogs.forEach((backlog) => {
                let oldCardSettings = workClient.getBoardCardSettings(context, backlog.name);
                cardPromises.push(oldCardSettings);
            });
        })
        Q.all(cardPromises).then((promise) => {
            promise.forEach((board) => {
            })
        });
        return defer.promise;
    }

    private getTeamContext(): CoreContracts.TeamContext {
        let webContext = VSS.getWebContext();
        let teamContext: CoreContracts.TeamContext = {
            project: webContext.project.name,
            projectId: webContext.project.id,
            team: webContext.team.name,
            teamId: webContext.team.id
        }
        return teamContext;
    }
}