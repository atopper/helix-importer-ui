
function getXPath(elm, document, withDetails = false) {
  var allNodes = document.getElementsByTagName('*');
  for (var segs = []; elm && elm.nodeType == 1; elm = elm.parentNode) {
    if (withDetails) {
      if (elm.hasAttribute('id')) {
        var uniqueIdCount = 0;
        for (var n=0;n < allNodes.length;n++) {
          if (allNodes[n].hasAttribute('id') && allNodes[n].id == elm.id) uniqueIdCount++;
          if (uniqueIdCount > 1) break;
        };
        if ( uniqueIdCount == 1) {
          segs.unshift('id("' + elm.getAttribute('id') + '")');
          return segs.join('/');
        } else {
          segs.unshift(elm.localName.toLowerCase() + '[@id="' + elm.getAttribute('id') + '"]');
        }
      } else if (elm.hasAttribute('class')) {
        segs.unshift(elm.localName.toLowerCase() + '[@class="' + [...elm.classList].join(" ").trim() + '"]');
      }
    } else {
      for (var i = 1, sib = elm.previousSibling; sib; sib = sib.previousSibling) {
        if (sib.localName == elm.localName) {
          i += 1;
        }
      }
      segs.unshift(elm.localName.toLowerCase() + '[' + i + ']');

    }
  }
  return segs.length ? '/' + segs.join('/') : null;
}

// courtesy of https://github.com/adobecom/aem-milo-migrations/blob/main/tools/importer/parsers/utils.js
function getNSiblingsDivs(el, document, n = null) {
  let cmpFn = n;

  if (!isNaN(n)) {
    cmpFn = (c) => c === n;
  }

  let selectedXpathPattern = '';
  const xpathGrouping = [];

  el.querySelectorAll('*').forEach(d => {
    const xpath = getXPath(d, document);
    const xp = xpath.substring(0, xpath.lastIndexOf('['));
    if (!xpathGrouping[xp]) {
      xpathGrouping[xp] = [d];
    } else {
      xpathGrouping[xp].push(d);
    }
  });

  // find the xpath pattern that has n elements
  for (let key in xpathGrouping) {
    if (cmpFn(xpathGrouping[key].length)) {
      selectedXpathPattern = key;
      break;
    }
  }

  if (!xpathGrouping[selectedXpathPattern]) {
    if (cmpFn(el.children.length)) {
      return Array.from(el.children);
    }
  }

  return xpathGrouping[selectedXpathPattern] || null;
}

export function columnsParser(el, window, props) {
  const { layout, includeSelector } = props;
  const { numCols = 0, numRows = 1 } = layout;
  const { document } = window;

  el.querySelectorAll('script, style').forEach((e) => e.remove() );
  el.querySelectorAll('div').forEach((e) => {
    if (!e.querySelector('img, svg, iframe') && e.textContent.replaceAll('\n','').trim().length === 0) {
      e.remove();
    }
  });

  el.querySelectorAll('div').forEach(d => {
    console.log(getXPath(d, document, true));
    console.log(d.getBoundingClientRect());
    if (d.dataset.hlxImpRect) {
      console.log(d.dataset.hlxImpRect);
      console.log(JSON.parse(d.dataset.hlxImpRect));
    }
  });

  let columns = getNSiblingsDivs(el, document, (n) => n >= numCols);
  if (numRows > 1 && columns?.length === numCols * numRows) {
    const newColumns = [];
    for (let i = 0; i < columns.length; i += numRows) {
      newColumns.push(columns.slice(i, i + numRows));
    }
    columns = newColumns;
  }

  let blockRow = ['columns'];
  if (includeSelector && props.domClasses && props.domClasses.length > 0) {
    blockRow = [`columns (${props.domClasses.replaceAll('.', ' ')})`];
  }

  if (columns) {
    const block = WebImporter.DOMUtils.createTable([
      blockRow,
      columns,
    ], document);
    // el.replaceWith(block);
    return block;
  }
}
