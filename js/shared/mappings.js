/**
 * Retrieve the Mapping for the provided URL from the local-storage.  A mapping is an array with
 * objects that contain the attributes of the 'box' including:
 * - xpath
 * - boxId
 * - numCols
 * - numRows
 * - mapping (block name)
 * @param url The current URL
 * @returns {mapping|undefined} Return the mapping as an array (not string) or 'undefined' if it
 *                              doesn't exist for the provided URL.
 */
function getImporterSectionMapping(url) {
  // look for existing mapping data
  try {
    const allMappings = JSON.parse(localStorage.getItem('helix-importer-sections-mapping'));
    if (allMappings) {
      if (Array.isArray(allMappings)) {
        const urlMapping = allMappings.find((sm) => sm.url === url);
        if (urlMapping) {
          return urlMapping.mapping;
        }
      } else if (allMappings.url && allMappings.url === url) {
        // Handle the old way (single url saved)
        return allMappings.mapping;
      }
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(`Error loading sections mapping data for url ${url}`, e);
  }

  return undefined;
}

/**
 * Write (or overwrite) the Mapping for the provided (base?) URL to the local-storage while
 * maintaining the mappings for other URLs.
 * @param url The current URL
 * @param mapping the mapping to store (component id to block name)
 * @returns void
 */
function saveImporterSectionMapping(url, mapping) {
  try {
    let allMappings = JSON.parse(localStorage.getItem('helix-importer-sections-mapping'));
    if (allMappings && Array.isArray(allMappings)) {
      const index = allMappings.findIndex((sm) => sm.url === url);
      if (index >= 0) {
        if (mapping.length === 0) {
          allMappings.splice(index, 1);
        } else {
          allMappings[index].mapping = mapping;
        }
      } else {
        allMappings.push({
          url,
          mapping,
        });
      }
    } else {
      // Local-Storage was empty or contained the old one-url way, just write the whole thing.
      allMappings = [{
        url,
        mapping,
      }];
    }

    // save mapping data
    localStorage.setItem('helix-importer-sections-mapping', JSON.stringify(allMappings));
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(`Error saving sections mapping data for url ${url}`, e);
  }
}

export {
  // eslint-disable-next-line import/prefer-default-export
  getImporterSectionMapping,
  saveImporterSectionMapping,
};
