/// <reference types="vss-web-extension-sdk" />

import Controls = require("VSS/Controls");
import Combos = require("VSS/Controls/Combos");
import StatusIndicator = require("VSS/Controls/StatusIndicator");
import Utils_UI = require("VSS/Utils/UI");
import WorkContracts = require("TFS/Work/Contracts");
import TeamSelector = require("./TeamSelectorControl");
import CoreRestClient = require("TFS/Core/RestClient");
require("es6-promise").polyfill(); /* Polyfill for ES6 promises for IE11 */

import { WorkItemMappingPage } from "./wizardpages/workItemMappingPage";

import * as tc from "TelemetryClient";
import telemetryClientSettings = require("./telemetryClientSettings");

import Q = require("q");

import * as NavigationControl from "./NavigationControl";

import { IBoardColumnDifferences, IColumnMapping, BoardConfiguration, IBoardSettings } from "./board_configuration";

export enum CopyBoardSettingsSettings {
    None = 0,
    FromAnotherTeam,
    ToOtherTeams
}

/* Allways keep the number in synch with the correct order (also needs to be sequential) */
enum WizardStep {
    Settings = 1,
    TeamSelection = 2,
    WorkItemMapping = 3,
    Confirmation = 4
}

let domElem = Utils_UI.domElem;

