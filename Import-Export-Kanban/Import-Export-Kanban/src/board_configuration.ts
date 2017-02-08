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
    teamName: string;
    backlogSettings: IBacklogBoardSettings[];
}

export interface IColumnMapping {
    sourceColumn: WorkContracts.BoardColumn;
    potentialMatches: WorkContracts.BoardColumn[];
    targetColumn?: WorkContracts.BoardColumn;
}

export interface IBoardMapping {
    backlog: string;
    columnMappings: IColumnMapping[];
}

export interface IBoardColumnDifferences {
    backlog: string;
    mappings: IColumnMapping[];
}

export class BoardConfiguration {
    public getTeamColumnDifferences(sourceTeamSettings: IBoardSettings, targetTeamSettings: IBoardSettings): IBoardColumnDifferences[] {
        let differences: IBoardColumnDifferences[] = new Array();
        sourceTeamSettings.backlogSettings.forEach(backlogSetting => {
            let sourceColumns: WorkContracts.BoardColumn[] = new Array();
            let targetColumns: WorkContracts.BoardColumn[] = new Array();
            // let columnsToApply: WorkContracts.BoardColumn[] = new Array();
            // let columnsToReplace: WorkContracts.BoardColumn[] = new Array();

            let mappings: IColumnMapping[] = new Array();

            let targetBoard: IBacklogBoardSettings;
            targetTeamSettings.backlogSettings.forEach(board => {
                if (board.boardName === backlogSetting.boardName) {
                    targetBoard = board;
                }
            });

            sourceColumns = backlogSetting.columns;
            targetColumns = targetBoard.columns;

            let sourceIncomingColumn = sourceColumns.filter(c => c.columnType === WorkContracts.BoardColumnType.Incoming)[0];
            let sourceOutgoingColumn = sourceColumns.filter(c => c.columnType === WorkContracts.BoardColumnType.Outgoing)[0];

            let targetIncomingColumn = targetColumns.filter(c => c.columnType === WorkContracts.BoardColumnType.Incoming)[0];
            let targetOutgoingColumn = targetColumns.filter(c => c.columnType === WorkContracts.BoardColumnType.Outgoing)[0];

            mappings.push({
                sourceColumn: sourceIncomingColumn,
                potentialMatches: [targetIncomingColumn],
                targetColumn: targetIncomingColumn
            });

            // columnsToApply.push(sourceIncomingColumn);
            // columnsToReplace.push(targetIncomingColumn);

            for (let columnIndex = 0; columnIndex < sourceColumns.length; columnIndex++) {
                let currentColumn = sourceColumns[columnIndex];
                if (currentColumn.columnType === WorkContracts.BoardColumnType.Incoming || currentColumn.columnType === WorkContracts.BoardColumnType.Outgoing) {
                    continue;
                }
                let similarColumns: WorkContracts.BoardColumn[] = new Array();
                for (let targetIndex = 0; targetIndex < targetColumns.length; targetIndex++) {
                    let isSimilar = this._compareColumnStateMappings(currentColumn, targetColumns[targetIndex]);
                    if (isSimilar) {
                        similarColumns.push(targetColumns[targetIndex]);
                    }
                }

                mappings.push({
                    sourceColumn: currentColumn,
                    potentialMatches: similarColumns
                });

                // columnsToApply.push(newColumn);
            }

            // columnsToApply.push(sourceOutgoingColumn);
            // columnsToReplace.push(targetOutgoingColumn);

            mappings.push({
                sourceColumn: sourceOutgoingColumn,
                potentialMatches: [targetOutgoingColumn],
                targetColumn: targetOutgoingColumn
            });

            let difference: IBoardColumnDifferences = {
                backlog: backlogSetting.boardName,
                mappings: mappings
            };
            differences.push(difference);
        });

        return differences;
    }

    // public getColumnDifferences(): IPromise<IBoardColumnDifferences[]> {
    //     let defer = Q.defer<IBoardColumnDifferences[]>();
    //     let results: IBoardColumnDifferences[] = new Array();

