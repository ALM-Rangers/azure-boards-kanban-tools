import * as VSS from "azure-devops-extension-sdk";
import { CoreRestClient } from "azure-devops-extension-api/Core";
import { TeamContext, WebApiTeam } from "azure-devops-extension-api/Core";
import { WorkRestClient } from "azure-devops-extension-api/Work";
import {
  WorkItemTrackingRestClient,
  Wiql,
} from "azure-devops-extension-api/WorkItemTracking";
import {
  BoardColumn,
  BoardColumnType,
  BoardCardSettings,
  BacklogLevelConfiguration,
  Board,
  BoardRow,
} from "azure-devops-extension-api/Work";

import * as Models from "../Models/CopySettingsInterfaces";
import { ViewState } from "../Models/DialogInterfaces";
import { IBoardColumnDifferences } from "../Models/CopySettingsInterfaces";
import { getClient } from "azure-devops-extension-api";

interface TeamProperties {
  team: WebApiTeam;
  context: TeamContext;
  settings: Models.IBoardSettings;
}

export class ServicesClient {
  static BaseWiql =
    "SELECT [System.Id],[System.WorkItemType],[System.Title] FROM workitems WHERE [System.TeamProject] = @project " +
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
  private _currentBacklogLevel: string;

  constructor(private _defaultBacklogLevel: string) {
    this._currentTeamProperties = {
      team: null,
      context: null,
      settings: null,
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
      this._secondaryTeamProperties.forEach((secTeam) => {
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
    this._currentTeamProperties.settings = await this.getTeamSettingsAsync(
      this._currentTeamProperties.context
    );
    for (
      let backlogIndex = 0;
      backlogIndex <
      this._currentTeamProperties.settings.backlogSettings.length;
      backlogIndex++
    ) {
      const backlog =
        this._currentTeamProperties.settings.backlogSettings[backlogIndex];
      if (backlog.boardId === this._defaultBacklogLevel) {
        this._currentBacklogLevel = backlog.boardName;
        break;
      }
    }
  }

  public get currentBacklogLevel(): string {
    return this._currentBacklogLevel;
  }

  public async loadSelectedTeam(teamName: string, isMultiselect: boolean = false): Promise<void> {
    let team = await this.getTeam(teamName);
    let context = await this.getContextForTeamAsync(teamName);
    let settings = await this.getTeamSettingsAsync(context);

    let properties: TeamProperties = {
      team: team,
      context: context,
      settings: settings,
    };
    if (!isMultiselect) {
      this._secondaryTeamProperties = [];
      this._commonBacklogLevels = [];
    }
    if (this._commonBacklogLevels.length === 0) {
      this._commonBacklogLevels = this._getCommonBacklogLevels(
        this._currentTeamProperties.settings,
        settings
      );
    } else {
    }
    this._secondaryTeamProperties.push(properties);
    console.log("loadSelectedTeam > starting updateSourceDestinationSettings");
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
    this._secondaryTeamProperties = this._secondaryTeamProperties.splice(
      teamIndex,
      1
    );
  }

  public async getTeamsAsync(
    excludeCurrentTeam?: boolean
  ): Promise<WebApiTeam[]> {
    return new Promise<WebApiTeam[]>((resolve, reject) => {
      const webContext = VSS.getConfiguration();
      const client = getClient(CoreRestClient);
      client.getTeams(webContext.project.id).then((teams) => {
        let filteredTeams = teams;
        if (excludeCurrentTeam !== null && excludeCurrentTeam === true) {
          filteredTeams = teams.filter(
            (team) => team.id !== webContext.team.id
          );
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

  public async getTeam(teamName?: string): Promise<WebApiTeam> {
    return new Promise<WebApiTeam>((resolve, reject) => {
      const webContext = VSS.getConfiguration();

      const client = getClient(CoreRestClient);
      const teamToFind = teamName ? teamName : webContext.team.name;
      client.getTeams(webContext.project.id).then((teams) => {
        let matchedTeams = teams.filter((team) => team.name === teamToFind);
        if (matchedTeams.length > 0) {
          resolve(matchedTeams[0]);
        } else {
          reject("No team found");
        }
      });
    });
  }

  public getTeamContext(): TeamContext {
    const webContext = VSS.getConfiguration();
    let teamContext: TeamContext = {
      project: webContext.project.name,
      projectId: webContext.project.id,
      team: webContext.team.name,
      teamId: webContext.team.id,
    };
    return teamContext;
  }

  public async getContextForTeamAsync(teamName: string): Promise<TeamContext> {
    const webContext = VSS.getConfiguration();

    let teamContext: TeamContext = null;

    try {
      let team = await this.getTeam(teamName);
      teamContext = {
        project: webContext.project.name,
        projectId: webContext.project.id,
        team: team.name,
        teamId: team.id,
      };
    } catch (ex) {
      Promise.reject(ex);
    }

    return teamContext;
  }

  public get commonBackgroundLevels(): string[] {
    return this._commonBacklogLevels;
  }

  private _getCommonBacklogLevels(
    team1Settings: Models.IBoardSettings,
    team2Settings: Models.IBoardSettings
  ): string[] {
    let backlogLevels: string[] = [];
    let team1Levels = team1Settings.backlogSettings.map((item) => {
      return item.boardName;
    });
    let team2Levels = team2Settings.backlogSettings.map((item) => {
      return item.boardName;
    });

    for (let t1Index = 0; t1Index < team1Levels.length; t1Index++) {
      if (team2Levels.indexOf(team1Levels[t1Index]) >= 0) {
        backlogLevels.push(team1Levels[t1Index]);
      }
    }
    return backlogLevels;
  }

  public getTeamColumnDifferences(
    sourceTeamSettings: Models.IBoardSettings,
    targetTeamSettings: Models.IBoardSettings
  ): Models.IBoardColumnDifferences[] {
    let differences: Models.IBoardColumnDifferences[] = new Array();
    sourceTeamSettings.backlogSettings.forEach((backlogSetting) => {
      let sourceColumns: BoardColumn[] = new Array();
      let targetColumns: BoardColumn[] = new Array();

      let mappings: Models.IColumnMapping[] = new Array();

      let targetBoard: Models.IBacklogBoardSettings;
      targetTeamSettings.backlogSettings.forEach((board) => {
        if (board.boardName === backlogSetting.boardName) {
          targetBoard = board;
        }
      });

      sourceColumns = backlogSetting.columns;
      targetColumns = targetBoard.columns;

      let sourceIncomingColumn = sourceColumns.filter(
        (c) => c.columnType === BoardColumnType.Incoming
      )[0];
      let sourceOutgoingColumn = sourceColumns.filter(
        (c) => c.columnType === BoardColumnType.Outgoing
      )[0];

      let targetIncomingColumn = targetColumns.filter(
        (c) => c.columnType === BoardColumnType.Incoming
      )[0];
      let targetOutgoingColumn = targetColumns.filter(
        (c) => c.columnType === BoardColumnType.Outgoing
      )[0];

      mappings.push({
        sourceColumn: sourceIncomingColumn,
        potentialMatches: [sourceIncomingColumn],
        targetColumn: targetIncomingColumn,
      });

      for (
        let columnIndex = 0;
        columnIndex < targetColumns.length;
        columnIndex++
      ) {
        let currentColumn = targetColumns[columnIndex];
        if (
          currentColumn.columnType === BoardColumnType.Incoming ||
          currentColumn.columnType === BoardColumnType.Outgoing
        ) {
          continue;
        }

        let similarColumns: BoardColumn[] = new Array();
        for (
          let sourceIndex = 0;
          sourceIndex < sourceColumns.length;
          sourceIndex++
        ) {
          let isSimilar = this._compareColumnStateMappings(
            currentColumn,
            sourceColumns[sourceIndex]
          );
          if (isSimilar) {
            similarColumns.push(sourceColumns[sourceIndex]);
          }
        }

        let initialSourceColumn =
          similarColumns.length > 0 ? similarColumns[0] : undefined;

        mappings.push({
          sourceColumn: initialSourceColumn,
          potentialMatches: similarColumns,
          targetColumn: currentColumn,
        });
      }

      mappings.push({
        sourceColumn: sourceOutgoingColumn,
        potentialMatches: [sourceOutgoingColumn],
        targetColumn: targetOutgoingColumn,
      });

      let difference: Models.IBoardColumnDifferences = {
        backlog: backlogSetting.boardName,
        mappings: mappings,
      };
      differences.push(difference);
    });

    return differences;
  }

  public async getTeamSettingsAsync(
    context: TeamContext
  ): Promise<Models.IBoardSettings> {
    let wrc = getClient(WorkRestClient);

    let settings: Models.IBoardSettings = {
      name: "Settings - " + context.team,
      teamName: context.team,
      version: "1.0",
      backlogSettings: new Array<Models.IBacklogBoardSettings>(),
      context: context,
      teamSettings: null,
    };

    let boardCards: BoardCardSettings[] = new Array();
    let backlogs = await wrc.getBacklogConfigurations(context);
    let allBacklogs: BacklogLevelConfiguration[] = [];
    allBacklogs = backlogs.portfolioBacklogs;
    allBacklogs.push(backlogs.requirementBacklog);
    allBacklogs = allBacklogs.sort((a, b) => {
      return b.rank - a.rank;
    });
    try {
      let teams = await wrc.getTeamSettings(context);
      settings.teamSettings = {
        bugsBehavior: teams.bugsBehavior,
      };

      for (
        let backlogIndex = 0;
        backlogIndex < allBacklogs.length;
        backlogIndex++
      ) {
        let backlog = allBacklogs[backlogIndex];
        console.log(
          "Getting settings for board " +
          backlog.name +
          " (" +
          backlog.id +
          ") of team " +
          context.team
        );
        let board: Board = null;
        try {
          board = await wrc.getBoard(context, backlog.name);
        } catch (e) {
          board = null;
        }
        if (board) {
          if (this._defaultBacklogLevel === "")
            this._defaultBacklogLevel = board.id;

          let cardSettings = await wrc.getBoardCardSettings(
            context,
            backlog.name
          );
          let cardRules = await wrc.getBoardCardRuleSettings(
            context,
            backlog.name
          );
          let columns = await wrc.getBoardColumns(context, backlog.name);
          let rows = await wrc.getBoardRows(context, backlog.name);
          let boardSettings: Models.IBacklogBoardSettings = {
            boardName: backlog.name,
            boardWorkItemTypes: backlog.workItemTypes.map((wit) => wit.name),
            cardRules: cardRules,
            cardSettings: cardSettings,
            columns: columns,
            rows: rows,
            boardId: board.id,
            fields: board !== null ? board.fields : null,
          };

          settings.backlogSettings.push(boardSettings);
        }
      }
      return settings;
    } catch (e) {
      Promise.reject(e);
    }
  }

  // public async applyTeamSettingsAsync(oldSettings: Models.IBoardSettings, settingsToApply: Models.IBoardSettings, selectedMappings: Models.IBoardColumnDifferences[], selectedBacklogLevels: string[]): Promise<Boolean> {
  public async applyTeamSettingsAsync(selectedBacklogLevels: string[]): Promise<Boolean> {
    let result: Boolean = false;
    let wrc = getClient(WorkRestClient);
    let witrc = getClient(WorkItemTrackingRestClient);

    let context = this._destinationTeamSettings[0].context;
    console.log("Old settings");
    console.log(this._destinationTeamSettings[0]);
    console.log("Settings to apply");
    console.log(this._sourceTeamSettings);
    try {
      let bugSettings: any = {
        bugsBehavior: this._sourceTeamSettings.teamSettings.bugsBehavior,
      };
      await wrc.updateTeamSettings(bugSettings, context);

      for (
        let backlogIndex = 0;
        backlogIndex < this._sourceTeamSettings.backlogSettings.length;
        backlogIndex++
      ) {
        let backlogSettingToApply = this._sourceTeamSettings.backlogSettings[backlogIndex];
        if (selectedBacklogLevels.indexOf(backlogSettingToApply.boardName) < 0) {
          continue;
        }
        console.log(`Processing backlog [${backlogSettingToApply.boardName}]`);

        let cardSettings = await wrc.updateBoardCardSettings(
          backlogSettingToApply.cardSettings,
          context,
          backlogSettingToApply.boardName
        );
        let cardRules = await wrc.updateBoardCardRuleSettings(
          backlogSettingToApply.cardRules,
          context,
          backlogSettingToApply.boardName
        );
        let columnsToApply: BoardColumn[] = new Array();

        let oldBoard: Models.IBacklogBoardSettings;
        this._destinationTeamSettings[0].backlogSettings.forEach((board) => {
          if (board.boardName === backlogSettingToApply.boardName) {
            oldBoard = board;
          }
        });

        let selectedMapping: Models.IBoardColumnDifferences;
        this._currentMappings.forEach((cd) => {
          if (cd.backlog === backlogSettingToApply.boardName) {
            selectedMapping = cd;
          }
        });

        let uniqueNameifier = Date.now().toString() + "-";

        let newRows: BoardRow[] = await this._applyNewRows(
          oldBoard.rows,
          backlogSettingToApply.rows,
          uniqueNameifier,
          backlogSettingToApply.boardName,
          context,
          wrc
        );
        let newDefaultRow: BoardRow = this._getDefaultRow(newRows);
        let newDefaultRowName: string = null;
        if (newDefaultRow) {
          newDefaultRowName = newDefaultRow.name;
        }

        let oldActiveColumns = oldBoard.columns.filter(
          (c) => c.columnType === BoardColumnType.InProgress
        );

        // Create new colums first
        backlogSettingToApply.columns.forEach((columnToCreate) => {
          if (columnToCreate.columnType !== BoardColumnType.InProgress) {
            // keep id the same to avoid creating a new column (should only change name)
            columnToCreate.id = selectedMapping.mappings.filter(
              (c) => c.sourceColumn.id === columnToCreate.id
            )[0].targetColumn.id;
            columnsToApply.push(columnToCreate);
          } else {
            // empty id to force new column creation
            columnToCreate.id = "";
            // add a unique name so we know which one to keep later - help eliminate confusion if column names are the same
            columnToCreate.name = uniqueNameifier + columnToCreate.name;
            columnsToApply.push(columnToCreate);
            let matchedColumn = selectedMapping.mappings.filter(
              (c) => c.sourceColumn.id === columnToCreate.id
            );
            if (
              matchedColumn.length > 0 &&
              columnsToApply.filter(
                (c) => c.id === matchedColumn[0].targetColumn.id
              ).length === 0
            ) {
              columnsToApply.push(matchedColumn[0].targetColumn);
            }
          }
        });

        let outgoingColumn = columnsToApply.pop();

        oldActiveColumns.forEach((oldColumn) => {
          if (
            columnsToApply.filter((c) => c.id === oldColumn.id).length === 0
          ) {
            columnsToApply.push(oldColumn);
          }
        });

        columnsToApply.push(outgoingColumn);
        console.log("Creating intermediate board with columns:");
        console.log(columnsToApply);
        let intermediateColumns = await wrc.updateBoardColumns(
          columnsToApply,
          context,
          backlogSettingToApply.boardName
        );

        // Move work items to new mappings
        // Get work items for current board
        let wiql: Wiql = {
          query: ServicesClient.BaseWiql,
        };

        let teamSettings = await wrc.getTeamSettings(context);
        let teamFieldValues = await wrc.getTeamFieldValues(context);

        // Get work items for the right backlog level
        let workItemTypes =
          "'" + backlogSettingToApply.boardWorkItemTypes[0] + "'";
        if (backlogSettingToApply.boardWorkItemTypes.length > 1) {
          for (
            let workItemTypeIndex = 1;
            workItemTypeIndex < backlogSettingToApply.boardWorkItemTypes.length;
            workItemTypeIndex++
          ) {
            workItemTypes +=
              ", '" +
              backlogSettingToApply.boardWorkItemTypes[workItemTypeIndex] +
              "'";
          }
        }

        let activeColumns = selectedMapping.mappings.filter(
          (m) => m.targetColumn.columnType === BoardColumnType.InProgress
        );
        let wiqlColumns = "";
        if (activeColumns.length > 0) {
          wiqlColumns = "'" + activeColumns[0].targetColumn.name + "'";
          for (
            let columnIndex = 1;
            columnIndex < activeColumns.length;
            columnIndex++
          ) {
            wiqlColumns +=
              ", '" + activeColumns[columnIndex].targetColumn.name + "'";
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

        wiql.query = wiql.query.replace(
          ServicesClient.WiqlWorkItemTypes,
          workItemTypes
        );
        wiql.query = wiql.query.replace(
          ServicesClient.WiqlIteration,
          teamSettings.backlogIteration.name
        );
        wiql.query = wiql.query.replace(ServicesClient.WiqlRootArea, areaQuery);
        wiql.query = wiql.query.replace(
          ServicesClient.WiqlBoardColumns,
          wiqlColumns
        );
        wiql.query = wiql.query.replace(
          ServicesClient.WiqlWorkItemColumnField,
          boardColumnField
        );

        let witIds: number[] = new Array();
        console.log("query by wiql " + wiql.query);
        let witQuery = await witrc.queryByWiql(
          wiql,
          context.project,
          context.team,
        );
        witIds = witQuery.workItems.map((wit) => wit.id);
        console.log("get work items");
        if (witIds.length > 0) {
          let wits = await witrc.getWorkItems(witIds);
          console.log("got " + wits.length + " work items");
          for (let witIndex = 0; witIndex < wits.length; witIndex++) {
            let wit = wits[witIndex];
            let fieldNames = Object.keys(wit.fields);
            fieldNames.sort();
            let columnFields = fieldNames.filter((f) => boardColumnField === f);
            let columnField = "";
            if (columnFields && columnFields.length > 0) {
              columnField = columnFields[0];
            } else {
              console.log("No column field found");
            }
            let witColumn = wit.fields[columnField];
            let matchedColumns = selectedMapping.mappings.filter(
              (m) => m.targetColumn.name === witColumn
            );
            if (matchedColumns && matchedColumns.length > 0) {
              let mappedColumn = matchedColumns[0];
              console.log("Using column mapping:");
              console.log(mappedColumn);

              // If the intermediate columns contains a temporary column for our source column, we should move our items there
              let newColumnFieldValue: string = mappedColumn.sourceColumn.name;
              let tempColumnNameToFind =
                uniqueNameifier + mappedColumn.sourceColumn.name;
              if (
                intermediateColumns.some((c) => c.name === tempColumnNameToFind)
              ) {
                newColumnFieldValue = intermediateColumns.filter(
                  (c) => c.name === tempColumnNameToFind
                )[0].name;
              }

              let patch = [
                {
                  op: "replace",
                  path: `/fields/${columnField}`,
                  value: newColumnFieldValue,
                },
              ];

              // If the target board has a row name that is exactly the same as a row in the source board, we update work items to stay in that row.
              // Otherwise, we'll move them to the default row. This way we avoid having to do a complete mapping exercise, while still having some intelligent behavior.
              let currentRowValue: string = wit.fields[boardRowField];
              let shouldUpdateRowName: boolean =
                currentRowValue != null &&
                newRows.filter(
                  (r) => r.name === uniqueNameifier + currentRowValue
                ).length > 0;
              if (shouldUpdateRowName) {
                patch.push({
                  op: "replace",
                  path: `/fields/${boardRowField}`,
                  value: `${uniqueNameifier}${currentRowValue}`,
                });
              } else {
                patch.push({
                  op: "remove",
                  path: `/fields/${boardRowField}`,
                  value: null,
                });
              }
              console.log(
                "Updating work item from column: " +
                witColumn +
                " to column: " +
                JSON.stringify(patch)
              );
              await witrc.updateWorkItem(
                patch,
                wits[witIndex].id,
                context.projectId,
                false,
                true
              );
            }
          }
        } else {
          console.log("No work items found");
        }

        newRows = await this._cleanUpRows(
          newRows,
          backlogSettingToApply.rows,
          uniqueNameifier,
          backlogSettingToApply.boardName,
          context,
          wrc
        );

        // Delete old columns
        columnsToApply = new Array();
        intermediateColumns.forEach((column) => {
          if (column.columnType === BoardColumnType.InProgress) {
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
        let finalColumns = await wrc.updateBoardColumns(
          columnsToApply,
          context,
          backlogSettingToApply.boardName
        );
      }
      result = true;
    } catch (ex) {
      console.log("Error " + ex);
      Promise.reject(ex);
    }
    console.log("Finish apply");
    return result;
  }

  private async _applyNewRows(
    outgoingRows: BoardRow[],
    incomingRows: BoardRow[],
    uniqueNameifier: string,
    boardName: string,
    context: TeamContext,
    client: WorkRestClient
  ): Promise<BoardRow[]> {
    let outgoingDefaultRow = this._getDefaultRow(outgoingRows);
    let incomingDefaultRow = this._getDefaultRow(incomingRows);
    if (!outgoingDefaultRow || !incomingDefaultRow) {
      return;
    }
    outgoingDefaultRow.name = incomingDefaultRow.name;
    let desiredRows = outgoingRows;
    incomingRows.forEach((row) => {
      if (row.id !== ServicesClient.DefaultRowId) {
        let newRow: BoardRow = {
          name: uniqueNameifier + row.name,
          id: "",
          color: null,
        };
        desiredRows.push(newRow);
      }
    });
    let allRows = await client.updateBoardRows(desiredRows, context, boardName);
    return allRows;
  }

  private async _cleanUpRows(
    currentRows: BoardRow[],
    incomingRows: BoardRow[],
    uniqueNameifier: string,
    boardName: string,
    context: TeamContext,
    client: WorkRestClient
  ): Promise<BoardRow[]> {
    let finalRows: BoardRow[] = [];
    incomingRows.forEach((row) => {
      if (row.id === ServicesClient.DefaultRowId) {
        finalRows.push(row);
      } else {
        let currentRow = this._getRowByName(
          currentRows,
          uniqueNameifier + row.name
        );
        if (currentRow) {
          let finalRow: BoardRow = {
            name: row.name,
            id: currentRow.id,
            color: null,
          };
          finalRows.push(finalRow);
        }
      }
    });

    finalRows = await client.updateBoardRows(finalRows, context, boardName);
    return finalRows;
  }

  private _getRowByName(rows: BoardRow[], name: string): BoardRow {
    let namedRow = rows.filter((row) => row.name === name);
    if (namedRow && namedRow.length > 0) {
      return namedRow[0];
    }
    return null;
  }

  private _getDefaultRow(rows: BoardRow[]): BoardRow {
    let defaultRows = rows.filter(
      (row) => row.id === ServicesClient.DefaultRowId
    );
    if (defaultRows && defaultRows.length > 0) {
      return defaultRows[0];
    }
    return null;
  }

  private _compareColumnStateMappings(
    c1: BoardColumn,
    c2: BoardColumn
  ): boolean {
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
        if (typeof x[p] !== "object") {
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
