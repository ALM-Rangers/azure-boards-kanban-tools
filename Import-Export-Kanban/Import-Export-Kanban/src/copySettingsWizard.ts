/// <reference types="vss-web-extension-sdk" />

import Controls = require("VSS/Controls");
import Combos = require("VSS/Controls/Combos");
import Utils_UI = require("VSS/Utils/UI");
import WorkContracts = require("TFS/Work/Contracts");
import TeamSelector = require("./TeamSelectorControl");
import CoreRestClient = require("TFS/Core/RestClient");

import Q = require("q");

import * as NavigationControl from "./NavigationControl";

import { IBoardColumnDifferences, IBoardMapping, IColumnMapping, BoardConfiguration, IBoardSettings } from "./board_configuration";

export enum CopyBoardSettingsSettings {
    None = 0,
    FromAnotherTeam,
    ToOtherTeams
}

/* Allways keep the number in synch with the correct order (also needs to be sequential) */
enum WizardStep {
    Welcome = 0,
    Settings = 1,
    TeamSelection = 2,
    WorkItemMapping = 3,
    Confirmation = 4
}

let domElem = Utils_UI.domElem;

/**
 * Represents the operation and the user selected data to perform the copy operation.
 *
 *
 * @param {TeamSelector.SelectedTeam | TeamSelector.SelectedTeam[]} sourceTeam - the team from where the settings will be copied from
 * @param {TeamSelector.SelectedTeam} destinationTeam - the team or teams (depending on the operation type) where the settings will be copied to
 * @param {CopyBoardSettingsSettings} copyType - Type of copy operation that is going to be performed.
 */
export class CopySettings {

    public copyType: CopyBoardSettingsSettings;

    public source: TeamSelector.SelectedTeam;
    public destination: TeamSelector.SelectedTeam | TeamSelector.SelectedTeam[];

    constructor(source: TeamSelector.SelectedTeam, destination: TeamSelector.SelectedTeam | TeamSelector.SelectedTeam[], copyType: CopyBoardSettingsSettings) {
        this.source = source;
        this.destination = destination;
        this.copyType = copyType;
    }
}

/**
 * Implements a wizard for the copy operation.
 *
 * Only implements the UI (collecting input from the user (including validations).
 *
 * The wizard has 3 steps
 *  - step 1 - Settings. What kind of copy will be performed
 *  - step 2 - Team selection. select the teams or teams (depends on the settings from step 1)
 *  - step 3 - Confirmation. Show a summary of the operation that is going to be perform and allow user confirmation.
 *
 * The caller can get the data collected from the user via a callback
 *
 */
export class CopySettingsWizard {
    /** The maximum teams that will be shown on the confirmation step when multiple teams are selected. If settings will be copied
    * from more than this number, than an ... will be shown
    */
    private static MAX_NUMBER_TEAMS_TO_LIST = 15;

    private _teamSelector: TeamSelector.TeamSelectorControl;
    private _navigationControl: NavigationControl.NavigationControl;

    private _currentStep: WizardStep = WizardStep.Welcome;
    private _selectedOption: CopyBoardSettingsSettings = CopyBoardSettingsSettings.None;

    private _onCancelCallback: Function;
    private _onCopyCallback: (settings: CopySettings) => void;
    private _onTitleChangeCallback: Function;

    private _boardDifferences: IBoardColumnDifferences[] = [];
    private _boardMappings: IBoardMapping[];
    private _columnMappingCombos: Combos.Combo[];
    private _currentBoardIndex = 0;
    private _refreshBoardDifferences: boolean;
    private _sourceSettings: IBoardSettings;
    private _targetSettings: IBoardSettings;

