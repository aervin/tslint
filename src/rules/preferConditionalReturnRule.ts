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

import {
    isBinaryExpression,
    isExpressionStatement,
    isIfStatement,
    isReturnStatement,
} from "tsutils";
import * as ts from "typescript";
import * as Lint from "..";

export class Rule extends Lint.Rules.AbstractRule {
    /* tslint:disable:object-literal-sort-keys */
    public static metadata: Lint.IRuleMetadata = {
        ruleName: "prefer-conditional-return",
        description:
            "Enforces that return statements be conditional expressions when possible.",
        optionsDescription: "Not configurable.",
        options: null,
        optionExamples: [true],
        type: "style",
        typescriptOnly: false,
    };

    public static RULE_FAILURE_RETURN = "Return values using a conditional expression instead of an 'if' statement";

    public static RULE_FAILURE_ASSIGNMENT(identifier: string) {
        return `Assign to '${identifier}' using a conditional expression instead of an 'if' statement`;
    }

    public apply(sourceFile: ts.SourceFile): Lint.RuleFailure[] {
        return this.applyWithWalker(
            new Walker(sourceFile, this.ruleName, undefined),
        );
    }
}

class Walker extends Lint.AbstractWalker<void> {
    public walk(sourceFile: ts.SourceFile): void {
        const checkIfStatementForErrors = (node: ts.Node): undefined => {
            /* Check all if statements for redundant return statements */
            if (
                isIfStatement(node) &&
                hasElseStatement(node) &&
                hasThenStatementWithSingleReturn(node) &&
                hasElseStatementWithSingleReturn(node.elseStatement)
            ) {
                this.addFailureAt(node.getStart(), 2, Rule.RULE_FAILURE_RETURN);
            }

            /* Check all if statements for redundant assignments */
            if (
                isIfStatement(node) &&
                hasElseStatement(node) &&
                thenBlockAssignment(node.thenStatement as ts.Block) !== undefined &&
                elseBlockAssignment(node.elseStatement as ts.Block) !== undefined &&
                thenBlockAssignment(node.thenStatement as ts.Block)!.getText() ===
                    elseBlockAssignment(node.elseStatement as ts.Block)!.getText()
            ) {
                this.addFailureAt(
                    node.getStart(),
                    2,
                    Rule.RULE_FAILURE_ASSIGNMENT(
                        thenBlockAssignment(
                            node.thenStatement as ts.Block,
                        )!.getText(),
                    ),
                );
            }

            return ts.forEachChild(node, checkIfStatementForErrors);
        };

        return ts.forEachChild(sourceFile, checkIfStatementForErrors);
    }
}

function elseBlockAssignment(elseBlock: ts.Block): ts.Identifier | undefined {
    return elseBlock.statements.length === 1 &&
        isExpressionStatement(elseBlock.statements[0]) &&
        isBinaryExpression(
            (elseBlock.statements[0] as ts.ExpressionStatement).expression,
        )
        ? (((elseBlock.statements[0] as ts.ExpressionStatement)
              .expression as ts.BinaryExpression).left as ts.Identifier)
        : undefined;
}

function hasElseStatement(statement: ts.IfStatement): boolean {
    return (
        statement.elseStatement !== undefined && ts.isBlock(statement.elseStatement)
    );
}

function hasElseStatementWithSingleReturn(
    statement: ts.Statement | undefined,
): boolean {
    return (
        (statement as ts.Block).statements !== undefined &&
        (statement as ts.Block).statements.length === 1 &&
        isReturnStatement((statement as ts.Block).statements[0])
    );
}

function hasThenStatementWithSingleReturn(statement: ts.IfStatement): boolean {
    return (
        (statement.thenStatement as ts.Block).statements !== undefined &&
        (statement.thenStatement as ts.Block).statements.length === 1 &&
        isReturnStatement((statement.thenStatement as ts.Block).statements[0])
    );
}

// function isLongAssignmentException(node: ts.IfStatement): boolean {
//     return (
//         (
//             node.expression.getText() +
//             (((node.thenStatement as ts.Block).statements[0] as ts.ExpressionStatement)
//                 .expression as ts.BinaryExpression).left.getText() +
//             thenBlockAssignment(node.thenStatement as ts.Block)!.getText() +
//             elseBlockAssignment(node.elseStatement as ts.Block)!.getText()
//         ).length > 50
//     );
// }

// function isLongReturnException(node: ts.IfStatement): boolean {
//     return (
//         (
//             node.expression.getText() +
//             ((node.thenStatement as ts.Block).statements[0] as ts.ReturnStatement)
//                 .expression!.getText() +
//             ((node.elseStatement as ts.Block).statements[0] as ts.ReturnStatement)
//                 .expression!.getText()
//         ).length > 50
//     );
// }

function thenBlockAssignment(thenBlock: ts.Block): ts.Identifier | undefined {
    return thenBlock.statements.length === 1 &&
        isExpressionStatement(thenBlock.statements[0]) &&
        isBinaryExpression(
            (thenBlock.statements[0] as ts.ExpressionStatement).expression,
        )
        ? (((thenBlock.statements[0] as ts.ExpressionStatement)
              .expression as ts.BinaryExpression).left as ts.Identifier)
        : undefined;
}
