import StatusIndicator = require("VSS/Controls/StatusIndicator");
import Controls = require("VSS/Controls");
import WorkContracts = require("TFS/Work/Contracts");

import * as tc from "TelemetryClient";
import telemetryClientSettings = require("../telemetryClientSettings");

import { BoardConfiguration, IBoardColumnDifferences, IBoardSettings } from "../board_configuration";
import { SelectedTeam } from "../TeamSelectorControl";

// Placeholders for pure JavaScript functions
declare function initializePivots(): void;
declare function initializeDropdowns(): void;

export class WorkItemMappingPage {
    public RefreshBoardDifferences: boolean = true;
    public OnMappingValidated: (validationResult: boolean, failedBacklog?: string) => void;

    private _boardDifferences: IBoardColumnDifferences[];

    constructor() {

    }

    /**
     * Gets the board differences and presents them in a mapping dialog so the user can select which columns to map
     * Gets the data and then calls _createBacklogPivots() to create the actual dialog
     * Board differences are stored in this._boardDifferences
     */
    public async SetWorkItemMappingContentAsync(sourceTeam: SelectedTeam, destinationTeam: SelectedTeam) {
        let rootContainer = $("#itemMappings");
        let waitControlOptions: StatusIndicator.IWaitControlOptions = {
            cancellable: false,
            message: "Loading...."
        };

        let waitControl = Controls.create(StatusIndicator.WaitControlO, rootContainer, waitControlOptions);

        if (this.RefreshBoardDifferences) {
            waitControl.startWait();

            this.RefreshBoardDifferences = false;
            let boardService = new BoardConfiguration();
            let sourceSettings: IBoardSettings;
            let targetSettings: IBoardSettings;

            try {
                sourceSettings = await boardService.getCurrentConfigurationAsync(sourceTeam.team.name);
                targetSettings = await boardService.getCurrentConfigurationAsync(destinationTeam.team.name);
            } catch (e) {
                console.log(`Failed getting source or target board settings: ${e}`);
                tc.TelemetryClient.getClient(telemetryClientSettings.settings).trackException(`Failed getting source or target board settings: ${e.message}`);
                throw e;
            } finally {
                waitControl.endWait();
            }

            try {
                this._boardDifferences = boardService.getTeamColumnDifferences(sourceSettings, targetSettings);
                console.log(this._boardDifferences);
            } catch (e) {
                console.log(`Failed getting board differences: ${e}`);
                tc.TelemetryClient.getClient(telemetryClientSettings.settings).trackException(`Failed getting board differences: ${e.message}`);
                throw e;
            } finally {
                waitControl.endWait();
            }

            try {
                this._createBacklogPivots();
            } catch (e) {
                console.log(`Failed to create backlog pivots: ${e}`);
                tc.TelemetryClient.getClient(telemetryClientSettings.settings).trackException(`Failed to create backlog pivots: ${e.message}`);
                throw e;
            } finally {
                waitControl.endWait();
            }
        }
    }

    public GetBoardMappings(): IBoardColumnDifferences[] {
        return this._boardDifferences;
    }

        /**
     * Creates the backlog pivot to include in the main dialog for the work item column mappings
     * Will create a pivot page for each board level (e.g. "Epic", "Features", "Backlog Items") and call _createPivotContent to populate the pivot page
     * @private
     * @memberof CopySettingsWizard
     */
    private _createBacklogPivots() {
        let $pivotMenu = $("#pivot-menu");
        let $pivotContainer = $("#pivot-container");

        this._boardDifferences.forEach((difference, index, allDifferences) => {
            console.log(`Creating pivot for backlog ${difference.backlog}`);
            try {
                let $menu = this._createPivotHeader(difference.backlog);
                if (index === 0) {
                    $menu.addClass("is-selected");
                }

                let $content = this._createPivotContent(difference);
                $menu.appendTo($pivotMenu);
                $content.appendTo($pivotContainer);
            } catch (e) {
                console.log(`Failed creating pivot for backlog ${difference.backlog}`);
                tc.TelemetryClient.getClient(telemetryClientSettings.settings).trackException(`Failed to create pivot for backlog ${difference.backlog}: ${e.message}`);
                throw e;
            }
        });

        try {
            initializePivots();
        } catch (e) {
            console.log(`Failed initializing pivots: ${e}`);
            tc.TelemetryClient.getClient(telemetryClientSettings.settings).trackException(`Failed initializing pivots: ${e.message}`);
            throw e;
        }

        try {
            initializeDropdowns();
        } catch (e) {
            console.log(`Failed initializing dropdowns: ${e}`);
            tc.TelemetryClient.getClient(telemetryClientSettings.settings).trackException(`Failed to initialize dropdowns: ${e.message}`);
            throw e;
        }
    }

    /**
     * Creates a header for a pivot page
     * @private
     * @param {string} backlogLevel
     * @returns {JQuery}
     * @memberof CopySettingsWizard
     */
    private _createPivotHeader(backlogLevel: string): JQuery {
        return $("<li />")
            .attr("data-content", backlogLevel)
            .attr("title", backlogLevel)
            .attr("tabindex", "1")
            .addClass("ms-Pivot-link")
            .text(backlogLevel);
    }

