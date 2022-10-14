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
export const whereifyHost = () => (selectors) => {
    selectors.walk((selector) => {
        const { first } = selector;
        if (first && first.type === 'pseudo' && first.value === ':host') {
            const host = parser.pseudo({ value: ':host' });
            const hostSelector = parser.selector();
            let pseudoElement;
            first.nodes.forEach((node, index) => {
                if (!node.value && !parser.isAttribute(node)) {
                    node.nodes?.forEach((innerNode) => {
                        if (parser.isPseudoElement(innerNode)) {
                            pseudoElement = innerNode.clone();
                            innerNode.remove();
                        }
                    });
                    if (!node.nodes?.length) {
                        node.remove();
                        return;
                    }
                }
                const where = parser.pseudo({ value: ':where' });
                where.append(node);
                hostSelector.append(where);
            });
            if (hostSelector.length) {
                host.append(hostSelector);
            }
            if (pseudoElement) {
                selector.insertAfter(first, pseudoElement);
            }
            first.replaceWith(host);
        }
        return selector;
    });
};
