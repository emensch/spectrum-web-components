#!/usr/bin/env node

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

import fg from 'fast-glob';
import { dirname, join, resolve } from 'path';
import chalk from 'chalk';
import { existsSync } from 'fs';
import { readFile, writeFile } from 'fs/promises';
import postcss from 'postcss';
import reporter from 'postcss-reporter';
import postcssCustomProperties from 'postcss-custom-properties';
import { fileURLToPath, pathToFileURL } from 'url';
import { oraPromise } from 'ora';
import columnify from 'columnify';
import { createRequire } from 'module';

import { postCSSPlugins } from './css-processing.cjs';
import postcssSpectrumPlugin from './process-spectrum-postcss-plugin.js';

const __dirname =
    process.env.PROJECT_CWD ||
    join(dirname(fileURLToPath(import.meta.url)), '../');
const require = createRequire(import.meta.url);
const componentRoot = resolve(__dirname, 'packages');
const verbose = process.env.verbose || false;

// Why dirname and package.json? If you resolve by a package name, the returned
// path will map to the file designated in "main" in the package.json.
// That isn't always (or even typically) at the root of the package.
const getPathByPkg = (pkgName) => {
    try {
        return dirname(require.resolve(`${pkgName}/package.json`));
    } catch (error) {
        throw new Error(`Could not find ${pkgName}`);
    }
};

async function fetchConfig(componentPath) {
    const configPath = join(componentPath, 'spectrum-config.js');
    const { default: spectrumConfig } = await import(
        pathToFileURL(configPath)
    ).catch((error) => Promise.reject(error));
    return Promise.resolve(spectrumConfig);
}

async function fetchCSS(componentName) {
    const inputCssPath = join(
        getPathByPkg(`@spectrum-css/${componentName}`),
        'dist/index-vars.css'
    );

    if (!existsSync(inputCssPath))
        Promise.reject(
            `!!! '${componentName}' does not have a local Spectrum CSS dependency !!!`
        );

    const inputCss = await readFile(inputCssPath);
    Promise.resolve({
        css: inputCss,
        path: inputCssPath,
    });
}

async function fetchCustomProperties(componentName) {
    let inputCustomProperties = await readFile(
        join(getPathByPkg(`@spectrum-css/${componentName}`), `/dist/vars.css`),
        'utf8'
    );

    if (!inputCustomProperties)
        Promise.reject(
            `${componentName} does not have a Spectrum CSS custom properties file.`
        );
    inputCustomProperties = inputCustomProperties.replace(
        /(.|\n)*\{/,
        ':root {'
    );

    Promise.resolve(inputCustomProperties);
}

async function foo(componentPath, component) {
    const outputCssPath = join(componentPath, `spectrum-${component.name}.css`);
    // const outputJsonPath = join(
    //     componentPath,
    //     `spectrum-vars.json`
    // );
    const outputCss = await postcss([
        ...postCSSPlugins(),
        postcssSpectrumPlugin({ component }),
        ...(verbose ? [reporter()] : []),
    ]).process(inputCss, {
        from: inputCssPath,
        to: outputCssPath,
    });
    // const srcPath = join(
    //     getPathByPkg(
    //         `@spectrum-css/${spectrumConfig.spectrum}`
    //     ),
    //     `/dist/vars.css`
    // );
    // let inputCustomProperties = await postcss([
    //     postcssCustomProperties({
    //         exportTo: [outputJsonPath],
    //     }),
    // ]).process(inputCss, {
    //     from: srcPath,
    // });

    let result = outputCss.css.replace(/\\/g, '\\\\');
    // await fs.writeFile(outputJsonPath, outputJson, { encoding: 'utf8' });
    await writeFile(outputCssPath, result, {
        encoding: 'utf8',
    });
}

async function processComponent(componentPath) {
    const spectrumConfig = await fetchConfig(componentPath).catch((error) => {
        return Promise.reject(error);
    });
    const { css: inputCss, path: inputCssPath } = await fetchCSS(
        spectrumConfig.name
    ).catch((error) => {
        return Promise.reject(error);
    });

    // {
    //     spinner: `💎  Processing ${spectrumConfig.spectrum}`,
    //     indent: 4,
    // }

    let inputCustomProperties = await fetchCustomProperties(
        spectrumConfig.name
    );

    return Promise.all(
        spectrumConfig.components.map(async (component) => {
            return oraPromise(
                async () => {
                    const outputCssPath = join(
                        componentPath,
                        `spectrum-${component.name}.css`
                    );
                    const outputJsonPath = join(
                        componentPath,
                        `spectrum-vars.json`
                    );
                    const outputCss = await postcss([
                        ...postCSSPlugins(),
                        postcssSpectrumPlugin({ component }),
                        ...(verbose ? [reporter()] : []),
                    ]).process(inputCss, {
                        from: inputCssPath,
                        to: outputCssPath,
                    });
                    const srcPath = join(
                        getPathByPkg(
                            `@spectrum-css/${spectrumConfig.spectrum}`
                        ),
                        `/dist/vars.css`
                    );
                    await postcss([
                        postcssCustomProperties({
                            exportTo: [outputJsonPath],
                        }),
                    ]).process(inputCustomProperties, {
                        from: srcPath,
                    });

                    let result = outputCss.css.replace(/\\/g, '\\\\');
                    // await fs.writeFile(outputJsonPath, outputJson, { encoding: 'utf8' });
                    await writeFile(outputCssPath, result, {
                        encoding: 'utf8',
                    });
                },
                {
                    text: component.name,
                    indent: 8,
                }
            );
        })
    );
}

const promises = [];
for (const configPath of await fg(
    `${componentRoot}/*/src/spectrum-config.js`
)) {
    promises.push(processComponent(join(configPath, '..')));
}

console.log();
await oraPromise(Promise.all(promises), {
    text: 'Processing Spectrum Components',
    spinner: 'simpleDots',
    successText: (results) => {
        return (
            chalk.underline('Spectrum Components processed') +
            '\n\n' +
            columnify(results) +
            '\n'
        );
    },
    failText: (message) => message || 'Spectrum Components processing failed',
});
