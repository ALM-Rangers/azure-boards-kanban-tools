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
    fields: WorkContracts.BoardFields;
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
    "AND [System.WorkItemType] in (@WorkItemTypes) AND [@WITField] in (@OldBoardColumns) and (@RootArea) and System.IterationPath UNDER '@RootIteration'";

    private static WiqlWorkItemTypes = "@WorkItemTypes";
    private static WiqlBoardColumns = "@OldBoardColumns";
    private static WiqlRootArea = "@RootArea";
    private static WiqlIteration = "@RootIteration";
    private static WiqlWorkItemColumnField = "@WITField";
    private static DefaultRowId = "00000000-0000-0000-0000-000000000000";

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

    public async applySettingsAsync(targetTeamName: string, sourceTeamName: string, selectedMappings: IBoardColumnDifferences[]): Promise<Boolean> {
        let result: Boolean = false;

        let sourceSettings = await this.getCurrentConfigurationAsync(sourceTeamName);
        let targetSettings = await this.getCurrentConfigurationAsync(targetTeamName);

        result = await this.applyTeamSettingsAsync(targetSettings, sourceSettings, selectedMappings);
        return result;
    }

    private async sleep(ms) {
        console.log("Waiting " + ms + " milliseconds...");
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Initializes a board that hasn't been visited before. It does this by opening it in an invisible window.
     *
     * @param context The context of the team to initialize the board for
     * @param backlog The board to initialize
     */
    private async initializeBoard(context: CoreContracts.TeamContext, backlog: WorkContracts.BacklogLevelConfiguration) {
        let fakepage: JQuery = $("#fakepage");
        let collectionUri: string = VSS.getWebContext().collection.uri;
        let url = encodeURI(collectionUri + context.project + "/" + context.team + "/_backlogs/board/" + backlog.name);

        let workClient: WorkClient.WorkHttpClient2_3 = WorkClient.getClient();
        let teamSettings = await workClient.getTeamSettings(context);

        let backlogVisible: boolean = teamSettings.backlogVisibilities[backlog.id];
        if (backlogVisible === false) {
            // If the backlog is not visible, we won't be able to fake the displaying of it. So, we'll temporarily enable it.
            console.log("Temporarily enabling backlog " + backlog.id + " for team " + context.team);
            let backlogVisibilities: { [key: string]: boolean } = {};
            backlogVisibilities[backlog.id] = true;

            let updateSettings: WorkContracts.TeamSettingsPatch = {
                backlogIteration: null,
                backlogVisibilities: backlogVisibilities,
                bugsBehavior: null,
                workingDays: null,
                defaultIteration: null,
                defaultIterationMacro: null
            };
            await workClient.updateTeamSettings(updateSettings, context);
        }

        console.log("Faking visit to: " + url);
        fakepage.show();
        fakepage.html("<object data=\"" + url + "\" />");
        await this.sleep(5000); // Wait 5 seconds. I'd love a better solution for this, but there doesn't seem to be a way to check the content an <object> tag that is loaded with the data property
        fakepage.hide();

        if (backlogVisible === false) {
            // If the backlog was not visible, we'll hide it again.
            console.log("Disabling backlog " + backlog.id + " for team " + context.team);
            let backlogVisibilities: { [key: string]: boolean } = {};
            backlogVisibilities[backlog.id] = false;

            let updateSettings: WorkContracts.TeamSettingsPatch = {
                backlogIteration: null,
                backlogVisibilities: backlogVisibilities,
                bugsBehavior: null,
                workingDays: null,
                defaultIteration: null,
                defaultIterationMacro: null
            };
            await workClient.updateTeamSettings(updateSettings, context);
        }

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
        let backlogs = await workClient.getBacklogConfigurations(context);
        let allBacklogs: WorkContracts.BacklogLevelConfiguration[] = [];
        allBacklogs = backlogs.portfolioBacklogs;
        // allBacklogs = process.portfolioBacklogs.filter(b => b.name === "Epics");
        allBacklogs.push(backlogs.requirementBacklog);
        allBacklogs = allBacklogs.sort((a, b) => {
            return b.rank - a.rank;
        });
        try {
            for (let backlogIndex = 0; backlogIndex < allBacklogs.length; backlogIndex++) {
                let backlog = allBacklogs[backlogIndex];
                console.log("Getting settings for board " + backlog.name + " (" + backlog.id + ") of team " + context.team);
                let success: boolean = false;
                let tries: number = 0;
                let board: WorkContracts.Board = null;
                while (success === false && tries <= 10) {
                    try {
                        board = await workClient.getBoard(context, backlog.name);
                        console.log("Successfully got board!");
                        success = true;
                    } catch (e) {
                        console.log("Failed to get board!: " + e);
                        let errormessage: string = e.message;
                        if (errormessage.indexOf("The board does not exist.") !== -1) {
                            // This board has not yet been visited by anyone, so it doesn't exist in the VSTS backend yet. This will make subsequent API calls fail
                            // We'll try to fake a visit to this board here
                            await this.initializeBoard(context, backlog);
                            board = await workClient.getBoard(context, backlog.name);
                        }
                        tries++;
                    }
                }
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
                    rows: rows,
                    fields: board !== null ? board.fields : null
                };
                settings.backlogSettings.push(boardSettings);
            }
            return settings;
        } catch (e) {
            Promise.reject(e);
        }
    }

    private async applyTeamSettingsAsync(oldSettings: IBoardSettings, settingsToApply: IBoardSettings, selectedMappings: IBoardColumnDifferences[]): Promise<Boolean> {
        let result: Boolean = false;
        let workClient: WorkClient.WorkHttpClient2_3 = WorkClient.getClient();
        let witClient = WitClient.getClient();

        let context = oldSettings.context;
        console.log("Old settings");
        console.log(oldSettings);
        console.log("Settings to apply");
        console.log(settingsToApply);
        try {
            for (let backlogIndex = 0; backlogIndex < settingsToApply.backlogSettings.length; backlogIndex++) {
                let backlogSettingToApply = settingsToApply.backlogSettings[backlogIndex];
                console.log(`Processing backlog [${backlogSettingToApply.boardName}]`);
                let cardSettings = await workClient.updateBoardCardSettings(backlogSettingToApply.cardSettings, context, backlogSettingToApply.boardName);
                let cardRules = await workClient.updateBoardCardRuleSettings(backlogSettingToApply.cardRules, context, backlogSettingToApply.boardName);
                let columnsToApply: WorkContracts.BoardColumn[] = new Array();

                let oldBoard: IBacklogBoardSettings;
                oldSettings.backlogSettings.forEach(board => {
                    if (board.boardName === backlogSettingToApply.boardName) {
                        oldBoard = board;
                    }
                });

                let selectedMapping: IBoardColumnDifferences;
                selectedMappings.forEach(cd => {
                    if (cd.backlog === backlogSettingToApply.boardName) {
                        selectedMapping = cd;
                    }
                });

                let uniqueNameifier = Date.now().toString() + "-";

                let newRows: WorkContracts.BoardRow[] = await this._applyNewRows(oldBoard.rows, backlogSettingToApply.rows, uniqueNameifier, backlogSettingToApply.boardName, context, workClient);
                let newDefaultRow: WorkContracts.BoardRow = this._getDefaultRow(newRows);
                let newDefaultRowName: string = null;
                if (newDefaultRow) {
                    newDefaultRowName = newDefaultRow.name;
                }

                let oldActiveColumns = oldBoard.columns.filter(c => c.columnType === WorkContracts.BoardColumnType.InProgress);

                // Create new colums first
                backlogSettingToApply.columns.forEach(columnToCreate => {
                    if (columnToCreate.columnType !== WorkContracts.BoardColumnType.InProgress) {
                        // keep id the same to avoid creating a new column (should only change name)
                        columnToCreate.id = selectedMapping.mappings.filter(c => c.sourceColumn.id === columnToCreate.id)[0].targetColumn.id;
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
                console.log("Creating intermediate board with columns:");
                console.log(columnsToApply);
                let intermediateColumns = await workClient.updateBoardColumns(columnsToApply, context, backlogSettingToApply.boardName);

                // Move work items to new mappings
                // Get work items for current board
                let wiql: WitContracts.Wiql = {
                    query: BoardConfiguration.BaseWiql
                };

                let teamSettings = await workClient.getTeamSettings(context);
                let teamFieldValues = await workClient.getTeamFieldValues(context);

                // Get work items for the right backlog level
                let workItemTypes = "'" + backlogSettingToApply.boardWorkItemTypes[0] + "'";
                if (backlogSettingToApply.boardWorkItemTypes.length > 1) {
                    for (let workItemTypeIndex = 1; workItemTypeIndex < backlogSettingToApply.boardWorkItemTypes.length; workItemTypeIndex++) {
                        workItemTypes += ", '" + backlogSettingToApply.boardWorkItemTypes[workItemTypeIndex] + "'";
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

                let boardColumnField = oldBoard.fields.columnField.referenceName;
                let boardRowField = oldBoard.fields.rowField.referenceName;

                wiql.query = wiql.query.replace(BoardConfiguration.WiqlWorkItemTypes, workItemTypes);
                wiql.query = wiql.query.replace(BoardConfiguration.WiqlIteration, teamSettings.backlogIteration.name);
                wiql.query = wiql.query.replace(BoardConfiguration.WiqlRootArea, areaQuery);
                wiql.query = wiql.query.replace(BoardConfiguration.WiqlBoardColumns, wiqlColumns);
                wiql.query = wiql.query.replace(BoardConfiguration.WiqlWorkItemColumnField, boardColumnField);

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
                        let columnFields = fieldNames.filter(f => boardColumnField === f);
                        let columnField = "";
                        if (columnFields && columnFields.length > 0) {
                            columnField = columnFields[0];
                        } else {
                            console.log("No column field found");
                        }
                        let witColumn = wit.fields[columnField];
                        let matchedColumns = selectedMapping.mappings.filter(m => m.targetColumn.name === witColumn);
                        if (matchedColumns && matchedColumns.length > 0) {
                            let mappedColumn = matchedColumns[0];
                            console.log("Using column mapping:");
                            console.log(mappedColumn);

                            // If the intermediate columns contains a temporary column for our source column, we should move our items there
                            let newColumnFieldValue: string = mappedColumn.sourceColumn.name;
                            let tempColumnNameToFind = uniqueNameifier + mappedColumn.sourceColumn.name;
                            if (intermediateColumns.some(c => c.name === tempColumnNameToFind)) {
                                newColumnFieldValue = intermediateColumns.filter(c => c.name === tempColumnNameToFind)[0].name;
                            }

                            let patch = [
                                {
                                    "op": "replace",
                                    "path": `/fields/${columnField}`,
                                    "value": newColumnFieldValue
                                }
                            ];

                            // If the target board has a row name that is exactly the same as a row in the source board, we update work items to stay in that row.
                            // Otherwise, we'll move them to the default row. This way we avoid having to do a complete mapping exercise, while still having some intelligent behavior.
                            let currentRowValue: string = wit.fields[boardRowField];
                            let shouldUpdateRowName: boolean = currentRowValue != null && newRows.filter(r => r.name === uniqueNameifier + currentRowValue).length > 0;
                            if (shouldUpdateRowName) {
                                patch.push({
                                    "op": "replace",
                                    "path": `/fields/${boardRowField}`,
                                    "value": `${uniqueNameifier}${currentRowValue}`
                                });
                            } else {
                                patch.push({
                                    "op": "remove",
                                    "path": `/fields/${boardRowField}`,
                                    "value": null
                                });
                            }
                            console.log("Updating work item from column: " + witColumn + " to column: " + JSON.stringify(patch));
                            await witClient.updateWorkItem(patch, wits[witIndex].id, false, true);
                        }
                    }
                } else {
                    console.log("No work items found");
                }

                newRows = await this._cleanUpRows(newRows, backlogSettingToApply.rows, uniqueNameifier, backlogSettingToApply.boardName, context, workClient);

                // Delete old columns
                columnsToApply = new Array();
                intermediateColumns.forEach(column => {
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
                let finalColumns = await workClient.updateBoardColumns(columnsToApply, context, backlogSettingToApply.boardName);
            }
            result = true;
        } catch (ex) {
            console.log("Error " + ex);
            Promise.reject(ex);
        }
        console.log("Finish apply");
        return result;
    }

    private async _applyNewRows(outgoingRows: WorkContracts.BoardRow[], incomingRows: WorkContracts.BoardRow[], uniqueNameifier: string, boardName: string, context: CoreContracts.TeamContext, client: WorkClient.WorkHttpClient2_3): Promise<WorkContracts.BoardRow[]> {
        let outgoingDefaultRow = this._getDefaultRow(outgoingRows);
        let incomingDefaultRow = this._getDefaultRow(incomingRows);
        if (!outgoingDefaultRow || !incomingDefaultRow) {
            return;
        }
        outgoingDefaultRow.name = incomingDefaultRow.name;
        let desiredRows = outgoingRows;
        incomingRows.forEach(row => {
            if (row.id !== BoardConfiguration.DefaultRowId) {
                let newRow: WorkContracts.BoardRow = {
                    name: uniqueNameifier + row.name,
                    id: ""
                };
                desiredRows.push(newRow);
            }
        });
        let allRows = await client.updateBoardRows(desiredRows, context, boardName);
        return allRows;
    }

    private async _cleanUpRows(currentRows: WorkContracts.BoardRow[], incomingRows: WorkContracts.BoardRow[], uniqueNameifier: string, boardName: string, context: CoreContracts.TeamContext, client: WorkClient.WorkHttpClient2_3): Promise<WorkContracts.BoardRow[]> {
        let finalRows: WorkContracts.BoardRow[] = [];
        incomingRows.forEach(row => {
            if (row.id === BoardConfiguration.DefaultRowId) {
                finalRows.push(row);
            } else {
                let currentRow = this._getRowByName(currentRows, uniqueNameifier + row.name);
                if (currentRow) {
                    let finalRow: WorkContracts.BoardRow = {
                        name: row.name,
                        id: currentRow.id
                    };
                    finalRows.push(finalRow);
                }
            }
        });

        finalRows = await client.updateBoardRows(finalRows, context, boardName);
        return finalRows;
    }

    private _getRowByName(rows: WorkContracts.BoardRow[], name: string): WorkContracts.BoardRow {
        let namedRow = rows.filter(row => row.name === name);
        if (namedRow && namedRow.length > 0) {
            return namedRow[0];
        }
        return null;
    }

    private _getDefaultRow(rows: WorkContracts.BoardRow[]): WorkContracts.BoardRow {
        let defaultRows = rows.filter(row => row.id === BoardConfiguration.DefaultRowId);
        if (defaultRows && defaultRows.length > 0) {
            return defaultRows[0];
        }
        return null;
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