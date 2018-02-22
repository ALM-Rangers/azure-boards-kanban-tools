import * as React from "react";
import { css } from "office-ui-fabric-react/lib/Utilities";

export interface ISettingsToCopyProps {
    selectedSettings: string[];
}

export class SettingsToCopy extends React.Component<ISettingsToCopyProps, {}> {
    public render() {
        return (
            <div>
                The following styles will be copied: {this.props.selectedSettings.map((value, index, values) => {
                    let content = index < values.length - 1 ?
                        <span><span className={css("boldFont")}>{value}</span>, </span> : <span><span className={css("boldFont")}>{value}</span>.</span>;
                    return content;
                })}
            </div>
        );
    }
}