    constructor() {

        this._teamSelector = Controls.create(TeamSelector.TeamSelectorControl, $("#teamSelector"), {
            selectionType: TeamSelector.TeamSelectionMode.MultiSelection, // We have to select either one of those. We can change the type later when we know the type
            selectionChanged: (numberSelectedTeams: number) => {
                this._onTeamSelectionChanged();
            },
            dataLoaded: () => {
                this._onTeamsLoaded();
            }
        });

        let navigate: NavigationControl.INavigation = {
            previousButton: {
                isEnabled: false, isVisible: false, onClick: this._onBack.bind(this)
            },
            nextButton: {
                isEnabled: false, isVisible: true, onClick: this._onNext.bind(this)
            },
            okButton: {
                isEnabled: true, isVisible: false, label: "Copy Settings", onClick: this._onOk.bind(this)
            },
            cancelButton: {
                isEnabled: true, isVisible: true, onClick: this._onCancel.bind(this)
            }
        };

        this._navigationControl = Controls.create(NavigationControl.NavigationControl, $("#navigation"), { Navigation: navigate });

        this._attachStepOneEvents();
    }

    private _attachStepOneEvents() {
        $("input[name='boardSettings']")
            .click((event) => { this._onSettingsChanged(event); });
    }

    /**
     * Event called when a new option setting is selected.
     *
     * Changes the background color of the container where input element is located and enables the next step
     *
     * @param {type} checkedElementEvent
     */
    private _onSettingsChanged(checkedElementEvent: JQueryEventObject): void {

        let $selectedElement = $(checkedElementEvent.target);
        let selectedOption: string = $selectedElement.val();

        if (selectedOption) {
            $(".settingsInput").removeClass("settingsInputSelected");
            $selectedElement.parents(".settingsInput").addClass("settingsInputSelected");

            this._selectedOption = CopyBoardSettingsSettings[selectedOption];
            this._navigationControl.setButtonState(NavigationControl.NavigationButtonType.NEXT, { isEnabled: true, isVisible: true });
        }
    }

    /**
     * Internal event called when a team selection is changed (a team has either been selected or unselected)
     *
     * Based if there are team selections or not, we enabled or disable the next button
     */
    private _onTeamSelectionChanged() {

        let numberSelectedTeams = this._teamSelector.getNumberSelectedTeams();

        if (this._currentStep === WizardStep.TeamSelection) {
            this._navigationControl.setButtonState(NavigationControl.NavigationButtonType.NEXT, { isEnabled: numberSelectedTeams > 0, isVisible: true });
        }
        this._refreshBoardDifferences = true;
    }

    /**
     * Called when the data is loaded.
     *
     * If the data is loaded after the user has already transioned to step 2, we may need to change the selection mode
     */
    private _onTeamsLoaded() {
        if (this._currentStep === WizardStep.TeamSelection) {
            this._setStep2TeamSelectionTypeAndTitle();
        }
    }

