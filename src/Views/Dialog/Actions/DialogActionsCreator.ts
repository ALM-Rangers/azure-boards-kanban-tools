import { DialogActionsHub } from "src/Views/Dialog/Actions/DialogActions";
import { ViewState } from "src/Views/Dialog/Models/DialogInterfaces";

export class DialogActionsCreator {
    constructor(
        private _dialogActionsHub: DialogActionsHub
    ) { }

    public setDialogIsValid(valid: boolean) {
        this._dialogActionsHub.setDialogValidState.invoke(valid);
    }

    public setCurrentView(viewType: string) {
        switch (viewType) {
            case ViewState.CopySettingsToTeam.toString(): {
                this._dialogActionsHub.selectViewState.invoke(ViewState.CopySettingsToTeam);
                break;
            }
            case ViewState.CopySettingsFromTeam.toString(): {
                this._dialogActionsHub.selectViewState.invoke(ViewState.CopySettingsFromTeam);
                break;
            }
            case ViewState.IsPerformingAction.toString(): {
                this._dialogActionsHub.selectViewState.invoke(ViewState.IsPerformingAction);
                break;
            }
            case ViewState.ActionComplete.toString(): {
                this._dialogActionsHub.selectViewState.invoke(ViewState.ActionComplete);
                break;
            }
        }
    }
}