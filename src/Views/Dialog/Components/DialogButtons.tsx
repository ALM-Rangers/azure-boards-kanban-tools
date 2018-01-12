import * as React from "react";
import { PrimaryButton, DefaultButton } from "office-ui-fabric-react/lib/Button";
import { css } from "office-ui-fabric-react/lib/Utilities";
import * as Constants from "src/Shared/Constants";

export interface IDialogButtonsProps {
    enabled: boolean;
    okButtonText?: string;
    okButtonClicked: () => void;
    cancelButtonClicked: () => void;
}

export class DialogButtons extends React.Component<IDialogButtonsProps, {}> {
    public render() {
        const label = this.props.okButtonText ? this.props.okButtonText : Constants.DefaultOkButton;
        return (
            <div className={css("button-pane")}>
                <div className={css("dialog-action")}>
                    <PrimaryButton disabled={!this.props.enabled} onClick={this._onPrimaryButtonClicked}>{label}</PrimaryButton>
                </div>
                <div className={css("dialog-action", "last-action")}>
                    <DefaultButton onClick={this._onCancelButtonClicked}>{Constants.DefaultCancelButton}</DefaultButton>
                </div>
            </div>
        );
    }

    private _onPrimaryButtonClicked = () => {
        this.props.okButtonClicked();
    }

    private _onCancelButtonClicked = () => {
        this.props.cancelButtonClicked();
    }
}