declare function initializeSearch(): void;

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

    // Controls
    private _teamSelector: TeamSelector.TeamSelectorControl;
    private _navigationControl: NavigationControl.NavigationControl;

    // Wizard pages
    private _workItemMappingPage: WorkItemMappingPage;

    // The current step that we're on in the wizard
    private _currentStep: WizardStep = WizardStep.Settings;

    // Whether we're copying from or to a team
    private _selectedOption: CopyBoardSettingsSettings = CopyBoardSettingsSettings.None;

    // Callbacks for the wizard control
    private _onCancelCallback: Function;
    private _onCopyCallback: (settings: CopySettings) => void;
    private _onTitleChangeCallback: Function;

    constructor() {
        this._teamSelector = Controls.create(TeamSelector.TeamSelectorControl, $("#teamSelector"), {
            selectionType: TeamSelector.TeamSelectionMode.SingleSelection, // We have to select either one of those. We can change the type later when we know the type
            selectionChanged: () => {
                this._onTeamSelectionChanged();
            },
            dataLoaded: () => {
                this._onTeamsLoaded();
            }
        });

        // Create the required pages
        this._workItemMappingPage = new WorkItemMappingPage();
        this._workItemMappingPage.OnMappingValidated = ((validationResult) => {
            this._navigationControl.setButtonState(NavigationControl.NavigationButtonType.NEXT, { isEnabled: validationResult, isVisible: true });
        });

        // Create the navigation control
        let navigate: NavigationControl.INavigation = {
            previousButton: {
                isEnabled: false, isVisible: false, onClick: this._onBack.bind(this)
            },
            nextButton: {
                isEnabled: false, isVisible: true, onClick: this._onNext.bind(this)
            },
            okButton: {
                isEnabled: false, isVisible: false, label: "Copy Settings", onClick: this._onOk.bind(this)
            },
            cancelButton: {
                isEnabled: true, isVisible: true, onClick: this._onCancel.bind(this)
            }
        };

        this._navigationControl = Controls.create(NavigationControl.NavigationControl, $("#navigation"), { Navigation: navigate });

        this._attachStepOneEvents();
    }

    private _attachStepOneEvents() {
        $(".selectionsOption")
            .click((event) => { this._onSettingsChanged(event); });
    }

    /**
     * Shows a nice error message to the user, in a red bar
     * @param errorMessage The error message to show
     */
    private _showError(errorMessage: string) {
        let _errorMessageBar: JQuery = $("#errorMessageBar");
        _errorMessageBar.find(".ms-MessageBar-text").text(errorMessage);
        _errorMessageBar.show();
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
        let selectedOption: string = "";
        let id: string = $selectedElement.attr("for");
        if (!id) {
            id = $selectedElement.parent().attr("for");
        }

        if (id) {
            let $inputElement = $(`#${id}`);
            selectedOption = $inputElement.val();
        }

        if (selectedOption) {
            // $(".settingsInput").removeClass("settingsInputSelected");
            // $selectedElement.parents(".settingsInput").addClass("settingsInputSelected");

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

        let numberSelectedTeams = this._teamSelector.getSelectedTeams().length;

        if (this._currentStep === WizardStep.TeamSelection) {
            this._navigationControl.setButtonState(NavigationControl.NavigationButtonType.NEXT, { isEnabled: numberSelectedTeams > 0, isVisible: true });
        }
        // After the team selection has been changed we should reload the work item mapping
        this._workItemMappingPage.RefreshBoardDifferences = true;
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

            case WizardStep.Settings:
                this._setStepTitle("Copy Kanban board settings");
                this._navigationControl.setButtonState(NavigationControl.NavigationButtonType.PREVIOUS, { isEnabled: false, isVisible: false });
                this._navigationControl.setButtonState(NavigationControl.NavigationButtonType.NEXT, { isEnabled: this._selectedOption !== CopyBoardSettingsSettings.None, isVisible: true });
                this._navigationControl.setButtonState(NavigationControl.NavigationButtonType.OK, { isEnabled: false, isVisible: false });
                break;

            case WizardStep.TeamSelection:

                this._setStep2TeamSelectionTypeAndTitle();

                this._navigationControl.setButtonState(NavigationControl.NavigationButtonType.PREVIOUS, { isEnabled: true, isVisible: true });
                this._navigationControl.setButtonState(NavigationControl.NavigationButtonType.NEXT, { isEnabled: this._teamSelector.getSelectedTeams().length > 0, isVisible: true });
                this._navigationControl.setButtonState(NavigationControl.NavigationButtonType.OK, { isEnabled: false, isVisible: false });

                break;

            case WizardStep.WorkItemMapping:
                let sourceTeam = this._selectedOption === CopyBoardSettingsSettings.FromAnotherTeam ? this._teamSelector.getSelectedTeams()[0] : this._teamSelector.getCurrentTeam();
                let destinationteam = this._selectedOption === CopyBoardSettingsSettings.FromAnotherTeam ? this._teamSelector.getCurrentTeam() : this._teamSelector.getSelectedTeams()[0];
                try {
                    await this._workItemMappingPage.SetWorkItemMappingContentAsync(sourceTeam, destinationteam);
                } catch (e) {
                    this._showError("Failed to get board differences to determine mapping. " + e.message);
                }
                this._setStepTitle("Work Item Mapping");

                this._navigationControl.setButtonState(NavigationControl.NavigationButtonType.PREVIOUS, { isEnabled: true, isVisible: true });
                this._navigationControl.setButtonState(NavigationControl.NavigationButtonType.NEXT, { isEnabled: this._workItemMappingPage.ValidateColumnMapping(), isVisible: true });
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
        for (let step = WizardStep.Settings; step <= WizardStep.Confirmation; step++) {
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
                this._teamSelector.changeSelectionType(TeamSelector.TeamSelectionMode.SingleSelection);
                break;
            default:
                throw "unknown setting, or not supported";
        }
    }

    /**
     * Sets the content for the action selection dialog (either "copy from another team" or "copy to another team").
     *
     * Sets the title and the source and destination teams list.
     */
    private _setConfirmationContent() {
        let selectedTeams = this._teamSelector.getSelectedTeams();

        if (selectedTeams.length === 0) {
            tc.TelemetryClient.getClient(telemetryClientSettings.settings).trackException("Opened confirmation dialog without any team selected");
            this._showError("Opened confirmation dialog without any team selected");
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
                tc.TelemetryClient.getClient(telemetryClientSettings.settings).trackException("Opened confirmation dialog without any copy option selected");
                this._showError("Opened confirmation dialog without any copy option selected");
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
            nextStep -= 1;
            await this._updateStepStateAsync(nextStep);
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
            nextStep += 1;
            await this._updateStepStateAsync(nextStep);
        }
    }

    /**
     * Called when the user clicks on the OK.
     *
     * If the caller has defined the onOk callback, then the callback is called with the settings to perform the operation
     */
    private async _onOk(): Promise<void> {
        let rootContainer = $("#step4");
        let waitControlOptions: StatusIndicator.IWaitControlOptions = {
            cancellable: false,
            backgroundColor: "#ffffff",
            message: "Applying Settings...."
        };

        let waitControl = Controls.create(StatusIndicator.WaitControl, rootContainer, waitControlOptions);

        waitControl.startWait();

        let boardService = new BoardConfiguration();
        if (this._onCopyCallback) {
            let result: Boolean = false;

            let sourceTeam = this._selectedOption === CopyBoardSettingsSettings.FromAnotherTeam ? this._teamSelector.getSelectedTeams()[0] : this._teamSelector.getCurrentTeam();
            let destinationteam = this._selectedOption === CopyBoardSettingsSettings.FromAnotherTeam ? this._teamSelector.getCurrentTeam() : this._teamSelector.getSelectedTeams()[0];

            try {
                result = await boardService.applySettingsAsync(destinationteam.team.name, sourceTeam.team.name, this._workItemMappingPage.GetBoardMappings());
                this._onCopyCallback(new CopySettings(sourceTeam, destinationteam, this._selectedOption));
            } catch (e) {
                tc.TelemetryClient.getClient(telemetryClientSettings.settings).trackException(e);
                this._showError("Failed to apply board settings. " + e.message);
            }

        }
        waitControl.endWait();
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
     * Dynamically set a callback for the cancel button
     *
     * @param {Function} callback
     */
    public onCancel(callback: Function) {
        this._onCancelCallback = callback;
    }

    /**
    * Dynamically set a callback for the copy operation button
    *
    * @param {(copySettings)} callback that receives a copySettings parameter with the settings of the operation
    */
    public onCopy(callback: (settings: CopySettings) => void) {
        this._onCopyCallback = callback;
    }

    /**
    * Dynamically set a callback to be notified when a title changes
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
