/// <reference types="vss-web-extension-sdk" />

import Controls = require("VSS/Controls");
import Combos = require("VSS/Controls/Combos");

export class SelectTeamDialog {
    private _allTeams: string[];
    private _teamSelectorCombo: Combos.Combo;

    constructor() {
        this._teamSelectorCombo = Controls.create(Combos.Combo, $("#teamSelectorCombo"), {
            mode: "drop",
            allowEdit: false,
            type: "list",
            change: () => {
                let input = this._teamSelectorCombo.getInputText();
                console.log(input);
            }
        });

        this._teamSelectorCombo.setSource(this._allTeams);
    }

    public getSelectedTeam(): string {
        return this._teamSelectorCombo.getInputText();
    }

    public setTeams(allTeams: string[]): void {
        this._allTeams = allTeams;
        if (this._teamSelectorCombo != null) {
            this._teamSelectorCombo.setSource(this._allTeams);
        }
    }
}

VSS.register("selectTeamDialog", function (context) {
    let dialog = new SelectTeamDialog();
    return dialog;
});