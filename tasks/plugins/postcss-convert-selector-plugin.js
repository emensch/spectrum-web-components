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

export const conversionTypes = {
    '.': 'class',
    ':': 'pseudo',
};

let noted = false;

/**
 * Return a postCSS plugin that converts selectors as per the type, conversions, and hostSelector
 * data curried into the function.
 *
 * @param {string} type
 * @param {array} conversions
 * @param {string} hostSelector
 * @returns {function(): void}
 */
export const convertSelector = (component, converter) => (selectors) => {
    selectors.walk((selector) => {
        const replacement = parser.selector();
        const processNode = (root) => (node, index) => {
            let newNode = converter(node, component, selector.toString());
            if (newNode) {
                if (newNode.value !== '::slotted' && !!newNode.value) {
                    // All ::slotted nodes will have been created by us, so their contents will already be "prepared".
                    // Nodes with no value will also have children that will already be "prepared".
                    newNode.empty?.();
                    node.nodes?.forEach(processNode(newNode));
                }
                root.append(newNode);
            }
        };
        selector.nodes?.forEach(processNode(replacement));
        const shouldProcessHost =
            replacement.first &&
            replacement.first.type === 'pseudo' &&
            replacement.first.value === ':host' &&
            replacement.first.first;
        if (shouldProcessHost) {
            const hostReplacement = parser.selector();
            const processNode = (node, root) => {
                let newNode = converter(node, component, selector.toString());
                newNode.empty?.();
                node.nodes?.forEach((node) => processNode(node, newNode));
                root.append(newNode);
            };
            replacement.first.first.nodes?.forEach((node) =>
                processNode(node, hostReplacement)
            );
            replacement.first.first.replaceWith(hostReplacement);
        }
        selector.replaceWith(replacement);
        return selector;
    });
    noted = false;
};
