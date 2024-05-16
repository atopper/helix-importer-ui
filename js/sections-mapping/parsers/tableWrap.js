
export function tableWrapParser(el, window, props) {
  let { mapping, domClasses, domId, includeSelector } = props;
  if (!mapping) {
    return el;
  }
  if (mapping.includes(':')) {
    mapping = mapping.split(':')[1];
  }
  if (includeSelector && (domClasses || domId)) {
    mapping = `${mapping} (${domId} ${domClasses})`
      .replaceAll('undefined', '')
      .replaceAll('.', ' ');
  }
  const blockNameRow = [mapping];
  return WebImporter.DOMUtils.createTable([
    blockNameRow,
    [el],
  ], document);
}
