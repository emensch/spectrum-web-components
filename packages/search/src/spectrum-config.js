/*
Copyright 2020 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

const config = {
    spectrum: 'search',
    package: 'search',
    components: [
        {
            name: 'search',
            host: {
                selector: '.spectrum-Search',
                shadowSelector: '#textfield',
            },
            focus: '.input',
            attributes: [
                {
                    type: 'boolean',
                    selector: '.spectrum-Search--quiet',
                    name: 'quiet',
                },
            ],
            ids: [
                {
                    selector: '.spectrum-Search-clearButton',
                    name: 'button',
                },
                {
                    selector: '.spectrum-Search-textfield',
                    name: 'textfield',
                },
            ],
            classes: [
                {
                    selector: '.spectrum-Search-input',
                    name: 'input',
                },
                {
                    selector: '.spectrum-Icon',
                    name: 'icon',
                },
                {
                    selector: '.spectrum-Search-icon',
                    name: 'icon',
                },
            ],
        },
    ],
};

export default config;
