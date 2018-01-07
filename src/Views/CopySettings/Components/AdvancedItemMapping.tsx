import * as React from "react";

import { Panel, PanelType } from "office-ui-fabric-react/lib/Panel";
// import { IBoardColumnDifferences } from "src/Models";

export interface IAdvancedItemMappingProps {
    show: boolean;
    headerText: string;
    onClosed: () => void;
    // columnDifferences?: IBoardColumnDifferences;
    selectedLevels?: string[];
}

export class AdvancedItemMapping extends React.Component<IAdvancedItemMappingProps, {}> {
    public render() {
        return (
            <div>
                <Panel
                    hasCloseButton={true}
                    isOpen={this.props.show}
                    type={PanelType.extraLarge}
                    headerText={this.props.headerText}
                    isLightDismiss={false}
                    onDismiss={this._onPanelDismissed} />
            </div>
        );
    }

    private _onPanelDismissed = (): void => {
        this.props.onClosed();
    }
}