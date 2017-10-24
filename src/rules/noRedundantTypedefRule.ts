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

import { isArrowFunction, isVariableDeclaration } from "tsutils";
import * as ts from "typescript";
import * as Lint from "../index";

export class Rule extends Lint.Rules.AbstractRule {
    /* tslint:disable:object-literal-sort-keys */
    public static metadata: Lint.IRuleMetadata = {
        ruleName: "no-redundant-typedef",
        description: "Disallows declarations with redundant type definitions.",
        optionsDescription: "Not configurable.",
        options: null,
        type: "maintainability",
        typescriptOnly: true,
        requiresTypeInfo: false,
    };
    /* tslint:enable:object-literal-sort-keys */

    public static FAILURE_STRING = "This declaration has redundant type annotations.";

    public apply(sourceFile: ts.SourceFile): Lint.RuleFailure[] {
        return this.applyWithWalker(
            new NoRedundantTypedefWalker(sourceFile, this.ruleName, undefined),
        );
    }
}

class NoRedundantTypedefWalker extends Lint.AbstractWalker<void> {
    public walk(sourceFile: ts.SourceFile) {
        const cb = (node: ts.Node): void => {
            if (isVariableDeclaration(node) && variableNeedsChecking(node)) {
                if (
                    hasDuplicateReturnAnnotations(node) ||
                    hasDuplicateParamAnnotations(node)
                ) {
                    this.addFailureAtNode(
                        node.name,
                        Rule.FAILURE_STRING,
                        getFix(node),
                    );
                }
            }
            return ts.forEachChild(node, cb);
        };
        return ts.forEachChild(sourceFile, cb);
    }
}

function getArrowFunctionFix(initializer: ts.ArrowFunction): Lint.Replacement {
    return Lint.Replacement.replaceFromTo(
        initializer.parameters.length > 0
            ? initializer.parameters[initializer.parameters.length - 1].getEnd()
            : initializer.getStart(),
        initializer.equalsGreaterThanToken.getStart(),
        initializer.parameters.length > 0 ? ") " : "() ",
    );
}

function getFix(node: ts.VariableDeclaration): Lint.Replacement[] {
    const fixes = [];
    const { initializer } = node;
    if (hasDuplicateParamAnnotations(node)) {
        for (const param of (initializer as ts.FunctionExpression).parameters) {
            fixes.push(
                Lint.Replacement.deleteFromTo(
                    param.name.getEnd(),
                    param.getEnd(),
                ),
            );
        }
    }
    if (hasDuplicateReturnAnnotations(node) && initializer !== undefined) {
        fixes.push(
            isArrowFunction(initializer)
                ? getArrowFunctionFix(initializer)
                : getFunctionExpressionFix(
                      initializer as ts.FunctionExpression,
                  ),
        );
    }
    return fixes;
}

function getFunctionExpressionFix(
    initializer: ts.FunctionExpression,
): Lint.Replacement {
    return Lint.Replacement.replaceFromTo(
        initializer.parameters.length > 0
            ? initializer.parameters[initializer.parameters.length - 1].getEnd()
            : initializer.getStart(),
        initializer.body.getStart(),
        initializer.parameters.length > 0
            ? ") "
            : `function${initializer.name !== undefined
                  ? initializer.name.text
                  : ""}() `,
    );
}

function hasDuplicateParamAnnotations(node: ts.VariableDeclaration): boolean {
    return (node.initializer as ts.FunctionExpression).parameters ===
        undefined || (node.type as ts.FunctionTypeNode).parameters === undefined
        ? false
        : (node.type as ts.FunctionTypeNode).parameters.some(
              (param: ts.ParameterDeclaration) => param.type !== undefined,
          ) &&
              (node.initializer as ts.FunctionExpression).parameters.some(
                  (param: ts.ParameterDeclaration) => param.type !== undefined,
              );
}

function hasDuplicateReturnAnnotations(node: ts.VariableDeclaration): boolean {
    return (
        node.type!.kind === ts.SyntaxKind.FunctionType &&
        (node.initializer as ts.FunctionLike).type !== undefined
    );
}

function variableNeedsChecking(node: ts.Node): boolean {
    return !isVariableDeclaration(node) ||
        (node.initializer === undefined || node.type === undefined)
        ? false
        : true;
}
