/// <reference types="vss-web-extension-sdk" />

import WorkClient = require("TFS/Work/RestClient");
import CoreClient = require("TFS/Core/RestClient");
import WorkContracts = require("TFS/Work/Contracts");
import CoreContracts = require("TFS/Core/Contracts");
import Q = require("q");

import { getContextForTeam } from "./utils";

export interface IBacklogBoardSettings {
    boardName: string;
    cardSettings: WorkContracts.BoardCardSettings;
    cardRules: WorkContracts.BoardCardRuleSettings;
    columns: WorkContracts.BoardColumn[];
    rows: WorkContracts.BoardRow[];
}

export interface IBoardSettings {
    version: string;
    name: string;
    cardSettings: IBacklogBoardSettings[];
}

export class BoardConfiguration {
    public export(boardName: string, settings: IBoardSettings): IPromise<boolean> {
        let self = this;
        let defer = Q.defer<boolean>();

        VSS.getService<IExtensionDataService>(VSS.ServiceIds.ExtensionData).then((eds) => {
        });

        return defer.promise;
    }

    public getCurrentConfiguration(selectedTeam: string): IPromise<IBoardSettings> {
        let self = this;
        let defer = Q.defer<IBoardSettings>();

        getContextForTeam(selectedTeam).then((context) => {
            this.getTeamSettings(context).then((settings) => {
                defer.resolve(settings);
            }).catch((reason) => {
                defer.reject(reason);
            });
        }).catch((reason) => {
            defer.reject(reason);
        });

        return defer.promise;
    }

    public applySettings(targetTeam: string, settings: IBoardSettings): Q.Promise<Boolean> {
        let defer = Q.defer<Boolean>();

        getContextForTeam(targetTeam).then((context) => {
            this.getTeamSettings(context).then((oldSettings) => {
                this.applyTeamSettings(context, oldSettings, settings);
            });
        }).catch((reason) => {
            defer.reject(reason);
        });

        return defer.promise;
    }

    private getTeamSettings(context: CoreContracts.TeamContext): Q.Promise<IBoardSettings> {
        let defer = Q.defer<IBoardSettings>();
        let workClient: WorkClient.WorkHttpClient2_3 = WorkClient.getClient();

        let settings: IBoardSettings = {
            name: "Settings - " + context.team,
            version: "1.0",
            cardSettings: new Array<IBacklogBoardSettings>()
        };

        let boardCards: WorkContracts.BoardCardSettings[] = new Array();
        let backlogPromises: Q.Promise<[WorkContracts.BoardCardSettings, WorkContracts.BoardCardRuleSettings, WorkContracts.BoardColumn[], WorkContracts.BoardRow[]]>[] = new Array();
        workClient.getProcessConfiguration(context.project).then((process) => {
            process.portfolioBacklogs.forEach((backlog) => {
                let cardSettingsPromise = workClient.getBoardCardSettings(context, backlog.name);
                let cardRulesPromise = workClient.getBoardCardRuleSettings(context, backlog.name);
                let columnsPromise = workClient.getBoardColumns(context, backlog.name);
                let rowsPromise = workClient.getBoardRows(context, backlog.name);
                let settingsPromise = Q.all([cardSettingsPromise, cardRulesPromise, columnsPromise, rowsPromise]);
                settingsPromise.then(([cardSettingsResult, cardRulesResult, columnsResult, rowsResult]) => {
                    let boardSettings: IBacklogBoardSettings = {
                        boardName: backlog.name,
                        cardRules: cardRulesResult,
                        cardSettings: cardSettingsResult,
                        columns: columnsResult,
                        rows: rowsResult
                    };
                    settings.cardSettings.push(boardSettings);
                });
                backlogPromises.push(settingsPromise);

            });
            Q.all(backlogPromises).then(([cardSettingsResult, cardRulesResult, columnsResult, rowsResult]) => {
                defer.resolve(settings);
            }).catch((reason) => {
                defer.reject(reason);
            });
        });

        return defer.promise;
    }

    private applyTeamSettings(context: CoreContracts.TeamContext, oldSettings: IBoardSettings, settings: IBoardSettings): Q.Promise<Boolean> {
        let defer = Q.defer<Boolean>();
        let workClient: WorkClient.WorkHttpClient2_3 = WorkClient.getClient();

        let backlogPromises: Q.Promise<[WorkContracts.BoardCardSettings, WorkContracts.BoardCardRuleSettings, WorkContracts.BoardColumn[], WorkContracts.BoardRow[]]>[] = new Array();
        settings.cardSettings.forEach((backlogSetting) => {
            let cardSettingsPromise = workClient.updateBoardCardSettings(backlogSetting.cardSettings, context, backlogSetting.boardName);
            let cardRulesPromise = workClient.updateBoardCardRuleSettings(backlogSetting.cardRules, context, backlogSetting.boardName);
            let rowsPromise = workClient.updateBoardRows(backlogSetting.rows, context, backlogSetting.boardName);

            let oldBoard: IBacklogBoardSettings;
            oldSettings.cardSettings.forEach(board => {
                if (board.boardName === backlogSetting.boardName) {
                    oldBoard = board;
                }
            });

            oldBoard.columns.forEach(column => {
                let newColumn = backlogSetting.columns.filter(i => {
                    return this.compareColumnStateMappings(i, column);
                });
                if (newColumn.length > 0) {
                    let found: Boolean = false;

                    newColumn.forEach(c2 => {
                        if (c2.name === column.name) {
                            found = true;
                            c2.id = column.id;
                        }
                    });
                    if (!found) {
                        newColumn[0].id = column.id;
                    }
                }
            });

            backlogSetting.columns[backlogSetting.columns.length - 1].id = oldBoard.columns[oldBoard.columns.length - 1].id;

            let columnsPromise = workClient.updateBoardColumns(backlogSetting.columns, context, backlogSetting.boardName);

            let settingsPromise = Q.all([cardSettingsPromise, cardRulesPromise, columnsPromise, rowsPromise]);
            settingsPromise.catch((reason) => {
                console.log("failed to apply: " + reason);
            });
            backlogPromises.push(settingsPromise);
        });

        Q.all(backlogPromises).then(([cardSettingsResult, cardRulesResult, columnsResult, rowsResult]) => {
            defer.resolve(true);
        }).catch((reason) => {
            defer.reject(reason);
        });
        return defer.promise;
    }

    private compareColumnStateMappings(c1: WorkContracts.BoardColumn, c2: WorkContracts.BoardColumn): boolean {
        return JSON.stringify(c1.stateMappings) === JSON.stringify(c2.stateMappings);
    }
}