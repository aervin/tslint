/**
 * @license
 * Copyright 2017 Palantir Technologies, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as ts from "typescript";
import * as Lint from "../index";

import { getChildOfKind, isGetAccessorDeclaration, isSetAccessorDeclaration } from "tsutils";

export class Rule extends Lint.Rules.AbstractRule {
    /* tslint:disable:object-literal-sort-keys */
    public static metadata: Lint.IRuleMetadata = {
        ruleName: "no-get-set-accessors",
        description: Lint.Utils.dedent`
            Disallows get/set accessors.`,
        rationale: Lint.Utils.dedent`
            Enforces a consistent method of accessing/manipulating class members.`,
        optionsDescription: "Not configurable.",
        options: null,
        type: "functionality",
        typescriptOnly: false,
    };
    /* tslint:enable:object-literal-sort-keys */

    public static FAILURE_STRING = "Get/set accessors have been disallowed.";

    public apply(sourceFile: ts.SourceFile): Lint.RuleFailure[] {
        return this.applyWithWalker(
            new NoGetSetAccessorWalker(sourceFile, this.ruleName, undefined),
        );
    }
}

class NoGetSetAccessorWalker extends Lint.AbstractWalker<void> {
    public walk(sourceFile: ts.SourceFile) {
        const checkIfAccessor = (node: ts.Node): void => {
            if (isGetAccessorDeclaration(node) || isSetAccessorDeclaration(node)) {
                this.addFailureAtNode(
                    isGetAccessorDeclaration(node)
                        ? getChildOfKind(node, ts.SyntaxKind.GetKeyword, this.sourceFile)!
                        : getChildOfKind(node, ts.SyntaxKind.SetKeyword, this.sourceFile)!,
                    Rule.FAILURE_STRING,
                );
            }
            return ts.forEachChild(node, checkIfAccessor);
        };
        ts.forEachChild(sourceFile, checkIfAccessor);
    }
}
