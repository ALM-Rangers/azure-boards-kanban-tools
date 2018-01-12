export enum ViewState {
    Start,
    CopySettingsToTeam,
    CopySettingsFromTeam
}

export interface DialogState {
    currentBoardId: string;
    isDialogValid: boolean;
    view: ViewState;
}