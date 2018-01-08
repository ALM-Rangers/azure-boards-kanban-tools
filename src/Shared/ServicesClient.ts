import * as Service from "VSS/Service";
import * as CoreRestClient from "TFS/Core/RestClient";
import * as CoreContracts from "TFS/Core/Contracts";
import * as WorkClient from "TFS/Work/RestClient";
import * as WitClient from "TFS/WorkItemTracking/RestClient";
import * as WorkContracts from "TFS/Work/Contracts";
import * as WitContracts from "TFS/WorkItemTracking/Contracts";

import * as Models from "src/Views/CopySettings/Models/CopySettingsInterfaces";
import { ViewState } from "src/Views/Dialog/Models/DialogInterfaces";
import { IBoardColumnDifferences } from "src/Views/CopySettings/Models/CopySettingsInterfaces";

interface TeamProperties {
    team: CoreContracts.WebApiTeam;
    context: CoreContracts.TeamContext;
    settings: Models.IBoardSettings;
}

export class ServicesClient {

    static BaseWiql = "SELECT [System.Id],[System.WorkItemType],[System.Title] FROM workitems WHERE [System.TeamProject] = @project " +
        "AND [System.WorkItemType] in (@WorkItemTypes) AND [@WITField] in (@OldBoardColumns) and (@RootArea) and System.IterationPath UNDER '@RootIteration'";

    static WiqlWorkItemTypes = "@WorkItemTypes";
    static WiqlBoardColumns = "@OldBoardColumns";
    static WiqlRootArea = "@RootArea";
    static WiqlIteration = "@RootIteration";
    static WiqlWorkItemColumnField = "@WITField";
    static DefaultRowId = "00000000-0000-0000-0000-000000000000";

    private _currentTeamProperties: TeamProperties;
    private _secondaryTeamProperties: TeamProperties[];
    private _commonBacklogLevels: string[];
    private _viewState: ViewState;

    private _sourceTeamSettings: Models.IBoardSettings;
    private _destinationTeamSettings: Models.IBoardSettings[];
    private _currentMappings: IBoardColumnDifferences[];

    constructor() {
        this._currentTeamProperties = {
            team: null,
            context: null,
            settings: null
        };
        this._secondaryTeamProperties = [];
        this._viewState = null;
    }

    public setViewState(viewState: ViewState): boolean {
        if (this._viewState !== viewState) {
            this._viewState = viewState;
            this._updateSourceDestinationSettings();
            return true;
        }
        return false;
    }

    private _updateSourceDestinationSettings() {
        if (this._currentTeamProperties.team === null || this._secondaryTeamProperties.length === 0) {
            return;
        }

        if (this._viewState === ViewState.CopySettingsToTeam) {
            this._sourceTeamSettings = this._currentTeamProperties.settings;
            this._destinationTeamSettings = [];
            this._secondaryTeamProperties.forEach(secTeam => {
                this._destinationTeamSettings.push(secTeam.settings);
            });
            this._currentMappings = this.getTeamColumnDifferences(this._sourceTeamSettings, this._destinationTeamSettings[0]);
        } else if (this._viewState === ViewState.CopySettingsFromTeam) {
            this._sourceTeamSettings = this._secondaryTeamProperties[0].settings;
            this._destinationTeamSettings = [];
            this._destinationTeamSettings.push(this._currentTeamProperties.settings);
            this._currentMappings = this.getTeamColumnDifferences(this._sourceTeamSettings, this._destinationTeamSettings[0]);
        }
    }

    public get currentMappings(): IBoardColumnDifferences[] {
        return this._currentMappings;
    }

    public async loadCurrentTeam(): Promise<void> {
        this._currentTeamProperties.team = await this.getTeam();
        this._currentTeamProperties.context = this.getTeamContext();
        this._currentTeamProperties.settings = await this.getTeamSettingsAsync(this._currentTeamProperties.context);
    }

    public async loadSelectedTeam(teamName: string, isMultiselect: boolean = false): Promise<void> {
        let team = await this.getTeam(teamName);
        let context = await this.getContextForTeamAsync(teamName);
        let settings = await this.getTeamSettingsAsync(context);

        let properties: TeamProperties = {
            team: team,
            context: context,
            settings: settings
        };
        if (!isMultiselect) {
            this._secondaryTeamProperties = [];
            this._commonBacklogLevels = [];
        }
        if (this._commonBacklogLevels.length === 0) {
            this._commonBacklogLevels = this._getCommonBacklogLevels(this._currentTeamProperties.settings, settings);
        } else {
        }
        this._secondaryTeamProperties.push(properties);
        this._updateSourceDestinationSettings();
    }