    /**
     * Creates the content for a single pivot page. Will take the board differences for a single backlog level and call _createDropdown to create a combobox for each work item type
     * @private
     * @param {IBoardColumnDifferences} differences
     * @returns {JQuery}
     * @memberof CopySettingsWizard
     */
    private _createPivotContent(differences: IBoardColumnDifferences): JQuery {
        let $div = $("<div />")
            .addClass("ms-Pivot-content")
            .attr("data-content", differences.backlog);
        $("<label />")
            .addClass("ms-Label")
            .text("Work items in existing columns will need to be mapped to their new target states.")
            .appendTo($div);
        let $grid = $("<div />").addClass("ms-Grid");
        $("<div />").addClass("ms-Grid-row")
            .append(
            $("<div />").addClass("ms-Grid-col ms-u-sm6 ms-u-md6")
                .append(
                $("<label />")
                    .addClass("ms-Label")
                    .text("Existing columns (target)")
                )
            )
            .append(
            $("<div />").addClass("ms-Grid-col ms-u-sm6 ms-u-md6")
                .append(
                $("<label />")
                    .addClass("ms-Label")
                    .text("Imported columns (source)")
                )
            )
            .appendTo($grid);
        for (let index = 0; index < differences.mappings.length; index++) {
            let $row = $("<div />").addClass("ms-Grid-row");
            let $left = $("<div />").addClass("ms-Grid-col ms-u-sm6 ms-u-md6");
            $("<label />")
                .addClass("ms-Label").addClass("mapping-label")
                .text(differences.mappings[index].targetColumn.name)
                .appendTo($left);
            let $right = $("<div />").addClass("ms-Grid-col ms-u-sm6 ms-u-md6");
            try {
                this._createDropdown(differences.backlog, differences.mappings[index].targetColumn.id, differences.mappings[index].potentialMatches).appendTo($right);
            } catch (e) {
                console.log(`Error creating dropdown for target column ${differences.mappings[index].targetColumn.name} of board ${differences.backlog}: ${e}`);
                tc.TelemetryClient.getClient(telemetryClientSettings.settings).trackException(`Error creating dropdown for target column ${differences.mappings[index].targetColumn.name} of board ${differences.backlog}: ${e.message}`);
                throw e;
            }
            $left.appendTo($row);
            $right.appendTo($row);
            $row.appendTo($grid);
        }
        $grid.appendTo($div);
        return $div;
    }

    /**
     * Creates a single combobox for selecting the mapping for a single work item type
     * @private
     * @param {WorkContracts.BoardColumn[]} options
     * @returns {JQuery}
     * @memberof CopySettingsWizard
     */
    private _createDropdown(backlog: string, targetColumnId: string, options: WorkContracts.BoardColumn[]): JQuery {
        let $div = $("<div />"); // .addClass("ms-Dropdown").attr("tabindex", 0);
        $("<i />").addClass("mapping-dropDown-caretDown ms-Icon ms-Icon--ChevronDown").appendTo($div);
        let $select = $("<select />").addClass("mapping-dropDown");
        if (options.length > 1) {
            options.forEach(item => {
                $("<option />").val(item.id).text(item.name).appendTo($select);
            });
        } else if (options.length === 1) {
            let label = $("<label />")
                .addClass("ms-Label")
                .addClass("mapping-label")
                .text(options[0].name);
            return label;
        } else {
            // Add an empty option
            $("<option />").appendTo($select);
        }
        $select.change({backlog: backlog, targetColumnId: targetColumnId}, (e) => {
            let value = $(e.target).val();
            let text = $(e.target).find(":selected").text();
            console.log("Value for target column " + e.data.targetColumnId + " on backlog " + backlog + " is now: " + value + ", " + text);
            // Set the source column of the mapping for this backlog to the selected column, which should be in the potential matches for that same column
            this._boardDifferences.filter(diff => diff.backlog === backlog)[0].mappings.filter(mapping => mapping.targetColumn.id === e.data.targetColumnId)[0].sourceColumn =
                this._boardDifferences.filter(diff => diff.backlog === backlog)[0].mappings.filter(mapping => mapping.targetColumn.id === e.data.targetColumnId)[0].potentialMatches.filter(potentialMatch => potentialMatch.id === value)[0];

            this.ValidateColumnMapping();
        });
        $select.appendTo($div);
        return $div;
    }

    /**
     * Validates all selected mappings. Used for enabling the "Next" button on the wizard.
     * There will need to be a valid mapping set in this._boardDifferences
     *
     * @private
     * @returns {boolean} Whether the mapping is valid (true) or not (false)
     *
     * @memberOf CopySettingsWizard
     */
    public ValidateColumnMapping(): boolean {
        console.log("Validating mapping");
        for ( let currentBoardIndex = 0; currentBoardIndex < this._boardDifferences.length; currentBoardIndex++ ) {
            let mappingsForCurrentBoard = this._boardDifferences[currentBoardIndex].mappings;
            for ( let currentMappingIndex = 0; currentMappingIndex < mappingsForCurrentBoard.length; currentMappingIndex++ ) {
                let currentMapping = mappingsForCurrentBoard[currentMappingIndex];
                if ( currentMapping.sourceColumn === undefined || currentMapping.targetColumn === undefined ) {
                    console.log("Mapping for board " + this._boardDifferences[currentBoardIndex].backlog + " is invalid!");
                    this.OnMappingValidated(false, this._boardDifferences[currentBoardIndex].backlog);
                    return false;
                }
            }
        }
        console.log("Mapping valid!");
        this.OnMappingValidated(true);
        return true;
    }
}