    //     setTimeout(() => {
    //         results.push({
    //             backlog: "Epics",
    //             desiredColumns: ["Planned", "Funded", "Started", "Tested", "Planned", "Funded", "Started", "Tested"],
    //             originalColumns: ["In-Progress", "In-Test"]
    //         });
    //         results.push({
    //             backlog: "Features",
    //             desiredColumns: ["Analysis", "Scoped", "In Progress", "Development"],
    //             originalColumns: ["Planned", "In Progress", "Testing"]
    //         });
    //         defer.resolve(results);
    //     }, 100);

    //     return defer.promise;
    // }

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
            teamName: context.team,
            version: "1.0",
            backlogSettings: new Array<IBacklogBoardSettings>()
        };

        let boardCards: WorkContracts.BoardCardSettings[] = new Array();
        let backlogPromises: Q.Promise<[WorkContracts.BoardCardSettings, WorkContracts.BoardCardRuleSettings, WorkContracts.BoardColumn[], WorkContracts.BoardRow[]]>[] = new Array();
        workClient.getProcessConfiguration(context.project).then((process) => {
            let allBacklogs = process.portfolioBacklogs;
            allBacklogs.push(process.requirementBacklog);
            allBacklogs.forEach((backlog) => {
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
                    settings.backlogSettings.push(boardSettings);
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
        settings.backlogSettings.forEach((backlogSetting) => {
            let cardSettingsPromise = workClient.updateBoardCardSettings(backlogSetting.cardSettings, context, backlogSetting.boardName);
            let cardRulesPromise = workClient.updateBoardCardRuleSettings(backlogSetting.cardRules, context, backlogSetting.boardName);
            let rowsPromise = workClient.updateBoardRows(backlogSetting.rows, context, backlogSetting.boardName);

            let sourceColumns: WorkContracts.BoardColumn[] = new Array();
            let targetColumns: WorkContracts.BoardColumn[] = new Array();
            let columnsToApply: WorkContracts.BoardColumn[] = new Array();

            let oldBoard: IBacklogBoardSettings;
            oldSettings.backlogSettings.forEach(board => {
                if (board.boardName === backlogSetting.boardName) {
                    oldBoard = board;
                }
            });

            sourceColumns = backlogSetting.columns;
            targetColumns = oldBoard.columns;

            let sourceIncomingColumn = sourceColumns.filter(c => c.columnType === WorkContracts.BoardColumnType.Incoming)[0];
            let sourceOutgoingColumn = sourceColumns.filter(c => c.columnType === WorkContracts.BoardColumnType.Outgoing)[0];

            let targetIncomingColumn = targetColumns.filter(c => c.columnType === WorkContracts.BoardColumnType.Incoming)[0];
            let targetOutgoingColumn = targetColumns.filter(c => c.columnType === WorkContracts.BoardColumnType.Outgoing)[0];

            targetIncomingColumn.name = sourceIncomingColumn.name;
            targetOutgoingColumn.name = sourceOutgoingColumn.name;
            columnsToApply.push(targetIncomingColumn);

            for (let columnIndex = 0; columnIndex < sourceColumns.length; columnIndex++) {
                let currentColumn = sourceColumns[columnIndex];
                if (currentColumn.columnType === WorkContracts.BoardColumnType.Incoming || currentColumn.columnType === WorkContracts.BoardColumnType.Outgoing) {
                    continue;
                }
                let newColumn = sourceColumns[columnIndex];
                newColumn.id = "";
                columnsToApply.push(newColumn);
            }

            columnsToApply.push(targetOutgoingColumn);

            let columnsPromise = workClient.updateBoardColumns(columnsToApply, context, backlogSetting.boardName);

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

    private _compareColumnStateMappings(c1: WorkContracts.BoardColumn, c2: WorkContracts.BoardColumn): boolean {
        return JSON.stringify(c1.stateMappings) === JSON.stringify(c2.stateMappings);
    }
}