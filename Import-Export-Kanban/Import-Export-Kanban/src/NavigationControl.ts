/// <reference types="vss-web-extension-sdk" />

import UIControls = require("VSS/Controls");

export interface INavigationButtonUIState {
    label?: string;
    isEnabled: boolean;
    isVisible: boolean;
}

export interface INavigationButton extends INavigationButtonUIState {
    onClick(): Promise<void>;
}

export interface INavigation {
    previousButton: INavigationButton;
    nextButton: INavigationButton;
    okButton: INavigationButton;
    cancelButton: INavigationButton;
}

export enum NavigationButtonType {
    PREVIOUS,
    NEXT,
    OK,
    CANCEL
}
/**
 * Wizard navigation controls.
 *
 * It can have four buttons. Previous, Next, Ok and Cancel
 *
 * You can set the buttons individually (visible, enable, label and on click callback). The buttons cannot be changed dinamically, they will have to
 * be set when the class is instanced, but the state of the buttons can be dinamically controled during runtime.
 *
 * @param options
 * @returns
 */
export class NavigationControl extends UIControls.BaseControl {

    private _navigation: INavigation;

    /**
     * Construtor for a NavigationControl.
     *
     * Besides the general options  of a UIControl the Naviation option (type INavigation) to define how the navigation occurs
     * @param options
     */
    constructor(options) {
        super(options);

        this._navigation = options.Navigation;
    }

    /**
     *
     *   Initialize called for each control. Render the buttons (buttons cannot be dinamically added/removed but their properties can be changed)
     */
    initialize() {
        super.initialize();
        this._createButtons();
    }

    /**
     * This method can be used to dinamically change the state of a button
     * A button can be hidden/shown and enabled disabled. Optionally the label of the button can also be changed.
     *
     *
     * @param {NavigationButtonType} buttonType the type of the button you wish to change.
     * @param {INavigationButtonUIState} state
     */
    setButtonState(buttonType: NavigationButtonType, state: INavigationButtonUIState) {
        /// <summary>
        /// /
        /// </summary>
        /// <param name="buttonType" type="NavigationButtonType"></param>
        /// <param name="state" type="INavigationButtonUIState"></param>
        let buttonId = this._getButtonId(buttonType);

        let $button = $("#" + buttonId);

        if (state.isEnabled) {
            $button.removeAttr("disabled");
        }
        else {
            $button.attr("disabled", "disabled");
        }
        if (state.isVisible) {
            $button.show();
        }
        else {
            $button.hide();
        }

        if (state.label) {
            $button.text(state.label);
        }
    }

    /**
     *   Creates the buttons.
     *
     *  The buttons are created in order of appearence (previous,next,ok,cancel)
     */
    private _createButtons() {

        if (this._navigation === null) {
            console.log("No options. No navigation will be provided");
            return;
        }

        this._element.addClass("ui-dialog-buttonpane ui-helper-clearfix bowtie");

        $("<div class='ui-dialog-buttonset'></div>").appendTo(this._element);

        if (this._navigation.previousButton) {
            this._addButton(NavigationButtonType.PREVIOUS, this._navigation.previousButton, "Previous");
        }
        if (this._navigation.nextButton) {
            this._addButton(NavigationButtonType.NEXT, this._navigation.nextButton, "Next", true);
        }
        if (this._navigation.okButton) {
            this._addButton(NavigationButtonType.OK, this._navigation.okButton, "Ok", false, true);
        }
        if (this._navigation.cancelButton) {
            this._addButton(NavigationButtonType.CANCEL, this._navigation.cancelButton, "Cancel");
        }
    }

    /**
     * Gets the id of a button given it's type and the container.
     *
     * Ensures the id is unique (and deterministic) so more than one control can be placed on the same page.
     * @param {NavigationButtonType} buttonType - the type of the button
     * @returns the identifier of the type
     */
    private _getButtonId(buttonType: NavigationButtonType) {
        return this._getUniqueId() + "_" + buttonType.toString();
    }

    /**
     * Adds a button to the current element.
     *
     * The button is added to the end of the buttons set
     * @param {NavigationButtonType} buttonType - The type of the button
     * @param {INavigationButton} button - The button
     * @param {string} defaultLabel - The default label to be used (if no label was defined in the button)
     * @param {boolean} isCallToAction? Is the button a call to action
     * @param {boolean} isWarning? Is the button a warning button
     */
    private _addButton(buttonType: NavigationButtonType, button: INavigationButton, defaultLabel: string, isCallToAction?: boolean, isWarning?: boolean) {
        let cssClass: string = "";

        if (isCallToAction) {
            cssClass = "cta";
        }
        if (isWarning) {
            cssClass += " warning";
        }

        if (cssClass !== "") {
            cssClass = "class='" + cssClass + "'";
        }

        let inputId = this._getUniqueId() + "_" + buttonType.toString();
        let $button = $("<button id='" + this._getButtonId(buttonType) + "' type='button' " + cssClass + ">" + (button.label || defaultLabel) + "</button>").appendTo(this._element.find("div"));

        if (button.isEnabled === false) {
            $button.attr("disabled", "disabled");
        }

        if (button.isVisible === false) {
            $button.hide();
        }

        if (button.onClick) {
            $button.click(button.onClick);
        }
    }
}