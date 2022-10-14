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

import postcss from 'postcss';
import parser from 'postcss-selector-parser';

import { comments } from './postcss-comments-plugin.js';
import { complexSelectors } from './postcss-complex-selectors-plugin.js';
import { convertSelector } from './postcss-convert-selector-plugin.js';
import { converterAttribute } from './postcss-converter-attribute.js';
import { converterClass } from './postcss-converter-class.js';
import { converterPseudo } from './postcss-converter-pseudo.js';
import { converterId } from './postcss-converter-id.js';
import { converterSlotted } from './postcss-converter-slotted.js';
import { dehostify } from './postcss-dehostify-plugin.js';
import { hoistDir } from './postcss-hoist-dir-plugin.js';
import { hostify } from './postcss-hostify-plugin.js';
import { whereifyHost } from './postcss-whereify-host-plugin.js';

/**
 * Baseline To do:
 * - warn complex host
 * - custom property hoisting
 * - classes to descendent attributes? e.g. ".spectrum-Dialog .spectrum-Button--accent" -> "[variant='accent']"
 *
 * Extended To Do:
 * - split selectors
 * - inside/outside processing
 * - add nuance to slot conversion
 */

const transform = (component) => (selectors) => {
    const hostSelector = (
        typeof component.host === 'string'
            ? component.host
            : component.host.selector
    ).replace('.', '');
    hostify(hostSelector)(selectors);
    hoistDir(selectors);
    convertSelector(component, converterAttribute)(selectors); // converter
    convertSelector(component, converterClass)(selectors);
    convertSelector(component, converterSlotted)(selectors);
    convertSelector(component, converterId)(selectors);
    convertSelector(
        {
            ...component,
            pseudos: [
                {
                    selector: '.focus-ring',
                    value: ':focus-visible',
                },
            ],
        },
        converterPseudo
    )(selectors);
    whereifyHost(hostSelector)(selectors);
    dehostify(selectors);
};

const plugin = (opts) => {
    const { component } = opts;
    return (root, result) => {
        comments(root);
        root.walkRules((node) => {
            if (
                node.selector === '.spectrum' ||
                node.selector === '.spectrum--express'
            ) {
                node.remove();
                return;
            }
            if (component.excludeSourceSelector) {
                if (
                    component.excludeSourceSelector.some((regex) =>
                        regex.test(node.selector)
                    )
                ) {
                    node.remove();
                    return;
                }
            }
            if (component.exclude) {
                if (
                    component.exclude.some((regex) => regex.test(node.selector))
                ) {
                    node.remove();
                    return;
                }
            }
            node.prepend(postcss.comment({ text: node.selector }));
            complexSelectors(component.complexSelectors, node);
            const processor = parser(transform(component));
            const selector = processor.processSync(node.selector);
            node.selector = selector;
        });
    };
};

plugin.postcss = true;

export default plugin;
