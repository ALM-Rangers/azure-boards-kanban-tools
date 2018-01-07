import * as React from "react";

import { Dropdown, IDropdownOption } from "office-ui-fabric-react/lib/Dropdown";
import { Spinner, SpinnerType } from "office-ui-fabric-react/lib/Spinner";
import { Label } from "office-ui-fabric-react/lib/Label";
import * as Constants from "src/Shared/Constants";

export interface ISelectBacklogLevelsProps {
    availableLevels: string[];
    selectedLevels: string[];
    label: string;
    isLoading: boolean;
    onBacklogLevelSelected: (team: string, isSelected: boolean) => void;
}

export class SelectBacklogLevels extends React.Component<ISelectBacklogLevelsProps, {}> {
    constructor(props: ISelectBacklogLevelsProps) {
        super(props);
    }

    public render() {
        let options: IDropdownOption[] = [];
        let content: JSX.Element = null;
        let selectedKeys: string[] = [];
        if (this.props.availableLevels) {
            this.props.availableLevels.forEach(item => {
                options.push({
                    key: item,
                    text: item
                });
                if (this.props.selectedLevels && this.props.selectedLevels.indexOf(item) > -1) {
                    selectedKeys.push(item);
                }
            });
        }
        if (this.props.isLoading) {
            content =
                <div>
                    <div>
                        <Label>{this.props.label}</Label>
                    </div>
                    <div>
                        <Spinner type={SpinnerType.normal} label={Constants.LoadingBacklogsLabel} />
                    </div>
                </div>;
        } else {
            content =
                <Dropdown
                    label={this.props.label}
                    multiSelect
                    options={options}
                    selectedKeys={selectedKeys}
                    disabled={options.length === 0}
                    onChanged={this._onSelectedBacklogLevelChanged} />;
        }
        return (
            <div>
                {content}
            </div>
        );
    }

    private _onSelectedBacklogLevelChanged = (item: IDropdownOption) => {
        this.props.onBacklogLevelSelected(item.key.toString(), item.selected);
    }
}