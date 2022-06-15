/*
 * Copyright 2022 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */
/* global ExcelJS */
import { initOptionFields, attachOptionFieldsListeners } from '../shared/fields.js';
import { loadURLsFromRobots } from '../shared/sitemap.js';

const PARENT_SELECTOR = '.crawl';
const CONFIG_PARENT_SELECTOR = `${PARENT_SELECTOR} form`;

const URLS_INPUT = document.getElementById('crawl-url');
const CRAWL_BUTTON = document.getElementById('crawl-docrawl-button');
const GETURLSFROMROBOTS_BUTTON = document.getElementById('crawl-getfromrobot-button');
const PROCESS_BUTTONS = document.querySelectorAll('#crawl-getfromrobot-button, #crawl-docrawl-button');

const CRAWL_REPORT_BUTTON = document.getElementById('crawl-downloadCrawlReport');
const CRAWL_CONTAINER = document.querySelector(`${PARENT_SELECTOR} .page-preview`);
const CRAWLED_URLS_HEADING = document.querySelector('#crawl-result h2');
const CRAWLED_URLS_LIST = document.querySelector('#crawl-result ul');

const IGNORED_EXTENSIONS = [
  'css',
  'js',
  'png',
  'jpg',
  'jpeg',
  'webp',
  'eps',
  'pdf',
];

const config = {};

const crawlStatus = {
  crawled: 0,
  rows: [],
};

const displayCrawledURL = (url) => {
  const u = new URL(url);
  const li = document.createElement('li');
  const link = document.createElement('sp-link');
  link.setAttribute('size', 'm');
  link.setAttribute('target', '_blank');
  link.setAttribute('href', url);
  link.innerHTML = u.pathname;
  li.append(link);

  CRAWLED_URLS_LIST.append(li);

  CRAWLED_URLS_HEADING.innerText = `Crawled URLs (${crawlStatus.crawled}):`;
};

const disableProcessButtons = () => {
  PROCESS_BUTTONS.forEach((button) => {
    button.disabled = true;
  });
};

const enableProcessButtons = () => {
  PROCESS_BUTTONS.forEach((button) => {
    button.disabled = false;
  });
};

const getProxyURLSetup = (url, origin) => {
  const u = new URL(url);
  if (!u.searchParams.get('host')) {
    u.searchParams.append('host', u.origin);
  }
  const src = `${origin}${u.pathname}${u.search}`;
  return {
    remote: {
      url,
      origin: u.origin,
    },
    proxy: {
      url: src,
      origin,
    },
  };
};

const getContentFrame = () => document.querySelector(`${PARENT_SELECTOR} iframe`);

