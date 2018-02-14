import * as React from "react";

import { Dropdown, IDropdownOption } from "office-ui-fabric-react/lib/Dropdown";

export interface IActionOption {
    key: string;
    value: string;
}

export interface ISelectActionProps {
    availableOptions: IActionOption[];
    selectedAction?: IActionOption;
    onSelectAction: (selectedAction: string) => void;
    label: string;
    disabled?: boolean;
    placeHolder?: string;
}

export class SelectAction extends React.Component<ISelectActionProps, {}> {
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

        const selectedActionKey = this.props.selectedAction ? this.props.selectedAction.key : null;

        return (
            <div className="formContent">
                <Dropdown
                    label={this.props.label}
                    options={options}
                    selectedKey={selectedActionKey}
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