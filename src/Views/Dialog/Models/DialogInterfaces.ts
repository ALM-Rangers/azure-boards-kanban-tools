export enum ViewState {
    Start,
    CopySettingsToTeam,
    CopySettingsFromTeam
}

export interface DialogState {
    isDialogValid: boolean;
    view: ViewState;
}