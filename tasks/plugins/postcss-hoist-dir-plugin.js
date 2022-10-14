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

/**
 * When provided with the value of a class name, return a postCSS plugin that
 * wraps all selectors modifying this class name with `:where()` to reduce their specificity.
 *
 * @param {string} hostSelector
 * @returns {function(): void}
 */
export const hoistDir = (selectors) => {
    selectors.walk((selector) => {
        selector.nodes?.forEach((node) => {
            if (
                node.type === 'attribute' &&
                node.attribute?.startsWith('dir')
            ) {
                const dir = node.value?.replace(/"/g, '').replace(/'/g, '');
                const dirPseudo = parser.pseudo({ value: ':dir' });
                if (dir) {
                    const dirSelector = parser.selector();
                    dirSelector.append(parser.tag({ value: dir }));
                    dirPseudo.append(dirSelector);
                }
                node.replaceWith(dirPseudo);
            }
        });
        let dir = '';
        let hasDir = false;
        selector.nodes?.forEach((node) => {
            if (node.type === 'pseudo' && node.value === ':dir') {
                hasDir = true;
                dir = node.first?.first?.value;
                node.remove();
            }
        });
        if (hasDir) {
            const dirSelector = parser.attribute({
                attribute: 'dir',
                value: dir,
                quoteMark: '"',
                operator: '=',
            });
            if (selector.first && selector.first.prepend) {
                selector.first.prepend(dirSelector);
            } else {
                selector.append(dirSelector);
            }
        }
        return selector;
    });
};