    /**
     * Updates the state of the buttons and the visibility of the wizards steps based on the new step
     * also updates the current step
     * @param {number} newStep - the new step
     */
    private async _updateStepStateAsync(newStep: WizardStep) {

        switch (newStep) {
            case WizardStep.Welcome:
                this._setStepTitle("Welcome!");

                this._navigationControl.setButtonState(NavigationControl.NavigationButtonType.PREVIOUS, { isEnabled: false, isVisible: false });
                this._navigationControl.setButtonState(NavigationControl.NavigationButtonType.NEXT, { isEnabled: true, isVisible: true });
                this._navigationControl.setButtonState(NavigationControl.NavigationButtonType.OK, { isEnabled: false, isVisible: false });
            break;

            case WizardStep.Settings:
                this._setStepTitle("Copy Kanban board settings");
                this._navigationControl.setButtonState(NavigationControl.NavigationButtonType.PREVIOUS, { isEnabled: true, isVisible: true });
                this._navigationControl.setButtonState(NavigationControl.NavigationButtonType.NEXT, { isEnabled: this._selectedOption !== CopyBoardSettingsSettings.None, isVisible: true });
                this._navigationControl.setButtonState(NavigationControl.NavigationButtonType.PREVIOUS, { isEnabled: true, isVisible: true });
                break;

            case WizardStep.TeamSelection:

                this._setStep2TeamSelectionTypeAndTitle();

                this._navigationControl.setButtonState(NavigationControl.NavigationButtonType.PREVIOUS, { isEnabled: true, isVisible: true });
                this._navigationControl.setButtonState(NavigationControl.NavigationButtonType.NEXT, { isEnabled: this._teamSelector.getNumberSelectedTeams() > 0, isVisible: true });
                this._navigationControl.setButtonState(NavigationControl.NavigationButtonType.OK, { isEnabled: false, isVisible: false });

                break;

            case WizardStep.WorkItemMapping:

                await this._setWorkItemMappingContentAsync();

                this._navigationControl.setButtonState(NavigationControl.NavigationButtonType.PREVIOUS, { isEnabled: true, isVisible: true });
                // Do not set the state for the NEXT button here, as we can only set it after calculating the required mappings. We'll set the button state after that
                this._navigationControl.setButtonState(NavigationControl.NavigationButtonType.OK, { isEnabled: false, isVisible: false });

                break;

            case WizardStep.Confirmation:

                this._setConfirmationContent();

                this._navigationControl.setButtonState(NavigationControl.NavigationButtonType.PREVIOUS, { isEnabled: true, isVisible: true });
                this._navigationControl.setButtonState(NavigationControl.NavigationButtonType.NEXT, { isEnabled: false, isVisible: false });
                this._navigationControl.setButtonState(NavigationControl.NavigationButtonType.OK, { isEnabled: true, isVisible: true });

                break;
            default:
                throw "unknown step number: " + newStep;
        }
        /* Hide and show steps based on the new step */
        for (let step = WizardStep.Welcome; step <= WizardStep.Confirmation; step++) {
            if (step === newStep) {
                $("#step" + step).show();
            }
            else {
                $("#step" + step).hide();
            }
        }

        this._currentStep = newStep;
    }
    /**
     * Sets the content for the step 2.
     *
     * Sets the title and team selection type based operation selected by the user in step 1
     *
     */
    private _setStep2TeamSelectionTypeAndTitle() {

        switch (this._selectedOption) {
            case CopyBoardSettingsSettings.FromAnotherTeam:
                this._setStepTitle("Select team to copy settings from");
                this._teamSelector.changeSelectionType(TeamSelector.TeamSelectionMode.SingleSelection);
                break;
            case CopyBoardSettingsSettings.ToOtherTeams:
                this._setStepTitle("Select team(s) to copy settings to");
                this._teamSelector.changeSelectionType(TeamSelector.TeamSelectionMode.MultiSelection);
                break;
            default:
                throw "unknown setting, or not supported";
        }
    }

    private async _setWorkItemMappingContentAsync() {
        if (this._refreshBoardDifferences) {
            this._refreshBoardDifferences = false;
            let boardService = new BoardConfiguration();
            let sourceTeam = this._teamSelector.getSelectedTeams()[0];
            let destinationteam = this._teamSelector.getCurrentTeam();
            this._sourceSettings = await boardService.getCurrentConfigurationAsync(sourceTeam.team.name);
            this._targetSettings = await boardService.getCurrentConfigurationAsync(destinationteam.team.name);

            this._currentBoardIndex = 0;
            this._boardDifferences = boardService.getTeamColumnDifferences(this._sourceSettings, this._targetSettings);
            this._boardMappings = new Array();
            for (let index = 0; index < this._boardDifferences.length; index++) {
                let mapping: IBoardMapping = {
                    backlog: this._boardDifferences[index].backlog,
                    columnMappings: new Array()
                };
                this._boardMappings.push(mapping);
            }
            this._setLoadedWorkItemMappingContent();
        } else {
            this._setLoadedWorkItemMappingContent();
        }
        this._setStepTitle("Work Item Mapping");
    }

