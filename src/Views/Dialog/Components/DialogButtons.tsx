import * as React from "react";
import * as TC from "telemetryclient-team-services-extension";

import { PrimaryButton, DefaultButton } from "office-ui-fabric-react/lib/Button";
import { css } from "office-ui-fabric-react/lib/Utilities";
import * as Constants from "src/Shared/Constants";
import { Telemetry } from "src/TelemetryClientSettings";

export interface IDialogButtonsProps {
    enabled: boolean;
    okButtonText?: string;
    showCancelButton: boolean;
    okButtonClicked: () => void;
    cancelButtonClicked: () => void;
}

export class DialogButtons extends React.Component<IDialogButtonsProps, {}> {
    public render() {
        const label = this.props.okButtonText ? this.props.okButtonText : Constants.DefaultOkButton;
        const primaryButtonCss = this.props.showCancelButton ? "last-action" : "";
        const cancelButtonContent = this.props.showCancelButton ?
            <div className={css("dialog-action", "last-action")}>
                <DefaultButton onClick={this._onCancelButtonClicked}>{Constants.DefaultCancelButton}</DefaultButton>
            </div>
            :
            null;
        return (
            <div className={css("button-pane", primaryButtonCss)}>
                <div className={css("dialog-action")}>
                    <PrimaryButton disabled={!this.props.enabled} onClick={this._onPrimaryButtonClicked}>{label}</PrimaryButton>
                </div>
                {cancelButtonContent}
            </div>
        );
    }

    private _onPrimaryButtonClicked = () => {
        Telemetry.Client().trackEvent(Constants.TelemetryCopyCompleted);
        this.props.okButtonClicked();
    }

    private _onCancelButtonClicked = () => {
        Telemetry.Client().trackEvent(Constants.TelemetryDialogCancelled);
        this.props.cancelButtonClicked();
    }
}