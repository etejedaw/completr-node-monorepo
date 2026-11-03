import { Directive } from "@angular/core";
import {
	NgpDescription,
	NgpFormField,
	NgpLabel
} from "ng-primitives/form-field";

@Directive({
	selector: "[uiFormField]",
	hostDirectives: [NgpFormField]
})
export class UiFormField {}

@Directive({
	selector: "label[uiLabel]",
	hostDirectives: [{ directive: NgpLabel, inputs: ["id"] }]
})
export class UiLabel {}

@Directive({
	selector: "[uiDescription]",
	hostDirectives: [{ directive: NgpDescription, inputs: ["id"] }]
})
export class UiDescription {}