    private _setLoadedWorkItemMappingContent() {
        let differences = this._boardDifferences[this._currentBoardIndex];
        this._columnMappingCombos = [];
        $("#backlogTitle").text(differences.backlog);
        let rootContainer = $("#itemMappings");
        rootContainer.empty();

        let $headerRow = $(domElem("div")).addClass("mappingRow").addClass("mapping-header").appendTo(rootContainer);
        $(domElem("div")).addClass("mapping-origin").text("Imported states").appendTo($headerRow);
        $(domElem("div")).addClass("mapping-choice").text("Existing states").appendTo($headerRow);

        for (let index = 0; index < differences.mappings.length; index++) {
            let $row = $(domElem("div")).addClass("mappingRow").appendTo(rootContainer);
            $(domElem("div")).addClass("mapping-origin").text(differences.mappings[index].sourceColumn.name).appendTo($row);
            let dropdownArea = $(domElem("div")).addClass("mapping-choice").appendTo($row);
            let combo = this._createColumnMappingCombo(dropdownArea, index);
            this._columnMappingCombos.push(combo);

            // If a mapping target column was already set in _boardMappings, then we should set the combo to that.
            let sourceColumn = differences.mappings[index].sourceColumn;
            let mappings = this._boardMappings[this._currentBoardIndex].columnMappings.filter(mapping => mapping.sourceColumn === sourceColumn);
            if (mappings.length > 0 && mappings[0].targetColumn !== undefined) {
                combo.setText(mappings[0].targetColumn.name);
            }

            this._setColumnMappingTarget(index, combo.getSelectedIndex());
        }
        // Initial validation after loading the dialog, and set "Next" button state accordingly.
        let validationOk: boolean = this._validateColumnMapping();
        this._navigationControl.setButtonState(NavigationControl.NavigationButtonType.NEXT, { isEnabled: validationOk, isVisible: true });
    }

    /**
     * Creates a combo box for use in the column mapping dialogs.
     *
     * @private
     * @param {JQuery} combo
     * @param {number} sourceColumnIndex
     * @returns
     *
     * @memberOf CopySettingsWizard
     */
    private _createColumnMappingCombo(combo: JQuery, sourceColumnIndex: number) {
        let source: WorkContracts.BoardColumn[] = this._boardDifferences[this._currentBoardIndex].mappings[sourceColumnIndex].potentialMatches;
        let dropDownItems: string[] = new Array();
        source.forEach(item => {
            dropDownItems.push(item.name);
        });

        let makeOptions: Combos.IComboOptions = {
            source: dropDownItems,
            mode: "drop",
            value: dropDownItems.length === 1 ? dropDownItems[0] : "",
            allowEdit: false,
            indexChanged: (index) => {
                this._setColumnMappingTarget(sourceColumnIndex, index);
                this._navigationControl.setButtonState(NavigationControl.NavigationButtonType.NEXT, { isEnabled: this._validateColumnMapping(), isVisible: true });
            }
        };

        let comboBox = Controls.create(Combos.Combo, combo, makeOptions);
        return comboBox;
    }

    /**
     * Sets the target for a specific column mapping for a specific board.
     * If the mapping for the source column was already specified for this board, then it will replace it.
     *
     * @private
     * @param {number} sourceColumnIndex
     * @param {number} selectedItemIndex
     *
     * @memberOf CopySettingsWizard
     */
    private _setColumnMappingTarget(sourceColumnIndex: number, selectedItemIndex: number) {
        // index = -1 means that nothing was selected in the combo
        if (selectedItemIndex >= 0) {
            let sourceColumn: WorkContracts.BoardColumn = this._boardDifferences[this._currentBoardIndex].mappings[sourceColumnIndex].sourceColumn;
            let targetColumn: WorkContracts.BoardColumn = this._boardDifferences[this._currentBoardIndex].mappings[sourceColumnIndex].potentialMatches[selectedItemIndex];
            let board = this._boardMappings[this._currentBoardIndex].backlog;
            console.log("Setting target column to [" + targetColumn.name + "] for source column [" + sourceColumn.name + "] for backlog [" + board + "]");
            let newMapping: IColumnMapping = {
                sourceColumn: sourceColumn,
                targetColumn: targetColumn,
                potentialMatches: null
            };

            let alreadyExistingMappings = this._boardMappings[this._currentBoardIndex].columnMappings.filter(mapping => mapping.sourceColumn === sourceColumn);
            if (alreadyExistingMappings.length > 0) {
                let alreadyExistingMappingIndex = this._boardMappings[this._currentBoardIndex].columnMappings.indexOf(alreadyExistingMappings[0]);
                console.debug("Found already existing mapping at index: " + alreadyExistingMappingIndex);
                this._boardMappings[this._currentBoardIndex].columnMappings[alreadyExistingMappingIndex] = newMapping;
            } else {
                this._boardMappings[this._currentBoardIndex].columnMappings.push(newMapping);
            }
        }
    }