    public removeSelectedTeam(teamName: string) {
        let teamIndex = -1;
        for (let index = 0; index < this._secondaryTeamProperties.length; index++) {
            if (this._secondaryTeamProperties[index].team.name === teamName) {
                teamIndex = index;
                break;
            }
        }
        this._secondaryTeamProperties = this._secondaryTeamProperties.splice(teamIndex, 1);
    }

    public async getTeamsAsync(excludeCurrentTeam?: boolean): Promise<CoreContracts.WebApiTeam[]> {
        return new Promise<CoreContracts.WebApiTeam[]>((resolve, reject) => {
            const webContext = VSS.getWebContext();
            const client = CoreRestClient.getClient();
            client.getTeams(webContext.project.id).then(teams => {
                let filteredTeams = teams;
                if (excludeCurrentTeam !== null && excludeCurrentTeam === true) {
                    filteredTeams = teams.filter(team => team.id !== webContext.team.id);
                }
                let sortedTeams = filteredTeams.sort((team1, team2) => {
                    if (team1.name > team2.name) {
                        return 1;
                    }
                    if (team1.name < team2.name) {
                        return -1;
                    }
                    return 0;
                });
                resolve(sortedTeams);
            });
        });
    }

    public async getTeam(teamName?: string): Promise<CoreContracts.WebApiTeam> {
        return new Promise<CoreContracts.WebApiTeam>((resolve, reject) => {
            const webContext = VSS.getWebContext();
            const client = CoreRestClient.getClient();
            const teamToFind = teamName ? teamName : webContext.team.name;
            client.getTeams(webContext.project.id).then((teams) => {
                let matchedTeams = teams.filter(team => team.name === teamToFind);
                if (matchedTeams.length > 0) {
                    resolve(matchedTeams[0]);
                } else {
                    reject("No team found");
                }
            });
        });
    }

    public getTeamContext(): CoreContracts.TeamContext {
        const webContext = VSS.getWebContext();
        let teamContext: CoreContracts.TeamContext = {
            project: webContext.project.name,
            projectId: webContext.project.id,
            team: webContext.team.name,
            teamId: webContext.team.id
        };
        return teamContext;
    }

    public async getContextForTeamAsync(teamName: string): Promise<CoreContracts.TeamContext> {
        const webContext = VSS.getWebContext();

        let teamContext: CoreContracts.TeamContext = null;

        try {
            let team = await this.getTeam(teamName);
            teamContext = {
                project: webContext.project.name,
                projectId: webContext.project.id,
                team: team.name,
                teamId: team.id
            };
        } catch (ex) {
            Promise.reject(ex);
        }

        return teamContext;
    }

    public get commonBackgroundLevels(): string[] {
        return this._commonBacklogLevels;
    }

    private _getCommonBacklogLevels(team1Settings: Models.IBoardSettings, team2Settings: Models.IBoardSettings): string[] {
        let backlogLevels: string[] = [];

        let team1Levels = team1Settings.backlogSettings.map(item => {
            return item.boardName;
        });
        let team2Levels = team2Settings.backlogSettings.map(item => {
            return item.boardName;
        });

        for (let t1Index = 0; t1Index < team1Levels.length; t1Index++) {
            if (team2Levels.indexOf(team1Levels[t1Index]) >= 0) {
                backlogLevels.push(team1Levels[t1Index]);
            }
        }
        return backlogLevels;
    }

    public getTeamColumnDifferences(sourceTeamSettings: Models.IBoardSettings, targetTeamSettings: Models.IBoardSettings): Models.IBoardColumnDifferences[] {
        let differences: Models.IBoardColumnDifferences[] = new Array();
        sourceTeamSettings.backlogSettings.forEach(backlogSetting => {
            let sourceColumns: WorkContracts.BoardColumn[] = new Array();
            let targetColumns: WorkContracts.BoardColumn[] = new Array();

            let mappings: Models.IColumnMapping[] = new Array();

            let targetBoard: Models.IBacklogBoardSettings;
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

            let difference: Models.IBoardColumnDifferences = {
                backlog: backlogSetting.boardName,
                mappings: mappings
            };
            differences.push(difference);
        });

        return differences;
    }

