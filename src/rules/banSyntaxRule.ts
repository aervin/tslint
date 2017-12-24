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

export class Rule extends Lint.Rules.AbstractRule {
    /* tslint:disable:object-literal-sort-keys */
    public static metadata: Lint.IRuleMetadata = {
        ruleName: "ban-syntax",
        description: "Uses NodeType names to disallow language features.",
        optionsDescription: Lint.Utils.dedent``,
        options: {
            type: "array",
            items: [
                {
                    type: "string",
                },
            ],
            additionalItems: false,
            minLength: 1,
        },
        optionExamples: [[true, ["DeleteExpression", "GetAccessor"]]],
        type: "functionality",
        typescriptOnly: false,
    };
    /* tslint:enable:object-literal-sort-keys */

    public static FAILURE_STRING_FACTORY(nodeType: string) {
        return `Usage of ${nodeType} has been disallowed.`;
    }

    public apply(sourceFile: ts.SourceFile): Lint.RuleFailure[] {
        return this.applyWithWalker(
            new BanSyntaxWalker(
                sourceFile,
                this.ruleName,
                this.ruleArguments[0] as string[] | undefined,
            ),
        );
    }
}

class BanSyntaxWalker extends Lint.AbstractWalker<string[] | undefined> {
    public walk(sourceFile: ts.SourceFile) {
        const checkForBannedNode = (node: ts.Node): void => {
            if (
                this.options !== undefined &&
                this.options.some(
                    (nodeType: string) => ts.SyntaxKind[node.kind] === nodeType,
                )
            ) {
                this.addFailureAtNode(
                    node,
                    Rule.FAILURE_STRING_FACTORY(ts.SyntaxKind[node.kind]),
                );
            }
            return ts.forEachChild(node, checkForBannedNode);
        };
        return ts.forEachChild(sourceFile, checkForBannedNode);
    }
}
