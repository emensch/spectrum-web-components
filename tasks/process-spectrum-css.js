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

import chalk from 'chalk';
import fg from 'fast-glob';
import fs from 'fs-extra';
import path from 'path';
import postcss from 'postcss';
import reporter from 'postcss-reporter';
import { fileURLToPath, pathToFileURL } from 'url';

import { postCSSPlugins } from '../scripts/css-processing.cjs';
import postcssSpectrumPlugin from './plugins/postcss-spectrum-plugin.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const componentRoot = path.resolve(__dirname, '../');
const componentPath = componentRoot;

async function processComponent(
    component,
    packageName,
    inputCssPath,
    inputCss
) {
    // eslint-disable-next-line no-console
    console.log(chalk.green(`   Processing SWC component: ${component.name}`));
    const outputCssPath = path.join(
        componentPath,
        'packages',
        packageName,
        'src',
        `spectrum-${component.name}.css`
    );
    const outputCss = await postcss([
        postcssSpectrumPlugin({ component }),
        ...postCSSPlugins(),
        reporter(),
    ]).process(inputCss, {
        from: inputCssPath,
        to: outputCssPath,
    });

    let result = outputCss.css.replace(/\\/g, '\\\\');
    return fs.writeFile(outputCssPath, result, {
        encoding: 'utf8',
    });
}

async function processComponentConfig(config) {
    const component = config.spectrum;
    const inputCssPath = `node_modules/@spectrum-css/${component}/dist/index-vars.css`;
    let packageCss = false;
    if (fs.existsSync(inputCssPath)) {
        packageCss = true;
    } else {
        console.error(
            chalk.bold.red(
                `!!! '${component}' does not have a local Spectrum CSS dependency !!!`
            )
        );
        return;
    }
    // eslint-disable-next-line no-console
    console.log(
        chalk.green(`   Processing Spectrum CSS component: ${component}`)
    );
    const inputCss = await fs.readFile(inputCssPath);
    await Promise.all(
        config.components.map((component) =>
            processComponent(component, config.package, inputCssPath, inputCss)
        )
    );
}

async function processComponentConfigs(configs) {
    // eslint-disable-next-line no-console
    console.log(chalk.green('   Processing component configs...'));
    await Promise.all(configs.map((config) => processComponentConfig(config)));
    // eslint-disable-next-line no-console
    console.log(chalk.bold.green('✅ Component configs processed.'));
}

async function gatherComponentsConfigs() {
    const configs = [];
    // eslint-disable-next-line no-console
    console.log(chalk.bold.green('🔍 Gathering component configs...'));
    for (const configPath of await fg(
        `${componentRoot}/**/spectrum-config.js`
    )) {
        const { default: config } = await import(pathToFileURL(configPath));
        if (Array.isArray(config)) {
            configs.push(...config);
        } else {
            configs.push(config);
        }
    }
    const foundComponents = configs.map((config) => config.spectrum).join(', ');
    if (foundComponents) {
        console.log(chalk.green(`   Found configs for: ${foundComponents}.`));
    } else {
        console.log(chalk.bold.red(`No component configs found.`));
        process.exit(1);
    }
    return configs;
}

async function main() {
    // eslint-disable-next-line no-console
    console.log(chalk.bold.green('🏁 Begin processing Spectrum CSS.'));
    const components = await gatherComponentsConfigs();
    await processComponentConfigs(components);
    process.exit(0);
}

main();
