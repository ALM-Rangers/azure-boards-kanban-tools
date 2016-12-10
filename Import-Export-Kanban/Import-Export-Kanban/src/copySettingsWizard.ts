/// <reference path="../typings/index.d.ts" />

import Controls = require("VSS/Controls");
import Combos = require("VSS/Controls/Combos");
import TeamSelector = require("./TeamSelectorControl");
import CoreRestClient = require("TFS/Core/RestClient");

import * as NavigationControl from "./NavigationControl"

/**
 * Implements a wizard for the copy operation.
 *
 * Only implements the UI (collecting input from the user (including validations).
 *
 * The caller can get the data collected from the user via a callback
 * @returns
 */
export class copySettingsWizard {
    private static NUMBER_TAGS = 3;

    private _teamSelector: TeamSelector.TeamSelectorControl;
    private _navigationControl: NavigationControl.NavigationControl;

    private _currentStep: number = 1;

    private _onCancelCallback: Function;
    private _onCopyCallback: Function;
    private _onTitleChangeCallback: Function;

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
                isEnabled: false, isVisible: false, onClick: () => { this._onBack(); }
            },
            nextButton: {
                isEnabled: true, //TODO: set to false. This should be only enabled after the user has selected the operation on step 1
                isVisible: true, onClick: () => { this._onNext(); }
            },
            okButton: {
                isEnabled: true, isVisible: false, label: "Copy Settings", onClick: () => { this._onOk(); }
            },
            cancelButton: {
                isEnabled: true, isVisible: true, onClick: () => { this._onCancel() }
            }
        };

        this._navigationControl = Controls.create(NavigationControl.NavigationControl, $("#navigation"), { Navigation: navigate });
    }

    /**
     * Internal event called when a team selection is changed (a team has either been selected or unselected)
     *
     * Based if there are team selections or not, we enabled or disable the next button
     */
    private _onTeamSelectionChanged() {

        let numberSelectedTeams = this._teamSelector.getNumberSelectedTeams();

        if (this._currentStep === 2) {
            this._navigationControl.setButtonState(NavigationControl.NavigationButtonType.NEXT, { isEnabled: numberSelectedTeams > 0, isVisible: true });
        }
    }

    /**
     * Called when the data is loaded.
     *
     * If the data is loaded after the user has already transioned to step 2, we may need to change the selection mode
     */
    private _onTeamsLoaded() {
        if (this._currentStep === 2) {
            //TODO: set selection type based on option selected on step 1
            //TODO: refactor and call a method?
            //this._teamSelector.changeSelectionType(TeamSelector.TeamSelectionType.SingleSelection);
        }
    }

    /**
     * Updates the state of the buttons and the visibility of the wizards steps based on the new step
     * also updates the current step
     * @param {number} newStep - the new step
     */
    private _updateStepState(newStep: number) {

        for (let step = 1; step <= copySettingsWizard.NUMBER_TAGS; step++) {
            if (step === newStep)
                $("#step" + step).show();
            else
                $("#step" + step).hide();
        }

        switch (newStep) {
            case 1:
                this._setStepTitle("Copy Kanban board settings");
                this._navigationControl.setButtonState(NavigationControl.NavigationButtonType.PREVIOUS, { isEnabled: false, isVisible: false });

                break;
            case 2:
                //TODO: the title should be different based on the operation
                this._setStepTitle("Select Team to copy settings from");

                //TODO: set selection type based on option selected on step 1
                //this._teamSelector.changeSelectionType(TeamSelector.TeamSelectionType.SingleSelection);

                this._navigationControl.setButtonState(NavigationControl.NavigationButtonType.PREVIOUS, { isEnabled: true, isVisible: true });

                this._navigationControl.setButtonState(NavigationControl.NavigationButtonType.NEXT, { isEnabled: this._teamSelector.getNumberSelectedTeams() > 0, isVisible: true });

                this._navigationControl.setButtonState(NavigationControl.NavigationButtonType.OK, { isEnabled: false, isVisible: false });
                break;
            case 3:
                //TODO: the title should be different based on the operation and the selected team(s)
                this._setStepTitle("Copy settings to TODO/TODO");

                this._navigationControl.setButtonState(NavigationControl.NavigationButtonType.PREVIOUS, { isEnabled: true, isVisible: true });
                this._navigationControl.setButtonState(NavigationControl.NavigationButtonType.NEXT, { isEnabled: false, isVisible: false });
                this._navigationControl.setButtonState(NavigationControl.NavigationButtonType.OK, { isEnabled: true, isVisible: true });
                break;
            default:
                throw "unknown step number: " + newStep;
        }

        this._currentStep = newStep;
    }

    /**
     * Called when the user clicks on the previous button.
     *
     * Goes back a step in the screen and updates the state of the navigation buttons
     */
    private _onBack() {
        if (this._currentStep > 1) {
            this._updateStepState(this._currentStep - 1);
        }
    }


    /**
    * Called when the user clicks on the next button.
    *
    * Goes to the next step in the screen and updates the state of the navigation buttons
    */
    private _onNext() {
        if (this._currentStep < copySettingsWizard.NUMBER_TAGS) {
            this._updateStepState(this._currentStep + 1);
        }
    }

    /**
     * Called when the user clicks on the OK.
     *
     * If the caller has defined the onOk callback, then the callback is called.
     */
    private _onOk() {
        if (this._onCopyCallback) this._onCopyCallback();
    }

    /**
    * Called when the user clicks on the cancel button.
    *
    * If the caller has defined the onCancel callback, then the callback is called.
    */
    private _onCancel() {
        if (this._onCancelCallback) this._onCancelCallback();
    }

    /**
     * Changes the title for a given step.
     *
     * Requires the called has set the onTitleChanged callback (the title belongs to the caller. The control has no title in it's UI)
     * @param {string} title - the new title
     */
    private _setStepTitle(title: string) {
        if (this._onTitleChangeCallback) this._onTitleChangeCallback(title);
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
    * @param {Function} callback
    */
    public onCopy(callback: Function) {
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
    return new copySettingsWizard();
});