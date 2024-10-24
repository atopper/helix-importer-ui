import alert from './alert.js';

/**
 * Read a URL file paired with the JS file. If any lines contain a valid URL, add them to the
 * URL(s) field.
 * @param importJsUrl
 * @param isBulk
 * @param randomize
 * @returns {Promise<void>}
 */
const setURLFromFile = async (importJsUrl, isBulk, randomize) => {
  if (!importJsUrl || !importJsUrl.endsWith('.js')) {
    alert.error('No valid transition file URL set.');
    return;
  }
  const urlsField = document.getElementById(isBulk ? 'import-urls' : 'import-url');
  const urlFile = importJsUrl.replace('.js', '.txt');
  const response = await fetch(urlFile);
  if (!response.ok) {
    alert.error(`Failed to read the URL file: ${urlFile}`);
    return;
  }

  const urls = await response.text();
  const urlsArray = urls.split('\n')
    .map((nextUrl) => nextUrl.trim())
    .filter((url) => {
      try {
        // eslint-disable-next-line no-new
        new URL(url);
      } catch (error) {
        return false;
      }
      return true;
    });

  if (urlsArray.length === 0) {
    alert.error(`No valid URLs found in the URL file: ${urlFile}`);
    return;
  }

  if (!isBulk) {
    let index = 0;
    if (randomize) {
      index = Math.floor(Math.random() * urlsArray.length - 0.01);
    }
    // eslint-disable-next-line prefer-destructuring
    urlsField.value = urlsArray[index];
  } else {
    urlsField.value = urlsArray.join('\n');
  }
  urlsField.dispatchEvent(new Event('change'));
};

export {
  // eslint-disable-next-line import/prefer-default-export
  setURLFromFile,
};
