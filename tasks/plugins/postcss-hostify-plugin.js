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
 * Return a postCSS plugin that ensures that the first selector in a rule is :host.
 *
 * @param {string} hostSelector
 * @returns {function(): void}
 */
export const hostify = (hostSelector) => (selectors) => {
    selectors.walk((selector) => {
        if (!selector.nodes) return selector;
        const replacement = parser.selector();
        let metCombinatorAt = -1;
        let metHost = 'no';
        let metHostAt = -1;
        selector.nodes.forEach((node, index) => {
            replacement.append(node.clone());
            if (
                metCombinatorAt > -1 ||
                (parser.isCombinator(node) && node.value === ' ')
            ) {
                metCombinatorAt =
                    metCombinatorAt > -1 ? metCombinatorAt : index;
            }
            if (!node.value) return;
            if (node.value === hostSelector) {
                metHost = 'yes';
                metHostAt = index;
            } else if (node.value.startsWith(`${hostSelector}--`)) {
                // If the answer is already 'yes', don't overwrite it.
                metHost = metHost === 'no' ? 'is' : metHost;
            }
        });
        if (metCombinatorAt === -1) {
            metCombinatorAt = selector.nodes.length;
        }
        if (metHost === 'no') {
            // The host selector was never met, prepend `:host ` to the selector.
            replacement.prepend(parser.combinator({ value: ' ' }));
            replacement.prepend(parser.pseudo({ value: ':host' }));
        } else if (metHost === 'is') {
            // The host selector was never met, but a modifier on the host was, prepend `:host()` to the selector,
            // and place the modifier class(es) inside of it.
            const host = parser.pseudo({ value: ':host' });
            const hostSelector = parser.selector();
            let index = metCombinatorAt;
            while (index) {
                index -= 1;
                const node = replacement.nodes[index];
                hostSelector.prepend(node.clone());
                node.remove();
            }
            if (hostSelector.length) {
                host.append(hostSelector);
            }
            replacement.prepend(host);
        } else if (
            metHost === 'yes' &&
            metCombinatorAt === 1 &&
            metHostAt < metCombinatorAt
        ) {
            // An unmodified host select was the first selector, replace it with `:host`
            const host = parser.pseudo({ value: ':host' });
            replacement.nodes[0].replaceWith(host);
        } else {
            // The host selector, and host modifiers were found. Remove the host selector and
            // wrap the modifiers in a `:host()`.
            const host = parser.pseudo({ value: ':host' });
            const hostSelector = parser.selector();
            let index = metCombinatorAt;
            if (metHostAt >= metCombinatorAt) {
                const node = replacement.nodes[metHostAt];
                node.prev().remove();
                node.remove();
            }
            while (index) {
                index -= 1;
                const node = replacement.nodes[index];
                if (index !== metHostAt) {
                    hostSelector.prepend(node.clone());
                }
                node.remove();
            }
            if (hostSelector.length) {
                host.append(hostSelector);
            }
            replacement.prepend(host);
        }
        selector.replaceWith(replacement);
        return selector;
    });
};
