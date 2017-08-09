/**
 * @license
 * Copyright 2013 Palantir Technologies, Inc.
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

const OPTION_IGNORE_URL = "url";

export class Rule extends Lint.Rules.AbstractRule {
    /* tslint:disable:object-literal-sort-keys */
    public static metadata: Lint.IRuleMetadata = {
        ruleName: "max-line-length",
        description: "Requires lines to be under a certain max length.",
        rationale: Lint.Utils.dedent`
            Limiting the length of a line of code improves code readability.
            It also makes comparing code side-by-side easier and improves compatibility with
            various editors, IDEs, and diff viewers.`,
        optionsDescription: "An integer indicating the max length of lines.",
        options: {
            type: "array",
            items: [
                {
                    type: "number",
                    minimum: 1,
                },
                {
                    type: "string",
                    enum: [OPTION_IGNORE_URL],
                },
            ],
            minLength: 1,
            maxLength: 2,
        },
        optionExamples: [[true, 120]],
        type: "maintainability",
        typescriptOnly: false,
    };
    /* tslint:enable:object-literal-sort-keys */

    public static FAILURE_STRING_FACTORY(lineLimit: number) {
        return `Exceeds maximum line length of ${lineLimit}`;
    }

    public isEnabled(): boolean {
        return super.isEnabled() && this.ruleArguments[0] as number > 0;
    }

    public apply(sourceFile: ts.SourceFile): Lint.RuleFailure[] {
        return this.applyWithWalker(new MaxLineLengthWalker(sourceFile, this.ruleName, this.ruleArguments));
    }
}

class MaxLineLengthWalker extends Lint.AbstractWalker<any[]> {
    public walk(sourceFile: ts.SourceFile) {
        const limit = this.options[0];
        for (const line of getLines(sourceFile)) {
            if (line.contentLength > (limit as number)) {
                if (this.options[1] === OPTION_IGNORE_URL && line.hasUrl) {
                    continue;
                }
                this.addFailureAt(line.pos, line.contentLength, Rule.FAILURE_STRING_FACTORY(limit as number));
            }
        }
    }
}

function getLines(sourceFile: ts.SourceFile): ILineRange[] {
    const lineStarts = sourceFile.getLineStarts();
    const result = [];
    const length = lineStarts.length;
    const sourceText = sourceFile.text;
    let pos = 0;
    for (let i = 1; i < length; ++i) {
        const end = lineStarts[i];
        let lineEnd = end;
        for (; lineEnd > pos; --lineEnd) {
            if (!ts.isLineBreak(sourceText.charCodeAt(lineEnd - 1))) {
                break;
            }
        }
        result.push({
            content: sourceFile.text.substr(pos, lineEnd - pos),
            contentLength: lineEnd - pos,
            end,
            hasUrl: lineContainsUrl(sourceFile.text.substr(pos, lineEnd - pos)),
            pos,
        });
        pos = end;
    }
    result.push({
        content: sourceFile.text.substr(pos, sourceFile.end - pos),
        contentLength: sourceFile.end - pos,
        end: sourceFile.end,
        hasUrl: lineContainsUrl(sourceFile.text.substr(pos, sourceFile.end - pos)),
        pos,
    });
    return result;
}

interface ILineRange {
    pos: number;
    end: number;
    contentLength: number;
    hasUrl: boolean;
    content: string;
}

function lineContainsUrl(sourceText: string): boolean {
    return (sourceText.indexOf("://") > -1) ? true : false;
}
