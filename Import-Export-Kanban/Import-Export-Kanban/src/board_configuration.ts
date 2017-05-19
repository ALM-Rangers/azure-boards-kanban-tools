/// <reference types="vss-web-extension-sdk" />

import WorkClient = require("TFS/Work/RestClient");
import CoreClient = require("TFS/Core/RestClient");
import WitClient = require("TFS/WorkItemTracking/RestClient");
import WorkContracts = require("TFS/Work/Contracts");
import CoreContracts = require("TFS/Core/Contracts");
import WitContracts = require("TFS/WorkItemTracking/Contracts");
import VSS_Common_Contracts = require("VSS/WebApi/Contracts");
import Q = require("q");

import { getContextForTeam, getContextForTeamAsync } from "./utils";

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

export interface IBoardColumnDifferences {
    backlog: string;
    mappings: IColumnMapping[];
}

export class BoardConfiguration {
    private static BaseWiql = "SELECT [System.Id],[System.WorkItemType],[System.Title] FROM workitems WHERE [System.TeamProject] = @project " +
    "AND [System.WorkItemType] in (@WorkItemTypes) AND [System.BoardColumn] in (@OldBoardColumns) and (@RootArea) and System.IterationPath UNDER '@RootIteration'";

    private static WiqlWorkItemTypes = "@WorkItemTypes";
    private static WiqlBoardColumns = "@OldBoardColumns";
    private static WiqlRootArea = "@RootArea";
    private static WiqlIteration = "@RootIteration";