    private _validateColumnMapping(): boolean {
        if (this._boardDifferences.length > 0 && this._boardDifferences[this._currentBoardIndex].mappings.length > 0) {
            for (let i = 0; i < this._boardDifferences[this._currentBoardIndex].mappings.length; i++) {
                let sourceColumnMapping = this._boardDifferences[this._currentBoardIndex].mappings[i];

                // Find target column for this source column
                let mappingToValidate: IColumnMapping[] = this._boardMappings[this._currentBoardIndex].columnMappings.filter(mapping => mapping.sourceColumn === sourceColumnMapping.sourceColumn);
                if (mappingToValidate.length > 0) {
                    if (mappingToValidate[0].targetColumn === undefined) {
                        return false;
                    } else {
                        console.log("Found valid mapping from column [" + mappingToValidate[0].sourceColumn.name + "] to column [" + mappingToValidate[0].targetColumn.name + "]");
                    }
                } else {
                    return false;
                }
            };
        }
        return true;
    }

    /**
     * Sets the content for the step 2.
     *
     * Sets the title and the source and destination teams list.
     */
    private _setConfirmationContent() {
        let selectedTeams = this._teamSelector.getSelectedTeams();

        if (selectedTeams.length === 0) {
            throw "no selected team"; // Shouldn't happen.
        }

        switch (this._selectedOption) {
            case CopyBoardSettingsSettings.FromAnotherTeam:

                let selectedTeam = selectedTeams[0]; // Pick the first, since there is only one.

                this._setStepTitle("Copy settings from " + this._formatTeam(selectedTeam));
                this._setCopyFromAnotherTeamSpecificMessage(selectedTeam);

                break;
            case CopyBoardSettingsSettings.ToOtherTeams:

                this._setStepTitle(`Copy settings to ${selectedTeams.length} projects`);
                this._setCopyToOtherTeamsSpecificMessage(selectedTeams);

                break;
            default:
                throw "unknown setting or not supported";
        }

    }

    /**
     * Sets the specific confirmation content for copy from another team to the current team
     *
     * @param {TeamSelector.SelectedTeam} selectedTeam -  the team that the user selected
     */
    private _setCopyFromAnotherTeamSpecificMessage(selectedTeam: TeamSelector.SelectedTeam) {
        let webContext = VSS.getWebContext();

        $("#step4").children("#specificMessage").html("Please confirm that you to wish to copy the settings from <strong>" + this._formatTeam(selectedTeam) + "</strong> to <strong>" + this._formatTeam(webContext.project.name, webContext.team.name) + "</strong>");
    }

    /**
     * Sets the specific confirmation content for copy to other team(s) from the current team
     *
     * @param {TeamSelector.SelectedTeam[]} selectedTeams - the team(s) that the user selected
     */
    private _setCopyToOtherTeamsSpecificMessage(selectedTeams: TeamSelector.SelectedTeam[]) {
        let webContext = VSS.getWebContext();
        let copyToTeamsList = "";

        // We restrict the amount of teams that are shown on the confirmation. If the number of selected
        // teams, exceed the maximum amount, we only show the maxim number (and display an ...)
        // The number of teams where the copy will be performed to, is already part of the title.
        //
        for (let x: number = 0; x < Math.min(CopySettingsWizard.MAX_NUMBER_TEAMS_TO_LIST, selectedTeams.length); x++) {
            copyToTeamsList += (copyToTeamsList !== "" ? ";" : "") + this._formatTeam(selectedTeams[x]);
        }
        if (selectedTeams.length > CopySettingsWizard.MAX_NUMBER_TEAMS_TO_LIST) {
            copyToTeamsList += " ...";
        }

        $("#step4").children("#specificMessage").html("Please confirm that you to wish to copy the settings from <strong>" + this._formatTeam(webContext.project.name, webContext.team.name) + "</strong> to <strong>" + copyToTeamsList + "</strong>");
    }

    /**
     * Formats a team name to be shown to the user.
     *
     * The team is format as <Team Project Name>/Team Name
     *
     * @param team - the team to format
     *
     * @returns the formatted team
     */
    private _formatTeam(selectedTeam: TeamSelector.SelectedTeam): string;