    public async getTeamSettingsAsync(context: CoreContracts.TeamContext): Promise<Models.IBoardSettings> {
        let workClient = WorkClient.getClient();

        let settings: Models.IBoardSettings = {
            name: "Settings - " + context.team,
            teamName: context.team,
            version: "1.0",
            backlogSettings: new Array<Models.IBacklogBoardSettings>(),
            context: context
        };

        let boardCards: WorkContracts.BoardCardSettings[] = new Array();
        let backlogs = await workClient.getBacklogConfigurations(context);
        let allBacklogs: WorkContracts.BacklogLevelConfiguration[] = [];
        allBacklogs = backlogs.portfolioBacklogs;
        allBacklogs.push(backlogs.requirementBacklog);
        allBacklogs = allBacklogs.sort((a, b) => {
            return b.rank - a.rank;
        });
        try {
            for (let backlogIndex = 0; backlogIndex < allBacklogs.length; backlogIndex++) {
                let backlog = allBacklogs[backlogIndex];
                console.log("Getting settings for board " + backlog.name + " (" + backlog.id + ") of team " + context.team);
                let board: WorkContracts.Board = null;
                try {
                    board = await workClient.getBoard(context, backlog.name);
                } catch (e) {
                    board = null;
                }
                if (board) {
                    let cardSettings = await workClient.getBoardCardSettings(context, backlog.name);
                    let cardRules = await workClient.getBoardCardRuleSettings(context, backlog.name);
                    let columns = await workClient.getBoardColumns(context, backlog.name);
                    let rows = await workClient.getBoardRows(context, backlog.name);
                    let boardSettings: Models.IBacklogBoardSettings = {
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
            }
            return settings;
        } catch (e) {
            Promise.reject(e);
        }
    }

    public async applyTeamSettingsAsync(oldSettings: Models.IBoardSettings, settingsToApply: Models.IBoardSettings, selectedMappings: Models.IBoardColumnDifferences[], selectedBacklogLevels: string[]): Promise<Boolean> {
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
                if (selectedBacklogLevels.indexOf(backlogSettingToApply.boardName) < 0) {
                    continue;
                }
                console.log(`Processing backlog [${backlogSettingToApply.boardName}]`);
                let cardSettings = await workClient.updateBoardCardSettings(backlogSettingToApply.cardSettings, context, backlogSettingToApply.boardName);
                let cardRules = await workClient.updateBoardCardRuleSettings(backlogSettingToApply.cardRules, context, backlogSettingToApply.boardName);
                let columnsToApply: WorkContracts.BoardColumn[] = new Array();

                let oldBoard: Models.IBacklogBoardSettings;
                oldSettings.backlogSettings.forEach(board => {
                    if (board.boardName === backlogSettingToApply.boardName) {
                        oldBoard = board;
                    }
                });

                let selectedMapping: Models.IBoardColumnDifferences;
                selectedMappings.forEach(cd => {
                    if (cd.backlog === backlogSettingToApply.boardName) {
                        selectedMapping = cd;
                    }
                });

                let uniqueNameifier = Date.now().toString() + "-";

                let newRows = await this._applyNewRows(oldBoard.rows, backlogSettingToApply.rows, uniqueNameifier, backlogSettingToApply.boardName, context, workClient);
                let newDefaultRow = this._getDefaultRow(newRows);
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
                    query: ServicesClient.BaseWiql
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

                wiql.query = wiql.query.replace(ServicesClient.WiqlWorkItemTypes, workItemTypes);
                wiql.query = wiql.query.replace(ServicesClient.WiqlIteration, teamSettings.backlogIteration.name);
                wiql.query = wiql.query.replace(ServicesClient.WiqlRootArea, areaQuery);
                wiql.query = wiql.query.replace(ServicesClient.WiqlBoardColumns, wiqlColumns);
                wiql.query = wiql.query.replace(ServicesClient.WiqlWorkItemColumnField, boardColumnField);

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
                            if (newDefaultRowName && newDefaultRowName.length > 0) {
                                patch.push({
                                    "op": "replace",
                                    "path": `/fields/${boardRowField}`,
                                    "value": newDefaultRowName
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
            if (row.id !== ServicesClient.DefaultRowId) {
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
            if (row.id === ServicesClient.DefaultRowId) {
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
        let defaultRows = rows.filter(row => row.id === ServicesClient.DefaultRowId);
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
    public equals(x: any, y: any): boolean {
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