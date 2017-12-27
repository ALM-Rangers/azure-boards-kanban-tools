import * as React from "react";
import * as ReactDOM from "react-dom";

import { Dropdown, IDropdownOption, IDropdownState } from "office-ui-fabric-react/lib/Dropdown";
import { DefaultButton, PrimaryButton } from "office-ui-fabric-react/lib/Button";
import { TextField } from "office-ui-fabric-react/lib/TextField";
import { Checkbox } from "office-ui-fabric-react/lib/Checkbox";
import { Panel, PanelType } from "office-ui-fabric-react/lib/Panel";
import { Fabric } from "office-ui-fabric-react/lib/Fabric";
import { initializeIcons } from "@uifabric/icons";

import { State, IKanbanAction } from "./Models";
import { Store } from "./Store";
import { ActionsCreator } from "./ActionsCreator";
import { ActionsHub } from "./ActionsHub";
import * as Constants from "./Constants";

export interface KanbanDialogOptions {
    onClose?: () => void;
}

export class KanbanDialog {
    private kanbanDialogNode: HTMLElement;
    public show(options?: KanbanDialogOptions) {
        this.kanbanDialogNode = document.getElementById("dialogContent");
        ReactDOM.render(<KanbanDialogInternal {...options} />, this.kanbanDialogNode);
    }

    public close() {
        ReactDOM.unmountComponentAtNode(this.kanbanDialogNode);
        if (this.kanbanDialogNode.remove) {
            this.kanbanDialogNode.remove();
        }
    }

    public Dispose() {
        ReactDOM.unmountComponentAtNode(this.kanbanDialogNode);
        if (this.kanbanDialogNode.remove) {
            this.kanbanDialogNode.remove();
        }
    }
}

class KanbanDialogInternal extends React.Component<KanbanDialogOptions, State> {
    private _actionsCreator: ActionsCreator;
    private _store: Store;
    private _actionSelectionDropdown: Dropdown;
    private _teamSelectionDropdown: Dropdown;

    constructor(props?: KanbanDialogOptions, context?: any) {
        super(props, context);

        const actionsHub = new ActionsHub();
        this._store = new Store(actionsHub);
        this._actionsCreator = new ActionsCreator(
            actionsHub,
            () => this._store.getState());
        this.state = this._store.getState();
    }

    public componentDidMount() {
        if (this._actionSelectionDropdown) {
            this._actionSelectionDropdown.focus();
        }
        this._store.addChangedListener(this._onStoreChanged);
        this._actionsCreator.initializeKanbanTeams();
    }

    public componentWillUnmount() {
        this._store.removeChangedListener(this._onStoreChanged);
    }

    private _onStoreChanged = (): void => {
        this.setState(this._store.getState());
    }

    public render() {
        return (
            <div>
                <Fabric>
                    {this._renderActionDropdown()}
                    {this._renderTeamSelectionDropdown()}
                    {this._renderCopyOptions()}
                    {this._renderAdvancedColumnCopy()}
                </Fabric>
            </div>
        );
    }

    private _renderActionDropdown = (): JSX.Element => {
        return (
            <div>
                <Dropdown
                    ref={(input) => { this._actionSelectionDropdown = input; }}
                    label={Constants.KanbanActionLabel}
                    placeHolder={Constants.KanbanActionPlaceholder}
                    selectedKey={IKanbanAction.CopySettingsFromTeam.toString()}
                    options={[
                        { key: IKanbanAction.CopySettingsFromTeam.toString(), text: Constants.CopySettingsFromTeamLabel },
                        { key: IKanbanAction.CopySettingsToTeam.toString(), text: Constants.CopySettingsToTeamLabel }
                    ]}
                    onChanged={this._kanbanActionChanged} />
            </div>
        );
    }

    private _renderTeamSelectionDropdown = (): JSX.Element => {
        let label = "";
        if (this.state.action === IKanbanAction.CopySettingsFromTeam) {
            label = Constants.CopyFromTeamLabel;
        } else if (this.state.action === IKanbanAction.CopySettingsToTeam) {
            label = Constants.CopyToTeamLabel;
        }
        let options: IDropdownOption[] = [];
        if (this.state.CopyKanbanAvailableTeams) {
            this.state.CopyKanbanAvailableTeams.map(team => {
                const teamOption: IDropdownOption = {
                    key: team.id,
                    text: team.name
                };
                options.push(teamOption);
            });
        }
        return (
            <div>
                <Dropdown
                    placeHolder={Constants.SelectTeamPlaceholder}
                    ref={(input) => { this._teamSelectionDropdown = input; }}
                    label={label}
                    options={options}
                    disabled={options.length === 0}
                    onChanged={this._selectedTeamChanged} />
            </div>
        );
    }

    private _renderCopyOptions = (): JSX.Element => {
        let levelsOptions: IDropdownOption[] = [];
        let selectedKeys: string[] = [];
        if (this.state.CopyKanbanCommonBacklogLevels) {
            this.state.CopyKanbanCommonBacklogLevels.forEach(item => {
                levelsOptions.push({
                    key: item,
                    text: item
                });
                if (this.state.CopyKanbanSelectedBacklogLevels && this.state.CopyKanbanSelectedBacklogLevels.indexOf(item) > -1) {
                    selectedKeys.push(item);
                }
            });
        }
        return (
            <div className="ms-Grid">
                <div className="ms-Grid-row">
                    <div className="ms-Grid-col ms-sm6 ms-md6 ms-lg6">
                        <Dropdown
                            label={Constants.ApplySettingsLevelsLabel}
                            multiSelect
                            options={levelsOptions}
                            selectedKeys={selectedKeys}
                            onChanged={this._backlogLevelChanged}
                            disabled={this.state.LoadingTeamState || levelsOptions.length === 0} />
                    </div>
                    <div className="ms-Grid-col ms-sm6 ms-md6 ms-lg6">
                        <Dropdown
                            label={Constants.SettingsToCopyLabel}
                            multiSelect
                            disabled={true} />
                    </div>
                </div>
            </div>
        );
    }

    private _renderAdvancedColumnCopy = (): JSX.Element => {
        return (
            <Panel
                isOpen={false}
                headerText="Column Mapping"
                type={PanelType.extraLarge} />
        );
    }

    private _kanbanActionChanged = (item: IDropdownOption): void => {
        switch (item.key) {
            case (IKanbanAction.CopySettingsFromTeam.toString()):
                this._actionsCreator.kanbanActionChanged(IKanbanAction.CopySettingsFromTeam);
                break;
            case (IKanbanAction.CopySettingsToTeam.toString()):
                this._actionsCreator.kanbanActionChanged(IKanbanAction.CopySettingsToTeam);
                break;
        }
        this._actionSelectionDropdown.setState(
            (prevState: IDropdownState) => {
                prevState.isOpen = false;
                return prevState;
            });
    }

    private _selectedTeamChanged = (item: IDropdownOption): void => {
        this._actionsCreator.selectTeam(item.key.toString());
        this._teamSelectionDropdown.setState(
            (prevState: IDropdownState) => {
                prevState.isOpen = false;
                return prevState;
            });
    }

    private _backlogLevelChanged = (item: IDropdownOption): void => {
        this._actionsCreator.selectBacklogLevel(item.key.toString(), item.selected);
    }
}

initializeIcons();

VSS.register("kanban-wizard", function (context) {
    return new KanbanDialog();
});