import * as VSSStore from "VSS/Flux/Store";
import { DialogActionsHub } from "src/Views/Dialog/Actions/DialogActions";
import { DialogState, ViewState } from "src/Views/Dialog/Models/DialogInterfaces";

export class DialogStore extends VSSStore.Store {
    public state: DialogState = {
        isDialogValid: false,
        view: ViewState.Start
    };

    onSetDialogValid = (isValid: boolean) => {
        this.state.isDialogValid = isValid;
        this.emitChanged();
    }

    public onSetViewState = (view: ViewState) => {
        this.state.view = view;
        this.emitChanged();
    }
}