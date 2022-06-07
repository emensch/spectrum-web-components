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

import { closeSync, existsSync, openSync, writeSync } from 'fs';
import { basename, dirname, extname, join } from 'path';
import { readdir, readFile } from 'fs/promises';
import chalk from 'chalk';
import { createRequire } from 'module';

import { oraPromise } from 'ora';

const require = createRequire(import.meta.url);
const rootDir = process.env.PROJECT_CWD || process.cwd();
const packageName = '@spectrum-css/icon';
const verbose = process.env.verbose || false;

async function processIcon(srcPath) {
    return readFile(srcPath, 'utf8').then(async (content) => {
        // regex will extract width, height and svg content into $1, $2 and $3 respectively
        const [, viewBox, svgContent] = content.match(
            /<svg.*viewBox="(.*)">(.*?)<\/svg>/i
        );
        // no matching result, bail
        if (!svgContent) return;

        const shortName = basename(srcPath, extname(srcPath));
        // append the content to the target file handle
        return `<symbol id="spectrum-icon-${shortName}" viewBox="${viewBox}">${svgContent}</symbol>`;
    });
}

async function wrapIcon(icon) {
    const licensePath = join(rootDir, 'config/license.js');
    let license;
    if (existsSync(licensePath)) {
        license = await readFile(licensePath, 'utf8');
        license = license?.replace('<%= YEAR %>', new Date().getFullYear());
    }

    if (Array.isArray(icon)) icon = icon.join('');
    return `${license}
import { svg } from '@spectrum-web-components/base';
export default svg\`<svg xmlns="http://www.w3.org/2000/svg">${icon}</svg>\`;`;
}

async function combineIconsByScale(scale) {
    // Fetch spectrum-css path
    const spectrumIconsPath = dirname(
        require.resolve(`${packageName}/package.json`)
    );

    const srcPath = join(spectrumIconsPath, scale);
    const files = await readdir(srcPath);
    return Promise.all(
        files.map((file) => {
            if (verbose)
                return oraPromise(processIcon(join(srcPath, file)), {
                    text: `${file}`,
                    indent: 2,
                    interval: 10,
                });
            return processIcon(join(srcPath, file));
        })
    );
}

// process the scales
for (const scale of ['medium', 'large']) {
    const combinedIconPath = join(
        rootDir,
        `packages/icons/src/icons-${scale}.svg.ts`
    );

    const fd = openSync(combinedIconPath, 'w');

    const results = await oraPromise(combineIconsByScale(scale), {
        text: `Processing icons from ${chalk.dim(
            packageName
        )} ${chalk.cyanBright(scale)}`,
        spinner: 'simpleDots',
        interval: 10,
        successText: `${chalk.dim(packageName)} ${chalk.cyanBright(
            scale
        )} @${chalk.greenBright(combinedIconPath.replace(rootDir, ''))}`,
        failText: `Failed to process icons from ${chalk.yellowBright(
            packageName
        )} ${chalk.cyanBright(scale)}`,
    });

    writeSync(fd, await wrapIcon(results));

    closeSync(fd);
}
