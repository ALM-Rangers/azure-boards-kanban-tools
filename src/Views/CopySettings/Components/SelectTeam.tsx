import * as React from "react";

import * as CoreContracts from "TFS/Core/Contracts";
import { Spinner, SpinnerType } from "office-ui-fabric-react/lib/Spinner";
import { Label } from "office-ui-fabric-react/lib/Label";
import { SelectionMode } from "office-ui-fabric-react";
import { PickList, PickListDropdown, IPickListSelection, IPickListItem } from "vss-ui/PickList";
import * as Constants from "src/Shared/Constants";

export interface ISelectTeamProps {
    availableTeams: CoreContracts.WebApiTeam[];
    onSelectTeam: (selectedTeam: string) => void;
    isLoading: boolean;
    label: string;
    disabled: boolean;
    placeHolder?: string;
}

export interface ITeamsPickerState {
    selectedItems: IPickListItem[];
}

export class SelectTeam extends React.Component<ISelectTeamProps, ITeamsPickerState> {
    constructor(props: ISelectTeamProps) {
        super(props);

        this.state = {
            selectedItems: []
        };
    }

    public render() {
        const options: IPickListItem[] = this.props.availableTeams.map((team, index) => {
            return {
                name: team.name,
                key: team.id
            };
        });
        let content: JSX.Element = null;
        if (this.props.label !== "" && options.length === 0) {
            content =
                <div>
                    <div>
                        <Label>{this.props.label}</Label>
                    </div>
                    <div>
                        <Spinner type={SpinnerType.normal} label={Constants.LoadingTeamsLabel} />
                    </div>
                </div>;
        } else if (this.props.label !== "" && options.length > 0) {
            content =
                <div>
                    <div>
                        <Label>{this.props.label}</Label>
                    </div>
                    <div>
                        <PickListDropdown
                            isSearchable={true}
                            selectionMode={SelectionMode.single}
                            getPickListItems={() => options}
                            selectedItems={this.state.selectedItems}
                            getListItem={(item) => item as IPickListItem}
                            onSelectionChanged={this._selectedTeamChanged}
                        />
                    </div>
                </div>;
        }
        return (
            <div>
                {content}
            </div>
        );
    }

    private _selectedTeamChanged = (selection: IPickListSelection) => {
        const items = (selection.selectedItems || []) as IPickListItem[];
        let team = items[0];
        this.props.onSelectTeam(team.name);
        this.setState({
            selectedItems: items
        });
    }
}