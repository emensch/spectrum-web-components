/*
Copyright 2022 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

import parser from 'postcss-selector-parser';
import chalk from 'chalk';
import { conversionTypes } from './postcss-convert-selector-plugin.js';

export const converterSlotted = (node, component, rawSelector) => {
    const { slots: conversions = [] } = component;
    let newNode = node.clone();
    conversions.forEach((conversion) => {
        const conversionType = conversionTypes[conversion.selector[0]];
        const value =
            conversionType === 'pseudo'
                ? conversion.selector
                : conversion.selector.slice(1);
        if (node.type === conversionType && node.value === value) {
            let slot;
            const next = node.next();
            if (next) {
                if (next.value !== '+' && next.value !== '~') {
                    // eslint-disable-next-line no-console
                    console.log(
                        chalk.bold.yellow(
                            `   ::slotted() rules must be the last in the selector:`
                        )
                    );
                    // eslint-disable-next-line no-console
                    console.log(chalk.yellow(`      ${rawSelector}`));
                } else {
                    slot = parser.selector();
                    slot.append(parser.tag({ value: 'slot' }));
                    if (conversion.name) {
                        slot.append(
                            parser.attribute({
                                attribute: 'name',
                                operator: '=',
                                value: `"${conversion.name}"`,
                                quoteMark: '"',
                            })
                        );
                    }
                }
            } else {
                slot = parser.pseudo({ value: '::slotted' });
                const slottedSelector = parser.selector();
                const attributeSelector = parser.attribute({
                    attribute: 'slot',
                    operator: '=',
                    value: `"${conversion.name}"`,
                    quoteMark: '"',
                });
                if (conversion.content) {
                    const processor = parser();
                    const contentSelector = processor.astSync(
                        conversion.content
                    );
                    slottedSelector.append(contentSelector);
                }
                slottedSelector.append(attributeSelector);
                slot.append(slottedSelector);
            }
            newNode = slot;
        }
    });
    return newNode;
};
