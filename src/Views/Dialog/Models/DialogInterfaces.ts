export enum ViewState {
    Start,
    CopySettingsToTeam,
    CopySettingsFromTeam,
    IsPerformingAction,
    ActionComplete
}

export interface DialogState {
    currentBoardId: string;
    isDialogValid: boolean;
    view: ViewState;
}