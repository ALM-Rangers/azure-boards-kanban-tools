/// <reference types="vss-web-extension-sdk" />

import WorkClient = require("TFS/Work/RestClient");
import CoreClient = require("TFS/Core/RestClient");
import WitClient = require("TFS/WorkItemTracking/RestClient");
import WorkContracts = require("TFS/Work/Contracts");
import CoreContracts = require("TFS/Core/Contracts");
import WitContracts = require("TFS/WorkItemTracking/Contracts");
import VSS_Common_Contracts = require("VSS/WebApi/Contracts");
import Q = require("q");

import { getContextForTeam } from "./utils";

export interface IBacklogBoardSettings {
    boardName: string;
    boardWorkItemTypes: string[];
    cardSettings: WorkContracts.BoardCardSettings;
    cardRules: WorkContracts.BoardCardRuleSettings;
    columns: WorkContracts.BoardColumn[];
    rows: WorkContracts.BoardRow[];
}

export interface IBoardSettings {
    version: string;
    name: string;
    teamName: string;
    context: CoreContracts.TeamContext;
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
    private static BaseWiql = "SELECT [System.Id],[System.WorkItemType],[System.Title] FROM workitems WHERE [System.TeamProject] = @project ";

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

    public applySettings(targetTeamSettings: IBoardSettings, sourceTeamSettings: IBoardSettings, columnDifferences: IBoardColumnDifferences[]): Q.Promise<Boolean> {
        let defer = Q.defer<Boolean>();

        this.applyTeamSettings(targetTeamSettings, sourceTeamSettings, columnDifferences).then(result => {
            defer.resolve(result);
        }, reason => {
            defer.reject(reason);
        });

        // getContextForTeam(targetTeam).then(context => {
        //     alert("context");
        //     this.getTeamSettings(context).then((oldSettings) => {

        //     }, reason => {
        //         defer.reject(reason);
        //     });
        // }, reason => {
        //     defer.reject(reason);
        // }).catch((reason) => {
        //     defer.reject(reason);
        // });

        return defer.promise;
    }

