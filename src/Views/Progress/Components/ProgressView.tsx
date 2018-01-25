import * as React from "react";

import { ZeroData } from "vss-ui/ZeroData";
import { Spinner, SpinnerType } from "office-ui-fabric-react/lib/Spinner";

export interface IProgressViewProps {
    message: string;
    showSpinner: boolean;
    submessage?: string;
}

export class ProgressView extends React.Component<IProgressViewProps, {}> {
    public render() {
        let spinnerContent = this.props.showSpinner ?
            <div>
                <Spinner type={SpinnerType.large} />
            </div>
            :
            null;

        return (
            <div>
                <div className="formContent">
                    <ZeroData
                        imagePath={"../img/brush-large.png"}
                        primaryText={this.props.message}
                        secondaryText={this.props.submessage}
                        imageAltText={null} />
                </div>
                {spinnerContent}
            </div>
        );
    }

    public onDone() {

    }
}