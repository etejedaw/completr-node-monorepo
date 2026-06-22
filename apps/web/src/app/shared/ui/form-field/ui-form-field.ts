import { Directive } from "@angular/core";
import {
	NgpDescription,
	NgpError,
	NgpFormField,
	NgpLabel
} from "ng-primitives/form-field";

/**
 * Wire ARIA relationships between a label, control, description and error
 * inside a form field. Apply these directives on existing markup — no styling
 * is imposed. Pair with `uiInput`, `uiTextarea`, etc.
 *
 *   <div uiFormField>
 *     <label uiLabel>Bio</label>
 *     <textarea uiTextarea formControlName="bio"></textarea>
 *     <p uiDescription>Markdown supported.</p>
 *     <p uiError>Bio is required.</p>
 *   </div>
 */
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

@Directive({
	selector: "[uiError]",
	hostDirectives: [
		{ directive: NgpError, inputs: ["id", "ngpErrorValidator: validator"] }
	]
})
export class UiError {}
