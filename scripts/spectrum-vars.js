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

import { dirname, join, resolve } from 'path';
import { readFile, writeFile } from 'fs/promises';
import postcss from 'postcss';
import { postCSSPlugins } from './css-processing.cjs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { oraPromise } from 'ora';
import chalk from 'chalk';
import columnify from 'columnify';

const require = createRequire(import.meta.url);
const __dirname =
    process.env.PROJECT_CWD ||
    join(dirname(fileURLToPath(import.meta.url)), '../');

// Why dirname and package.json? If you resolve by a package name, the returned
// path will map to the file designated in "main" in the package.json.
// That isn't always (or even typically) at the root of the package.
const getPathByPkg = (pkgName) =>
    dirname(require.resolve(`${pkgName}/package.json`));

const printPath = (path, dir = 'packages/styles/') =>
    path.replace(join(__dirname, dir), '');

const spectrumPaths = new Map([
    [getPathByPkg('@spectrum-css/vars'), 'styles'],
    [getPathByPkg('@spectrum-css/expressvars'), 'styles/express'],
]);

// sources to use from spectrum-css
const themes = [
    'lightest',
    'light',
    'dark',
    'darkest',
    /*'middark', 'midlight'*/
];
const scales = ['medium', 'large'];
const cores = ['global'];
const processes = [];

async function processCSSData(data, identifier, from) {
    /* lit-html is a JS litteral, so `\` escapes by default.
     * for there to be unicode characters, the escape must
     * escape itself...
     */
    let result = data.replace(/\\/g, '\\\\');

    // possible selectors to replace
    const selector1 =
        identifier == ':root ' ? identifier : `.spectrum--${identifier}`;
    // The trailing space differentiates between `.spectrum:lang()` and `.spectrum {}`.
    const selector2 = '.spectrum ';

    // new selector values
    const shadowSelector = ':root,\n:host';

    if (data.indexOf(selector1) >= 0) {
        result = result.replace(selector1, shadowSelector);
    } else if (data.indexOf(selector2) >= 0) {
        result = result.replace(/\.spectrum /g, shadowSelector);
        result = result.replace(
            `.spectrum--medium,
.spectrum--large`,
            shadowSelector
        );
        result = result.replace(
            `.spectrum--darkest,
.spectrum--dark,
.spectrum--light,
.spectrum--lightest`,
            shadowSelector
        );
    }

    result = await postcss(postCSSPlugins())
        .process(result, {
            from,
        })
        .then((output) => output.css);

    result = result.replace(selector2, shadowSelector);
    return result;
}

async function processCSS(srcPath, dstPath, identifier, from) {
    const data = await readFile(srcPath, 'utf8');
    let result = await processCSSData(data, identifier, from);
    await writeFile(dstPath, result, 'utf8');
    return {
        from: [srcPath],
        to: dstPath,
    };
}

// For fonts.css we need to combine 2 source files into 1
async function processMultiSourceCSS(srcPaths, dstPath, identifier) {
    return Promise.all(
        srcPaths.map(async (srcPath) => {
            let data = await readFile(srcPath, 'utf8');
            return processCSSData(data, identifier);
        })
    )
        .then(async (results) => {
            await writeFile(dstPath, results.join(''), 'utf8');
            return {
                from: srcPaths,
                to: dstPath,
            };
        })
        .catch((error) => {
            throw new Error(error);
        });
}

for (const [spectrumPath, packageDir] of spectrumPaths.entries()) {
    const dest = join(__dirname, 'packages', packageDir);
    for (const theme of themes) {
        if (
            spectrumPath.includes('expressvars') &&
            ['lightest', 'darkest'].includes(theme)
        )
            continue;

        const from = join(spectrumPath, `dist/spectrum-${theme}.css`);
        const to = join(dest, `theme-${theme}.css`);
        processes.push(processCSS(from, to, theme));
    }

    for (const scale of scales) {
        const srcPath = join(spectrumPath, `dist/spectrum-${scale}.css`);
        const dstPath = join(dest, `spectrum-scale-${scale}.css`);
        processes.push(processCSS(srcPath, dstPath, scale));
    }

    for (const core of cores) {
        const srcPath = join(spectrumPath, `dist/spectrum-${core}.css`);
        const dstPath = join(dest, `core-${core}.css`);
        processes.push(processCSS(srcPath, dstPath, core));
    }
}

// Typography
const typographyPath = dirname(
    require.resolve('@spectrum-css/typography/package.json')
);

// Typography scope
{
    const srcPath = join(typographyPath, 'dist/index-vars.css');
    const dstPath = resolve(join(__dirname, 'packages/styles/typography.css'));

    // typography.css
    // console.log(`processing typography`);
    processes.push(processCSS(srcPath, dstPath, 'typography'));
}

// Fonts scope
{
    const srcPath = join(typographyPath, 'font.css');
    const dstPath = resolve(join(__dirname, 'packages/styles/fonts.css'));
    // console.log(`processing fonts from commons & typography`);
    processes.push(processMultiSourceCSS([srcPath], dstPath, ':root '));
}

console.log();
await oraPromise(Promise.all(processes), {
    text: 'Processing Spectrum CSS',
    spinner: 'simpleDots',
    successText: (results) => {
        return (
            chalk.underline('Spectrum CSS processed') +
            '\n\n' +
            columnify(results, {
                config: {
                    from: {
                        dataTransform: (data) => {
                            return printPath(data, 'node_modules/');
                        },
                    },
                    to: {
                        dataTransform: (data) => {
                            return printPath(data, '');
                        },
                    },
                },
            }) +
            '\n'
        );
    },
    failText: 'Spectrum CSS processing failed',
});