    /**
     * Figures out the differences in board column mappings
     * For each board, it will set a list of potential mappings, where sourceColumn is the column in the source team (can only be set for incoming and outgoing columns),
     * targetColumn is the existing column in the target team, and potentialMatches is a list of columns in the source team, that are candidate for taking the existing work
     * items in the target column.
     *
     * @param {IBoardSettings} sourceTeamSettings The team we are importing from
     * @param {IBoardSettings} targetTeamSettings The team we are importing to
     * @returns {IBoardColumnDifferences[]} The array of differences
     *
     * @memberOf BoardConfiguration
     */
    public getTeamColumnDifferences(sourceTeamSettings: IBoardSettings, targetTeamSettings: IBoardSettings): IBoardColumnDifferences[] {
        let differences: IBoardColumnDifferences[] = new Array();
        sourceTeamSettings.backlogSettings.forEach(backlogSetting => {
            let sourceColumns: WorkContracts.BoardColumn[] = new Array();
            let targetColumns: WorkContracts.BoardColumn[] = new Array();

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
                potentialMatches: [sourceIncomingColumn],
                targetColumn: targetIncomingColumn
            });

            for (let columnIndex = 0; columnIndex < targetColumns.length; columnIndex++) {
                let currentColumn = targetColumns[columnIndex];
                if (currentColumn.columnType === WorkContracts.BoardColumnType.Incoming || currentColumn.columnType === WorkContracts.BoardColumnType.Outgoing) {
                    continue;
                }

                let similarColumns: WorkContracts.BoardColumn[] = new Array();
                for (let sourceIndex = 0; sourceIndex < sourceColumns.length; sourceIndex++) {
                    let isSimilar = this._compareColumnStateMappings(currentColumn, sourceColumns[sourceIndex]);
                    if (isSimilar) {
                        similarColumns.push(sourceColumns[sourceIndex]);
                    }
                }

                let initialSourceColumn = similarColumns.length > 0 ? similarColumns[0] : undefined;

                mappings.push({
                    sourceColumn: initialSourceColumn,
                    potentialMatches: similarColumns,
                    targetColumn: currentColumn
                });

            }

            mappings.push({
                sourceColumn: sourceOutgoingColumn,
                potentialMatches: [sourceOutgoingColumn],
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

    public async getCurrentConfigurationAsync(selectedTeam: string): Promise<IBoardSettings> {
        let settings: IBoardSettings = null;
        try {
            let context = await getContextForTeamAsync(selectedTeam);
            settings = await this.getTeamSettingsAsync(context);
        } catch (ex) {
            Promise.reject(ex);
        }

        return settings;
    }

    public async applySettingsAsync(targetTeamSettings: IBoardSettings, sourceTeamSettings: IBoardSettings, selectedMappings: IBoardColumnDifferences[]): Promise<Boolean> {
        let result: Boolean = false;

        result = await this.applyTeamSettingsAsync(targetTeamSettings, sourceTeamSettings, selectedMappings);
        return result;
    }

    private async getTeamSettingsAsync(context: CoreContracts.TeamContext): Promise<IBoardSettings> {
        let workClient: WorkClient.WorkHttpClient2_3 = WorkClient.getClient();

        let settings: IBoardSettings = {
            name: "Settings - " + context.team,
            teamName: context.team,
            version: "1.0",
            backlogSettings: new Array<IBacklogBoardSettings>(),
            context: context
        };

        let boardCards: WorkContracts.BoardCardSettings[] = new Array();
        let process = await workClient.getProcessConfiguration(context.project);
        // TEMP to simplify debugging
        let allBacklogs = process.portfolioBacklogs.filter(b => b.name === "Backlog Items");
        // let allBacklogs = process.portfolioBacklogs;
        allBacklogs.push(process.requirementBacklog);
        try {
            for (let backlogIndex = 0; backlogIndex < allBacklogs.length; backlogIndex++) {
                let backlog = allBacklogs[backlogIndex];
                let cardSettings = await workClient.getBoardCardSettings(context, backlog.name);
                let cardRules = await workClient.getBoardCardRuleSettings(context, backlog.name);
                let columns = await workClient.getBoardColumns(context, backlog.name);
                let rows = await workClient.getBoardRows(context, backlog.name);
                let boardSettings: IBacklogBoardSettings = {
                    boardName: backlog.name,
                    boardWorkItemTypes: backlog.workItemTypes.map(wit => wit.name),
                    cardRules: cardRules,
                    cardSettings: cardSettings,
                    columns: columns,
                    rows: rows
                };
                settings.backlogSettings.push(boardSettings);
            }
            return settings;
        } catch (e) {
            Promise.reject(e);
        }
    }

    private async applyTeamSettingsAsync(oldSettings: IBoardSettings, settings: IBoardSettings, selectedMappings: IBoardColumnDifferences[]): Promise<Boolean> {
        let result: Boolean = false;
        let workClient: WorkClient.WorkHttpClient2_3 = WorkClient.getClient();
        let witClient = WitClient.getClient();

        let context = oldSettings.context;
        try {
            for (let backlogIndex = 0; backlogIndex < settings.backlogSettings.length; backlogIndex++) {
                let backlogSetting = settings.backlogSettings[backlogIndex];
                let cardSettings = await workClient.updateBoardCardSettings(backlogSetting.cardSettings, context, backlogSetting.boardName);
                let cardRules = await workClient.updateBoardCardRuleSettings(backlogSetting.cardRules, context, backlogSetting.boardName);
                let rows = await workClient.updateBoardRows(backlogSetting.rows, context, backlogSetting.boardName);
                let columnsToApply: WorkContracts.BoardColumn[] = new Array();

                let oldBoard: IBacklogBoardSettings;
                oldSettings.backlogSettings.forEach(board => {
                    if (board.boardName === backlogSetting.boardName) {
                        oldBoard = board;
                    }
                });

                let selectedMapping: IBoardColumnDifferences;
                selectedMappings.forEach(cd => {
                    if (cd.backlog === backlogSetting.boardName) {
                        selectedMapping = cd;
                    }
                });

                let uniqueNameifier = Date.now().toString() + "-";

                let oldActiveColumns = oldBoard.columns.filter(c => c.columnType === WorkContracts.BoardColumnType.InProgress);

                // Create new colums first
                backlogSetting.columns.forEach(columnToCreate => {
                    if (columnToCreate.columnType !== WorkContracts.BoardColumnType.InProgress) {
                        // keep id the same to avoid creating a new column (should only change name)
                        columnToCreate.id = selectedMapping.mappings.filter(c => c.sourceColumn === columnToCreate)[0].targetColumn.id;
                        columnsToApply.push(columnToCreate);
                    } else {
                        // empty id to force new column creation
                        columnToCreate.id = "";
                        // add a unique name so we know which one to keep later - help eliminate confusion if column names are the same
                        columnToCreate.name = uniqueNameifier + columnToCreate.name;
                        columnsToApply.push(columnToCreate);
                        let matchedColumn = selectedMapping.mappings.filter(c => c.sourceColumn.id === columnToCreate.id);
                        if (matchedColumn.length > 0 && columnsToApply.filter(c => c.id === matchedColumn[0].targetColumn.id).length === 0) {
                            columnsToApply.push(matchedColumn[0].targetColumn);
                        }
                    }
                });

                let outgoingColumn = columnsToApply.pop();

                oldActiveColumns.forEach(oldColumn => {
                    if (columnsToApply.filter(c => c.id === oldColumn.id).length === 0) {
                        columnsToApply.push(oldColumn);
                    }
                });

                columnsToApply.push(outgoingColumn);

                let currentColumns = await workClient.updateBoardColumns(columnsToApply, context, backlogSetting.boardName);

                // Move work items to new mappings
                // Get work items for current board
                let wiql: WitContracts.Wiql = {
                    query: BoardConfiguration.BaseWiql
                };

                let teamSettings = await workClient.getTeamSettings(context);
                let teamFieldValues = await workClient.getTeamFieldValues(context);

                // Get work items for the right backlog level
                let workItemTypes = "'" + backlogSetting.boardWorkItemTypes[0] + "'";
                if (backlogSetting.boardWorkItemTypes.length > 1) {
                    for (let workItemTypeIndex = 1; workItemTypeIndex < backlogSetting.boardWorkItemTypes.length; workItemTypeIndex++) {
                        workItemTypes += ", '" + backlogSetting.boardWorkItemTypes[workItemTypeIndex] + "'";
                    }
                }

                let activeColumns = selectedMapping.mappings.filter(m => m.targetColumn.columnType === WorkContracts.BoardColumnType.InProgress);
                let wiqlColumns = "";
                if (activeColumns.length > 0) {
                    wiqlColumns = "'" + activeColumns[0].targetColumn.name + "'";
                    for (let columnIndex = 1; columnIndex < activeColumns.length; columnIndex++) {
                        wiqlColumns += ", '" + activeColumns[columnIndex].targetColumn.name + "'";
                    }
                }

                let areaQuery = "";
                teamFieldValues.values.forEach((areaPath, index, values) => {
                    let operator = areaPath.includeChildren ? "UNDER" : "=";
                    let pathQuery = `[System.AreaPath] ${operator} "${areaPath.value}"`;
                    areaQuery += index > 0 ? ` OR ${pathQuery}` : pathQuery;
                });

                wiql.query = wiql.query.replace(BoardConfiguration.WiqlWorkItemTypes, workItemTypes);
                wiql.query = wiql.query.replace(BoardConfiguration.WiqlIteration, teamSettings.backlogIteration.name);
                wiql.query = wiql.query.replace(BoardConfiguration.WiqlRootArea, areaQuery);
                wiql.query = wiql.query.replace(BoardConfiguration.WiqlBoardColumns, wiqlColumns);

                let witIds: number[] = new Array();
                console.log("query by wiql " + wiql.query);
                let witQuery = await witClient.queryByWiql(wiql, context.project, context.team);
                witIds = witQuery.workItems.map(wit => wit.id);
                console.log("get work items");
                if (witIds.length > 0) {
                    let wits = await witClient.getWorkItems(witIds);
                    console.log("got " + wits.length + " work items");
                    for (let witIndex = 0; witIndex < wits.length; witIndex++) {
                        let wit = wits[witIndex];
                        let fieldNames = Object.keys(wit.fields);
                        fieldNames.sort();
                        let columnFields = fieldNames.filter(f => /WEF_.*_Kanban.Column$/.test(f));
                        let columnField = "";
                        if (columnFields && columnFields.length > 0) {
                            columnField = columnFields[0];
                        }
                        let witColumn = wit.fields[columnField];
                        let matchedColumns = selectedMapping.mappings.filter(m => m.targetColumn.name === witColumn);
                        if (matchedColumns && matchedColumns.length > 0) {
                            let mappedColumn = matchedColumns[0];
                            let patch = [
                                {
                                    "op": "replace",
                                    "path": `/fields/${columnField}`,
                                    "value": mappedColumn.sourceColumn.name
                                }
                            ];
                            console.log("Updating work item from column: " + witColumn + " to column: " + JSON.stringify(patch));
                            await witClient.updateWorkItem(patch, wits[witIndex].id, false, true);
                        }
                    }
                }

                // Delete old columns
                columnsToApply = new Array();
                currentColumns.forEach(column => {
                    if (column.columnType === WorkContracts.BoardColumnType.InProgress) {
                        // remove unique indentifier from column name
                        let uniqueIndex = column.name.lastIndexOf(uniqueNameifier);
                        if (uniqueIndex >= 0) {
                            let columnName = column.name.substring(uniqueNameifier.length);
                            column.name = columnName;
                            // only keep columns that were 'tagged'
                            columnsToApply.push(column);
                        }
                    } else {
                        columnsToApply.push(column);
                    }
                });
                currentColumns = await workClient.updateBoardColumns(columnsToApply, context, backlogSetting.boardName);
            }
            result = true;
        } catch (ex) {
            console.log("Error " + ex);
            Promise.reject(ex);
        }
        console.log("Finish apply");
        return result;
    }

    private _compareColumnStateMappings(c1: WorkContracts.BoardColumn, c2: WorkContracts.BoardColumn): boolean {
        let isEqual = this.equals(c1.stateMappings, c2.stateMappings);
        return isEqual;
    }

    // taken from here: http://stackoverflow.com/a/14286864
    private equals(x: any, y: any): boolean {
        if (x === y) {
            return true;
        }
        if (!(x instanceof Object) || !(y instanceof Object)) {
            return false;
        }
        if (x.constructor !== y.constructor) {
            return false;
        }
        for (let p in x) {
            // Inherited properties were tested using x.constructor === y.constructor
            if (x.hasOwnProperty(p)) {
                // Allows comparing x[ p ] and y[ p ] when set to undefined
                if (!y.hasOwnProperty(p)) {
                    return false;
                }

                // If they have the same strict value or identity then they are equal
                if (x[p] === y[p]) {
                    continue;
                }

                // Numbers, Strings, Functions, Booleans must be strictly equal
                if (typeof (x[p]) !== "object") {
                    return false;
                }

                // Objects and Arrays must be tested recursively
                if (!this.equals(x[p], y[p])) {
                    return false;
                }
            }
        }

        for (let p in y) {
            // allows x[ p ] to be set to undefined
            if (y.hasOwnProperty(p) && !x.hasOwnProperty(p)) {
                return false;
            }
        }
        return true;
    }
}