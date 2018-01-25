import * as React from "react";

import { Dropdown, IDropdownOption } from "office-ui-fabric-react/lib/Dropdown";

export interface IActionOption {
    key: string;
    value: string;
}

export interface ISelectActionProps {
    availableOptions: IActionOption[];
    onSelectAction: (selectedAction: string) => void;
    label: string;
    disabled?: boolean;
    placeHolder?: string;
}

export class SelectAction extends React.Component<ISelectActionProps, {}> {
    private test: string = "test";

    public render() {
        let options: IDropdownOption[] = [];
        if (this.props.availableOptions) {
            this.props.availableOptions.forEach(action => {
                let dropdownOption: IDropdownOption = {
                    key: action.key,
                    text: action.value
                };
                options.push(dropdownOption);
            });
        }

        return (
            <div className="formContent">
                <Dropdown
                    label={this.props.label}
                    options={options}
                    placeHolder={this.props.placeHolder}
                    disabled={this.props.disabled}
                    onChanged={this._onActionSelected} />
            </div>
        );
    }

    private _onActionSelected = (item: IDropdownOption) => {
        this.props.onSelectAction(item.key.toString());
    }
}