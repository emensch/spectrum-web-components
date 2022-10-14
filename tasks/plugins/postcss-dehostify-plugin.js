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

/**
 * Return a postCSS plugin that removes unmodified :host selectors from child selectors.
 *
 * @param {string} hostSelector
 * @returns {function(): void}
 */
export const dehostify = (selectors) => {
    selectors.walk((selector) => {
        if (
            selector.first &&
            selector.first.type === 'pseudo' &&
            selector.first.value === ':host' &&
            selector.first.nodes.length === 0 &&
            selector.nodes[1] &&
            selector.nodes[1].type === 'combinator' &&
            selector.nodes[1].value === ' '
        ) {
            selector.nodes[1].remove();
            selector.nodes[0].remove();
        }
        return selector;
    });
};
