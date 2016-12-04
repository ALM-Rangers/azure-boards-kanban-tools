/// <reference path="../typings/index.d.ts" />

import Controls = require("VSS/Controls");
import Combos = require("VSS/Controls/Combos");
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

    private _allTeams: string[];
    private _teamSelectorCombo: Combos.Combo;
    private _selectedTeam: string;

    private _navigationControl: any;

    private _currentStep: number = 1;
    
    private _onCancelCallback: Function;
    private _onCopyCallback: Function;
    private _onTitleChangeCallback: Function;

    constructor() {
        this._teamSelectorCombo = Controls.create(Combos.Combo, $("#teamSelectorCombo"), {
            mode: "drop",
            allowEdit: false,
            type: "list",
            change: () => {
                this._selectedTeam = this._teamSelectorCombo.getInputText();
                this._onTeamSelection(this._selectedTeam);
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

        this._fillTeamCombo();

        this._navigationControl = NavigationControl.NavigationControl.enhance(NavigationControl.NavigationControl, $("#navigation"), { Navigation: navigate });

        this._teamSelectorCombo.setSource(this._allTeams);
    }

    private _onTeamSelection(newTeamName: string) {
        this._navigationControl.setButtonState(NavigationControl.NavigationButtonType.NEXT, { isEnabled: true, isVisible: true });
    }

    private _getNumberSelectedTeams(): number {
        if (this._selectedTeam) return 1;

        return 0;
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
                //TODO: 
                this._navigationControl.setButtonState(NavigationControl.NavigationButtonType.PREVIOUS, { isEnabled: false, isVisible: false });

                break;
            case 2:
                //TODO: the title should be different based on the operation
                this._setStepTitle("Select Team to copy settings from");

                this._navigationControl.setButtonState(NavigationControl.NavigationButtonType.PREVIOUS, { isEnabled: true, isVisible: true });

                this._navigationControl.setButtonState(NavigationControl.NavigationButtonType.NEXT, { isEnabled: this._getNumberSelectedTeams() > 0, isVisible: true });

                this._navigationControl.setButtonState(NavigationControl.NavigationButtonType.OK, { isEnabled: false, isVisible: false });
                break;
            case 3:
                //TODO: the title should be different based on the operation and the selected team(s)
                this._setStepTitle("Copy settings to TODO/TODO");

                this._navigationControl.setButtonState(NavigationControl.NavigationButtonType.PREVIOUS, { isEnabled: true, isVisible: true });
                this._navigationControl.setButtonState(NavigationControl.NavigationButtonType.NEXT, { isEnabled: false, isVisible: false });
                this._navigationControl.setButtonState(NavigationControl.NavigationButtonType.OK, { isEnabled: true, isVisible: true });
                break;
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

    private _fillTeamCombo() {
        let webContext = VSS.getWebContext();

        let client = CoreRestClient.getClient();
        var teamlist: string[] = new Array();
        client.getTeams(webContext.project.id).then((teams) => {
            teams.forEach((team) => {
                teamlist.push(team.name);
            });
            this.setTeams(teamlist);
        });

    }

    private getSelectedTeam(): string {
        return this._teamSelectorCombo.getInputText();
    }

    private setTeams(allTeams: string[]): void {
        this._allTeams = allTeams;
        if (this._teamSelectorCombo != null) {
            this._teamSelectorCombo.setSource(this._allTeams);
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