    private getTeamSettings(context: CoreContracts.TeamContext): Q.Promise<IBoardSettings> {
        let defer = Q.defer<IBoardSettings>();
        let workClient: WorkClient.WorkHttpClient2_3 = WorkClient.getClient();

        let settings: IBoardSettings = {
            name: "Settings - " + context.team,
            teamName: context.team,
            version: "1.0",
            backlogSettings: new Array<IBacklogBoardSettings>(),
            context: context
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
                        boardWorkItemTypes: backlog.workItemTypes.map(wit => wit.name),
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

    private applyTeamSettings(oldSettings: IBoardSettings, settings: IBoardSettings, columnDifferences: IBoardColumnDifferences[]): Q.Promise<Boolean> {
        let defer = Q.defer<Boolean>();
        let workClient = WorkClient.getClient();
        let witClient = WitClient.getClient();

        let context = oldSettings.context;
        let backlogPromises: Q.Promise<[WorkContracts.BoardCardSettings, WorkContracts.BoardCardRuleSettings, WorkContracts.BoardRow[], WorkContracts.BoardColumn[], IPromise<WitContracts.WorkItem>[], WorkContracts.BoardColumn[]]>[] = new Array();
        settings.backlogSettings.forEach((backlogSetting) => {
            let cardSettingsPromise = workClient.updateBoardCardSettings(backlogSetting.cardSettings, context, backlogSetting.boardName);
            let cardRulesPromise = workClient.updateBoardCardRuleSettings(backlogSetting.cardRules, context, backlogSetting.boardName);
            let rowsPromise = workClient.updateBoardRows(backlogSetting.rows, context, backlogSetting.boardName);

            let columnsToApply: WorkContracts.BoardColumn[] = new Array();

            let oldBoard: IBacklogBoardSettings;
            oldSettings.backlogSettings.forEach(board => {
                if (board.boardName === backlogSetting.boardName) {
                    oldBoard = board;
                }
            });

            let columnDifference: IBoardColumnDifferences;
            columnDifferences.forEach(cd => {
                if (cd.backlog === backlogSetting.boardName) {
                    columnDifference = cd;
                }
            });

            let uniqueNameifier = Date.now().toString() + "-";

            // Create new colums first
            columnDifference.mappings.forEach(mapping => {
                if (mapping.sourceColumn.columnType !== WorkContracts.BoardColumnType.InProgress) {
                    // keep id the same to avoid creating a new column (should only change name)
                    mapping.sourceColumn.id = mapping.targetColumn.id;
                    columnsToApply.push(mapping.sourceColumn);
                } else {
                    // empty id to force new column creation
                    mapping.sourceColumn.id = "";
                    // add a unique name so we know which one to keep later - help eliminate confusion if column names are the same
                    mapping.sourceColumn.name = uniqueNameifier + mapping.sourceColumn.name;
                    columnsToApply.push(mapping.sourceColumn);
                    // keep the old column for right now
                    if (columnsToApply.filter(c => c.id === mapping.targetColumn.id).length === 0) {
                        columnsToApply.push(mapping.targetColumn);
                    }
                }
            });
            let updatedWitsPromises: IPromise<WitContracts.WorkItem>[] = new Array();
            let removeOldColumnsPromise: IPromise<WorkContracts.BoardColumn[]>;
            let createNewColumnsPromise = workClient.updateBoardColumns(columnsToApply, context, backlogSetting.boardName);
            createNewColumnsPromise.then(currentColumns => {
                // Move work items to new mappings
                // Get work items for current board
                let wiql: WitContracts.Wiql = {
                    query: BoardConfiguration.BaseWiql
                };

                // Get work items for the right backlog level
                wiql.query += "AND [System.WorkItemType] = '" + backlogSetting.boardWorkItemTypes[0] + "'";
                if (backlogSetting.boardWorkItemTypes.length > 1) {
                    for (let workItemTypeIndex = 1; workItemTypeIndex < backlogSetting.boardWorkItemTypes.length; workItemTypeIndex++) {
                        wiql.query += "OR [System.WorkItemType] = '" + backlogSetting.boardWorkItemTypes[workItemTypeIndex] + "'";
                    }
                }

                let witIds: number[] = new Array();
                let witPromise = witClient.queryByWiql(wiql, context.project, context.team);
                witPromise.then(witQuery => {
                    witIds = witQuery.workItems.map(wit => wit.id);
                    witClient.getWorkItems(witIds).then(wits => {
                        wits.forEach(wit => {
                            let witColumn = wit.fields["System.BoardColumn"];
                            let matchedColumns = columnDifference.mappings.filter(m => m.targetColumn === witColumn);
                            if (matchedColumns) {
                                let mappedColumn = matchedColumns[0];
                                let patch = [
                                    {
                                        "op": "replace",
                                        "path": "/fields/System.BoardColumn",
                                        "value": uniqueNameifier + mappedColumn.sourceColumn.name
                                    }
                                ];
                                updatedWitsPromises.push(witClient.updateWorkItem(patch, wits[0].id, false, true));
                            }
                        });
                    });
                });

                return Q.all(updatedWitsPromises).then(results => {
                    // Delete old columns
                    columnsToApply = new Array();
                    currentColumns.forEach(column => {
                        if (column.columnType === WorkContracts.BoardColumnType.InProgress) {
                            // remove unique indentifier from column name
                            let uniqueIndex = column.name.lastIndexOf(uniqueNameifier);
                            if (uniqueIndex > 0) {
                                let columnName = column.name.substring(uniqueIndex + 1);
                                column.name = columnName;
                                // only keep columns that were 'tagged'
                                columnsToApply.push(column);
                            }
                        } else {
                            columnsToApply.push(column);
                        }
                    });
                    removeOldColumnsPromise = workClient.updateBoardColumns(columnsToApply, context, backlogSetting.boardName);
                });
            }, reason => {
                console.log(reason);
            });

            // sourceColumns = backlogSetting.columns;
            // targetColumns = oldBoard.columns;

            // let sourceIncomingColumn = sourceColumns.filter(c => c.columnType === WorkContracts.BoardColumnType.Incoming)[0];
            // let sourceOutgoingColumn = sourceColumns.filter(c => c.columnType === WorkContracts.BoardColumnType.Outgoing)[0];

            // let targetIncomingColumn = targetColumns.filter(c => c.columnType === WorkContracts.BoardColumnType.Incoming)[0];
            // let targetOutgoingColumn = targetColumns.filter(c => c.columnType === WorkContracts.BoardColumnType.Outgoing)[0];

            // targetIncomingColumn.name = sourceIncomingColumn.name;
            // targetOutgoingColumn.name = sourceOutgoingColumn.name;
            // columnsToApply.push(targetIncomingColumn);

            // for (let columnIndex = 0; columnIndex < sourceColumns.length; columnIndex++) {
            //     let currentColumn = sourceColumns[columnIndex];
            //     if (currentColumn.columnType === WorkContracts.BoardColumnType.Incoming || currentColumn.columnType === WorkContracts.BoardColumnType.Outgoing) {
            //         continue;
            //     }
            //     let newColumn = sourceColumns[columnIndex];
            //     newColumn.id = "";
            //     columnsToApply.push(newColumn);
            // }

            // columnsToApply.push(targetOutgoingColumn);

            let settingsPromise = Q.all([cardSettingsPromise, cardRulesPromise, rowsPromise, createNewColumnsPromise, updatedWitsPromises, removeOldColumnsPromise]);
            settingsPromise.catch((reason) => {
                console.log("failed to apply: " + reason);
            });
            backlogPromises.push(settingsPromise);
        });

        Q.all(backlogPromises).then(([cardSettingsResult, cardRulesResult, rowsResult, createNewColumnsResult, updateWitResult, removeOldColumnsResult]) => {
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