import { Action } from "VSS/Flux/Action";
import { ViewState } from "src/Views/Dialog/Models/DialogInterfaces";

export class DialogActionsHub {
    public selectViewState = new Action<ViewState>();
    public setDialogValidState = new Action<boolean>();
}