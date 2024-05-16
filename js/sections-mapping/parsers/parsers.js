
/**
 * exports parsers
 */

import { excludeParser } from './exclude.js';
import { tableWrapParser } from './tableWrap.js';
import { columnsParser } from './columns.js';
import { defaultContentParser } from './default-content.js';

export {
  excludeParser as exclude,
  columnsParser as columns,
  defaultContentParser as defaultContent,
  tableWrapParser as tableWrap,
};
