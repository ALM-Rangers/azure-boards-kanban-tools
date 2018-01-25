import * as React from "react";

import * as CoreContracts from "TFS/Core/Contracts";
import { Dropdown, IDropdownOption } from "office-ui-fabric-react/lib/Dropdown";
import { Spinner, SpinnerType } from "office-ui-fabric-react/lib/Spinner";
import { Label } from "office-ui-fabric-react/lib/Label";
import * as Constants from "src/Shared/Constants";

export interface ISelectTeamProps {
    availableTeams: CoreContracts.WebApiTeam[];
    onSelectTeam: (selectedTeam: string) => void;
    isLoading: boolean;
    label: string;
    disabled: boolean;
    placeHolder?: string;
}

export class SelectTeam extends React.Component<ISelectTeamProps, {}> {
    constructor(props: ISelectTeamProps) {
        super(props);
    }

    public render() {
        let options: IDropdownOption[] = [];
        if (this.props.availableTeams) {
            this.props.availableTeams.map(team => {
                const teamOption: IDropdownOption = {
                    key: team.id,
                    text: team.name
                };
                options.push(teamOption);
            });
        }
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
                <Dropdown
                    placeHolder={Constants.SelectTeamPlaceholder}
                    label={this.props.label}
                    options={options}
                    disabled={options.length === 0 || this.props.disabled}
                    onChanged={this._selectedTeamChanged} />;
        }
        return (
            <div>
                {content}
            </div>
        );
    }

    private _selectedTeamChanged = (item: IDropdownOption) => {
        this.props.onSelectTeam(item.text);
    }
}