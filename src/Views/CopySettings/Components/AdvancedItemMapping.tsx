import * as React from "react";

import { Panel, PanelType } from "office-ui-fabric-react/lib/Panel";
import { GroupedList, IGroup, IGroupDividerProps } from "office-ui-fabric-react/lib/GroupedList";
import { css } from "office-ui-fabric-react/lib/Utilities";
import { Dropdown, IDropdownOption } from "office-ui-fabric-react/lib/Dropdown";
import { IBoardColumnDifferences, IColumnMapping } from "src/Views/CopySettings/Models/CopySettingsInterfaces";
import * as Constants from "src/Shared/Constants";

import "./AdvancedItemMapping.scss";

export interface IAdvancedItemMappingProps {
    show: boolean;
    headerText: string;
    onClosed: () => void;
    onMappingChanged: (selectedId: string, sourceId) => void;
    mappings: IBoardColumnDifferences[];
    selectedLevels: string[];
}

export class AdvancedItemMapping extends React.Component<IAdvancedItemMappingProps, {}> {
    private _itemsCount: number;

    constructor(props: IAdvancedItemMappingProps) {
        super(props);
        this._itemsCount = 0;
    }

    public render() {
        let groups: IGroup[] = [];
        let mappingItems: IColumnMapping[] = [];
        let startIndex = 0;
        if (!this.props.mappings) {
            return null;
        }
        this.props.mappings.forEach(mapping => {
            if (this.props.selectedLevels.indexOf(mapping.backlog) >= 0) {
                let multipleMappings = mapping.mappings.filter(m => m.potentialMatches.length > 1);
                mappingItems = mappingItems.concat(multipleMappings);
                groups.push({
                    key: mapping.backlog,
                    name: mapping.backlog,
                    startIndex: startIndex,
                    count: multipleMappings.length
                });
                startIndex = startIndex + multipleMappings.length;
            }
        });
        this._itemsCount = mappingItems.length;
        return (
            <div>
                <Panel
                    hasCloseButton={true}
                    isOpen={this.props.show}
                    type={PanelType.extraLarge}
                    headerText={this.props.headerText}
                    isLightDismiss={false}
                    onDismiss={this._onPanelDismissed}>
                    <div>
                        <div className={css("formContent", "ms-font-m")}>
                            {Constants.MappingsDescription}
                        </div>
                        <div>
                            <GroupedList
                                items={mappingItems}
                                groups={groups}
                                onRenderCell={this._onRenderCell}
                                groupProps={
                                    {
                                        onRenderHeader: this._onRenderGroupHeader
                                    }
                                }
                            />
                        </div>
                    </div>
                </Panel>
            </div>
        );
    }

    private _onRenderCell = (nestingDepth: number, item: IColumnMapping, itemIndex: number) => {
        let dropdownOptions: IDropdownOption[] = [];
        item.potentialMatches.forEach(match => {
            dropdownOptions.push({
                key: match.id,
                text: match.name,
                data: item.targetColumn.id
            });
        });
        let className = "";
        if (itemIndex === this._itemsCount - 1) {
            className = css("lastItem");
        }
        return (
            <div className={className}>
                <Dropdown
                    options={dropdownOptions}
                    selectedKey={item.sourceColumn.id}
                    label={item.targetColumn.name}
                    onChanged={this._onMappingChanged} />
            </div>
        );
    }

    private _onMappingChanged = (item: IDropdownOption) => {
        this.props.onMappingChanged(item.key.toString(), item.data.toString());
    }

    private _onRenderGroupHeader = (props: IGroupDividerProps): JSX.Element => {
        return (
            <div className={css("ms-font-xl")}>
                {props.group.name}
            </div>
        );
    }

    private _onPanelDismissed = (): void => {
        this.props.onClosed();
    }
}