    /**
     * Formats a team name to be shown to the user.
     *
     * The team is format as <Team Project Name>/Team Name
     *
     * @param team - the team to format
     *
     * @returns the formatted team
     */
    private _formatTeam(teamProjectName: string, teamName: string): string;

    private _formatTeam(selectedTeamOrTeamProject: any, teamName?: string): string {
        if (typeof (selectedTeamOrTeamProject) === "string") {
            return selectedTeamOrTeamProject + "/" + teamName;
        } else {
            return selectedTeamOrTeamProject.teamProject.name + "/" + selectedTeamOrTeamProject.team.name;
        }
    }

    /**
     * Called when the user clicks on the previous button.
     *
     * Goes back a step in the screen and updates the state of the navigation buttons
     */
    private async _onBack() {
        if (this._currentStep !== WizardStep.Settings) {
            let nextStep = this._currentStep;
            if (this._currentStep === WizardStep.WorkItemMapping) {
                if (this._currentBoardIndex === 0) {
                    nextStep -= 1;
                } else {
                    this._currentBoardIndex -= 1;
                }
            } else {
                nextStep -= 1;
            }
            // (async () => {
            await this._updateStepStateAsync(nextStep);
            // })();
        }
    }

    /**
    * Called when the user clicks on the next button.
    *
    * Goes to the next step in the screen and updates the state of the navigation buttons
    */
    private async _onNext() {
        if (this._currentStep !== WizardStep.Confirmation) {
            let nextStep = this._currentStep;
            if (this._currentStep === WizardStep.WorkItemMapping) {
                if (this._currentBoardIndex === this._boardDifferences.length - 1) {
                    nextStep += 1;
                } else {
                    this._currentBoardIndex += 1;
                }
            } else {
                nextStep += 1;
            }
            // (async () => {
            await this._updateStepStateAsync(nextStep);
            // })();
        }
    }

    /**
     * Called when the user clicks on the OK.
     *
     * If the caller has defined the onOk callback, then the callback is called with the settings to perform the operation
     */
    private async _onOk(): Promise<void> {
        let boardService = new BoardConfiguration();
        if (this._onCopyCallback) {
            let currentTeam = this._teamSelector.getCurrentTeam();
            let result: Boolean = false;

            if (this._selectedOption === CopyBoardSettingsSettings.ToOtherTeams) {

            } else if (this._selectedOption === CopyBoardSettingsSettings.FromAnotherTeam) {
                console.log("do apply settings");
                result = await boardService.applySettingsAsync(this._targetSettings, this._sourceSettings, this._boardDifferences);
                console.log("apply settings done");
                this._onCopyCallback(new CopySettings(this._teamSelector.getSelectedTeams()[0], this._teamSelector.getCurrentTeam(), this._selectedOption));
            }
        }
    }

    /**
    * Called when the user clicks on the cancel button.
    *
    * If the caller has defined the onCancel callback, then the callback is called.
    */
    private async _onCancel() {
        if (this._onCancelCallback) {
            this._onCancelCallback();
        }
        await Promise.resolve();
    }

    /**
     * Changes the title for a given step.
     *
     * Requires the caller has set up the onTitleChanged callback (the title belongs to the caller. The control has no title in it's UI)
     * @param {string} title - the new title
     */
    private _setStepTitle(title: string) {
        if (this._onTitleChangeCallback) {
            this._onTitleChangeCallback(title);
        }
    }

    /**
     * Dinamically set a callback for the cancel button
     *
     * @param {Function} callback
     */
    public onCancel(callback: Function) {
        this._onCancelCallback = callback;
    }

    /**
    * Dinamically set a callback for the copy operation button
    *
    * @param {(copySettings)} callback that receives a copySettings parameter with the settings of the operation
    */
    public onCopy(callback: (settings: CopySettings) => void) {
        this._onCopyCallback = callback;
    }

    /**
    * Dinamically set a callback to be notified when a title changes
    *
    * @param {Function} callback
    */
    public onTitleChange(callback: Function) {
        this._onTitleChangeCallback = callback;
    }
}

VSS.register("copySettingsWizard", function (context) {
    return new CopySettingsWizard();
});
