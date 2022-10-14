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
import { conversionTypes } from './postcss-convert-selector-plugin.js';

export const converterId = (node, component) => {
    const {
        ids: conversions = [],
        host: { selector: hostSelector },
    } = component;
    let newNode = node.clone();
    conversions.forEach((conversion) => {
        if (typeof conversion === 'string') {
            const value = conversion.slice(1);
            if (node.type === 'class' && node.value === value) {
                const value = conversion.replace(`${hostSelector}-`, '');
                newNode = parser.id({ value });
            }
        } else {
            const conversionType = conversionTypes[conversion.selector[0]];
            const value =
                conversionType === 'pseudo'
                    ? conversion.selector
                    : conversion.selector.slice(1);
            if (node.type === conversionType && node.value === value) {
                const value =
                    conversion.name ||
                    conversion.selector.replace(`${hostSelector}--`, '');
                newNode = parser.id({ value });
            }
        }
    });
    return newNode;
};
