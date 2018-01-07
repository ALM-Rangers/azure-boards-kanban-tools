import * as React from "react";

import { CopySettingsActionsCreator } from "src/Views/CopySettings/Actions/CopySettingsActionsCreator";
import { DialogActionsCreator } from "src/Views/Dialog/Actions/DialogActionsCreator";
import { CommonDialogState } from "src/Views/Dialog/Stores/DialogStoreHub";
import { ViewState } from "src/Views/Dialog/Models/DialogInterfaces";
import { CopySettingsActionsHub } from "src/Views/CopySettings/Actions/CopySettingsActions";
import { CopySettingsStoreHub, CopyState } from "src/Views/CopySettings/Stores/CopySettingsStoreHub";
import { AdvancedItemMapping } from "src/Views/CopySettings/Components/AdvancedItemMapping";
import { SelectBacklogLevels } from "src/Views/CopySettings/Components/SelectBacklogLevels";
import { SelectTeam } from "src/Views/CopySettings/Components/SelectTeam";
import * as Constants from "src/Shared/Constants";
import { ServicesClient } from "src/Shared/ServicesClient";
import { PrimaryButton } from "office-ui-fabric-react/lib/Button";

export interface ICopySettingsViewProps {
    sharedActions: DialogActionsCreator;
    sharedState: CommonDialogState;
}

export class CopySettingsView extends React.Component<ICopySettingsViewProps, CopyState> {
    private _copySettingsActionsCreator: CopySettingsActionsCreator;
    private _copySettingsStoreHub: CopySettingsStoreHub;

    constructor(props: ICopySettingsViewProps) {
        super(props);

        const copySettingsActionsHub = new CopySettingsActionsHub();
        this._copySettingsStoreHub = new CopySettingsStoreHub(copySettingsActionsHub);
        this._copySettingsActionsCreator = new CopySettingsActionsCreator(
            copySettingsActionsHub,
            new ServicesClient(),
            this._copySettingsStoreHub.getCopyState
        );

        this.state = this._copySettingsStoreHub.state;
    }

    public componentDidMount() {
        this._copySettingsStoreHub.copySettingsStore.addChangedListener(this._updateCopyState);
        this._copySettingsActionsCreator.loadTeams();
    }

    public componentWillUnmount() {
        this._copySettingsStoreHub.copySettingsStore.removeChangedListener(this._updateCopyState);
    }

    public render() {
        let label = "";
        if (this.props.sharedState.dialogState.view === ViewState.CopySettingsFromTeam) {
            label = Constants.CopyFromTeamLabel;
        } else if (this.props.sharedState.dialogState.view === ViewState.CopySettingsToTeam) {
            label = Constants.CopyToTeamLabel;
        }
        return (
            <div>
                <div className="formContent">
                    <SelectTeam
                        availableTeams={this.state.copySettingsState.availableTeams}
                        isLoading={this.state.copySettingsState.teamsLoading}
                        label={label}
                        disabled={this.state.copySettingsState.backlogsLoading}
                        onSelectTeam={this._onSelectTeam} />
                </div>
                <div className="formContent">
                    <SelectBacklogLevels
                        availableLevels={this.state.copySettingsState.commonBacklogLevels}
                        selectedLevels={this.state.copySettingsState.selectedBacklogLevels}
                        isLoading={this.state.copySettingsState.backlogsLoading}
                        label={Constants.ApplySettingsLevelsLabel}
                        onBacklogLevelSelected={this._onSelectBacklogLevel} />
                </div>
                <div className="formContent">
                    <PrimaryButton
                        onClick={this._onOpenAdvancedMappings}
                        disabled={!this._copySettingsStoreHub.copySettingsStore.state.canToggleMappings}>
                        {Constants.EnableAdvancedMappings}
                    </PrimaryButton>
                </div>
                <div>
                    <AdvancedItemMapping
                        show={this.state.copySettingsState.showAdvancedMappings}
                        headerText={Constants.MappingsHeader}
                        onClosed={this._onAdvancedMappingClosed}
                        selectedLevels={this.state.copySettingsState.selectedBacklogLevels} />
                </div>
            </div>
        );
    }

    private _updateCopyState = () => {
        this.setState(this._copySettingsStoreHub.state);
    }

    private _onSelectTeam = (team: string) => {
        this._copySettingsActionsCreator.selectTeam(team);
    }

    private _onSelectBacklogLevel = (level: string, isSelected: boolean) => {
        this._copySettingsActionsCreator.selectBacklogLevel(level, isSelected);
    }

    private _onOpenAdvancedMappings = () => {
        this._copySettingsActionsCreator.enabledAdvancedMappings(true);
    }

    private _onAdvancedMappingClosed = () => {
        this._copySettingsActionsCreator.enabledAdvancedMappings(false);
    }
}