const attachListeners = () => {
  attachOptionFieldsListeners(config.fields, PARENT_SELECTOR);

  CRAWL_BUTTON.addEventListener('click', (async () => {
    if (config.fields['crawl-show-preview']) {
      CRAWL_CONTAINER.classList.remove('hidden');
    } else {
      CRAWL_CONTAINER.classList.add('hidden');
    }
    disableProcessButtons();

    CRAWL_REPORT_BUTTON.classList.remove('hidden');

    crawlStatus.crawled = 0;
    crawlStatus.rows = [];
    crawlStatus.urls = [];

    const urlsArray = [URLS_INPUT.value];
    const processNext = () => {
      if (urlsArray.length > 0) {
        const url = urlsArray.pop();
        const { proxy } = getProxyURLSetup(url, config.origin);
        const src = proxy.url;

        const frame = document.createElement('iframe');
        frame.id = 'crawl-content-frame';

        if (config.fields['crawl-enable-js']) {
          frame.removeAttribute('sandbox');
        } else {
          frame.setAttribute('sandbox', 'allow-same-origin');
        }

        const onLoad = async () => {
          window.setTimeout(async () => {
            const current = frame.dataset.originalURL;
            const originalURL = new URL(current);
            const replacedURL = new URL(frame.dataset.replacedURL);

            try {
              const links = frame.contentDocument.querySelectorAll('a') || [];
              let nbLinks = 0;
              let nbLinksExternalHost = 0;
              let nbLinksAlreadyProcessed = 0;
              const linksToFollow = [];
              links.forEach((a) => {
                nbLinks += 1;
                if (a.href) {
                  const u = new URL(a.href);
                  if (u.host === originalURL.host || u.host === replacedURL.host) {
                    u.searchParams.delete('host');
                    const found = `${originalURL.origin}${u.pathname}${u.search}`;
                    const extension = u.pathname.split('.').pop();
                    if (IGNORED_EXTENSIONS.indexOf(extension) === -1) {
                      // eslint-disable-next-line max-len
                      if (!crawlStatus.urls.includes(found) && !urlsArray.includes(found) && current !== found) {
                        urlsArray.push(found);
                        linksToFollow.push(found);
                      } else {
                        nbLinksAlreadyProcessed += 1;
                      }
                    }
                  } else {
                    nbLinksExternalHost += 1;
                  }
                }
              });

              crawlStatus.urls.push(current);
              const row = {
                url: current,
                status: 'Success',
                nbLinks,
                nbLinksAlreadyProcessed,
                nbLinksExternalHost,
                nbLinksToFollow: linksToFollow.length,
                linksToFollow,
              };
              crawlStatus.rows.push(row);
              crawlStatus.crawled += 1;

              displayCrawledURL(current);
            } catch (error) {
              // try to detect redirects
              const res = await fetch(replacedURL);
              if (res.ok) {
                if (res.redirected) {
                  // eslint-disable-next-line no-console
                  console.error(`Cannot crawl ${originalURL} - redirected to ${res.url}`, error);
                  crawlStatus.rows.push({
                    url: originalURL,
                    status: 'Redirect',
                    redirect: res.url,
                  });
                } else {
                  // eslint-disable-next-line no-console
                  console.error(`Cannot crawl ${originalURL} - probably a code error on ${res.url}`, error);
                  crawlStatus.rows.push({
                    url: originalURL,
                    status: `Code error: ${res.status}`,
                  });
                }
              } else {
                // eslint-disable-next-line no-console
                console.error(`Cannot crawl ${originalURL} - page may not exist (status ${res.status})`, error);
                crawlStatus.rows.push({
                  url: originalURL,
                  status: `Invalid: ${res.status}`,
                });
              }
            }

            const event = new Event('crawling-complete');
            frame.dispatchEvent(event);
          }, config.pageLoadTimeout || 1);
        };

        frame.addEventListener('load', onLoad);
        frame.addEventListener('crawling-complete', processNext);

        // eslint-disable-next-line no-console
        console.log(`Loading frame with page ${url}`);
        frame.dataset.originalURL = url;
        frame.dataset.replacedURL = src;
        frame.src = src;

        const current = getContentFrame();
        current.removeEventListener('load', onLoad);
        current.removeEventListener('crawling-complete', processNext);

        current.replaceWith(frame);
      } else {
        const frame = getContentFrame();
        frame.removeEventListener('crawling-complete', processNext);
        CRAWL_REPORT_BUTTON.classList.remove('hidden');
        enableProcessButtons();
      }
    };
    processNext();
  }));

  CRAWL_REPORT_BUTTON.addEventListener('click', (async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sheet 1');
    worksheet.addRows([
      ['URL', 'status', 'redirect', 'Nb links on page', 'Nb links already processed', 'Nb links on external host', 'Nb links to follow', 'Links to follow'],
    ].concat(crawlStatus.rows.map(({
      // eslint-disable-next-line max-len
      url,
      status,
      redirect,
      nbLinks,
      nbLinksAlreadyProcessed,
      nbLinksExternalHost,
      nbLinksToFollow,
      linksToFollow,
    }) => [
      url, status, redirect || '', nbLinks || '', nbLinksAlreadyProcessed || '', nbLinksExternalHost || '', nbLinksToFollow || '', linksToFollow ? linksToFollow.join(', ') : '',
    ])));
    const buffer = await workbook.xlsx.writeBuffer();
    const a = document.createElement('a');
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    a.setAttribute('href', URL.createObjectURL(blob));
    a.setAttribute('download', 'crawl_report.xlsx');
    a.click();
  }));

  GETURLSFROMROBOTS_BUTTON.addEventListener('click', (async () => {
    // eslint-disable-next-line no-alert
    const urls = await loadURLsFromRobots(config.origin, URLS_INPUT.value);
    if (urls === 0) {
      // eslint-disable-next-line no-alert
      alert(`No urls found. robots.txt or sitemap might not exist on ${config.origin}`);
    } else {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Sheet 1');
      worksheet.addRows([
        ['URL'],
      ].concat(urls.map((u) => [u])));
      const buffer = await workbook.xlsx.writeBuffer();
      const a = document.createElement('a');
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      a.setAttribute('href', URL.createObjectURL(blob));
      a.setAttribute('download', 'urls.xlsx');
      a.click();
    }
  }));
};

const init = () => {
  config.origin = window.location.origin;
  config.fields = initOptionFields(CONFIG_PARENT_SELECTOR);

  attachListeners();
};

init();
