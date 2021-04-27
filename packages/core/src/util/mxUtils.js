/**
 * Copyright (c) 2006-2015, JGraph Ltd
 * Copyright (c) 2006-2015, Gaudenz Alder
 * Updated to ES9 syntax by David Morrissey 2021
 * Type definitions from the typed-mxgraph project
 */
import mxClient from '../mxClient';
import mxConstants from './mxConstants';
import mxPoint from './datatypes/mxPoint';
import mxDictionary from './datatypes/mxDictionary';
import mxCellPath from '../view/cell/mxCellPath';
import mxRectangle from './datatypes/mxRectangle';
import { htmlEntities, trim } from './mxStringUtils';
import { getOuterHtml, getTextContent } from './mxDomUtils';

/**
 * Class: mxUtils
 *
 * A singleton class that provides cross-browser helper methods.
 * This is a global functionality. To access the functions in this
 * class, use the global classname appended by the functionname.
 * You may have to load chrome://global/content/contentAreaUtils.js
 * to disable certain security restrictions in Mozilla for the <open>,
 * <save>, <saveAs> and <copy> function.
 *
 * For example, the following code displays an error message:
 *
 * (code)
 * mxUtils.error('Browser is not supported!', 200, false);
 * (end)
 */
const mxUtils = {
  /* Variable: errorResource
   *
   * Specifies the resource key for the title of the error window. If the
   * resource for this key does not exist then the value is used as
   * the title. Default is 'error'.
   */
  errorResource: 'error',

  /**
   * Variable: closeResource
   *
   * Specifies the resource key for the label of the close button. If the
   * resource for this key does not exist then the value is used as
   * the label. Default is 'close'.
   */
  closeResource: 'close',

  /**
   * Variable: errorImage
   *
   * Defines the image used for error dialogs.
   */
  errorImage: '/error.gif', // mxClient.imageBasePath + '/error.gif',

  /**
   * Function: removeCursors
   *
   * Removes the cursors from the style of the given DOM node and its
   * descendants.
   *
   * Parameters:
   *
   * element - DOM node to remove the cursor style from.
   */
  removeCursors: element => {
    if (element.style != null) {
      element.style.cursor = '';
    }

    const children = element.childNodes;

    if (children != null) {
      const childCount = children.length;

      for (let i = 0; i < childCount; i += 1) {
        mxUtils.removeCursors(children[i]);
      }
    }
  },

  /**
   * Function: getCurrentStyle
   *
   * Returns the current style of the specified element.
   *
   * Parameters:
   *
   * element - DOM node whose current style should be returned.
   */
  getCurrentStyle: element => {
    return element != null ? window.getComputedStyle(element, '') : null;
  },

  /**
   * Function: parseCssNumber
   *
   * Parses the given CSS numeric value adding handling for the values thin,
   * medium and thick (2, 4 and 6).
   */
  parseCssNumber: value => {
    if (value === 'thin') {
      value = '2';
    } else if (value === 'medium') {
      value = '4';
    } else if (value === 'thick') {
      value = '6';
    }

    value = parseFloat(value);

    if (isNaN(value)) {
      value = 0;
    }

    return value;
  },

  /**
   * Function: setPrefixedStyle
   *
   * Adds the given style with the standard name and an optional vendor prefix for the current
   * browser.
   *
   * (code)
   * mxUtils.setPrefixedStyle(node.style, 'transformOrigin', '0% 0%');
   * (end)
   */
  setPrefixedStyle: (style, name, value) => {
    let prefix = null;

    if (mxClient.IS_SF || mxClient.IS_GC) {
      prefix = 'Webkit';
    } else if (mxClient.IS_MT) {
      prefix = 'Moz';
    }

    style[name] = value;

    if (prefix != null && name.length > 0) {
      name = prefix + name.substring(0, 1).toUpperCase() + name.substring(1);
      style[name] = value;
    }
  },

  /**
   * Function: hasScrollbars
   *
   * Returns true if the overflow CSS property of the given node is either
   * scroll or auto.
   *
   * Parameters:
   *
   * node - DOM node whose style should be checked for scrollbars.
   */
  hasScrollbars: node => {
    const style = mxUtils.getCurrentStyle(node);

    return (
      style != null &&
      (style.overflow === 'scroll' || style.overflow === 'auto')
    );
  },

  /**
   * Function: findNode
   *
   * Returns the first node where attr equals value.
   * This implementation does not use XPath.
   */
  findNode: (node, attr, value) => {
    if (node.nodeType === mxConstants.NODETYPE_ELEMENT) {
      const tmp = node.getAttribute(attr);
      if (tmp != null && tmp == value) {
        return node;
      }
    }

    node = node.firstChild;

    while (node != null) {
      const result = mxUtils.findNode(node, attr, value);
      if (result != null) {
        return result;
      }
      node = node.nextSibling;
    }
    return null;
  },

  /**
   * Function: remove
   *
   * Removes all occurrences of the given object in the given array or
   * object. If there are multiple occurrences of the object, be they
   * associative or as an array entry, all occurrences are removed from
   * the array or deleted from the object. By removing the object from
   * the array, all elements following the removed element are shifted
   * by one step towards the beginning of the array.
   *
   * The length of arrays is not modified inside this function.
   *
   * Parameters:
   *
   * obj - Object to find in the given array.
   * array - Array to check for the given obj.
   */
  remove: (obj, array) => {
    let result = null;

    if (typeof array === 'object') {
      let index = array.indexOf(obj);

      while (index >= 0) {
        array.splice(index, 1);
        result = obj;
        index = array.indexOf(obj);
      }
    }

    for (const key in array) {
      if (array[key] == obj) {
        delete array[key];
        result = obj;
      }
    }

    return result;
  },

  /**
   * Function: getXml
   *
   * Returns the XML content of the specified node. For Internet Explorer,
   * all \r\n\t[\t]* are removed from the XML string and the remaining \r\n
   * are replaced by \n. All \n are then replaced with linefeed, or &#xa; if
   * no linefeed is defined.
   *
   * Parameters:
   *
   * node - DOM node to return the XML for.
   * linefeed - Optional string that linefeeds are converted into. Default is
   * &#xa;
   */
  getXml: (node, linefeed) => {
    let xml = '';

    if (window.XMLSerializer != null) {
      const xmlSerializer = new XMLSerializer();
      xml = xmlSerializer.serializeToString(node);
    } else if (node.xml != null) {
      xml = node.xml
        .replace(/\r\n\t[\t]*/g, '')
        .replace(/>\r\n/g, '>')
        .replace(/\r\n/g, '\n');
    }

    // Replaces linefeeds with HTML Entities.
    linefeed = linefeed || '&#xa;';
    xml = xml.replace(/\n/g, linefeed);

    return xml;
  },

  /**
   * Function: getPrettyXML
   *
   * Returns a pretty printed string that represents the XML tree for the
   * given node. This method should only be used to print XML for reading,
   * use <getXml> instead to obtain a string for processing.
   *
   * Parameters:
   *
   * node - DOM node to return the XML for.
   * tab - Optional string that specifies the indentation for one level.
   * Default is two spaces.
   * indent - Optional string that represents the current indentation.
   * Default is an empty string.
   * newline - Option string that represents a linefeed. Default is '\n'.
   */
  getPrettyXml: (node, tab, indent, newline, ns) => {
    const result = [];

    if (node != null) {
      tab = tab != null ? tab : '  ';
      indent = indent != null ? indent : '';
      newline = newline != null ? newline : '\n';

      if (node.namespaceURI != null && node.namespaceURI !== ns) {
        ns = node.namespaceURI;

        if (node.getAttribute('xmlns') == null) {
          node.setAttribute('xmlns', node.namespaceURI);
        }
      }

      if (node.nodeType === mxConstants.NODETYPE_DOCUMENT) {
        result.push(
          mxUtils.getPrettyXml(node.documentElement, tab, indent, newline, ns)
        );
      } else if (node.nodeType === mxConstants.NODETYPE_DOCUMENT_FRAGMENT) {
        let tmp = node.firstChild;

        if (tmp != null) {
          while (tmp != null) {
            result.push(mxUtils.getPrettyXml(tmp, tab, indent, newline, ns));
            tmp = tmp.nextSibling;
          }
        }
      } else if (node.nodeType === mxConstants.NODETYPE_COMMENT) {
        const value = getTextContent(node);

        if (value.length > 0) {
          result.push(`${indent}<!--${value}-->${newline}`);
        }
      } else if (node.nodeType === mxConstants.NODETYPE_TEXT) {
        const value = trim(getTextContent(node));

        if (value.length > 0) {
          result.push(indent + htmlEntities(value, false) + newline);
        }
      } else if (node.nodeType === mxConstants.NODETYPE_CDATA) {
        const value = getTextContent(node);

        if (value.length > 0) {
          result.push(`${indent}<![CDATA[${value}]]${newline}`);
        }
      } else {
        result.push(`${indent}<${node.nodeName}`);

        // Creates the string with the node attributes
        // and converts all HTML entities in the values
        const attrs = node.attributes;

        if (attrs != null) {
          for (let i = 0; i < attrs.length; i += 1) {
            const val = htmlEntities(attrs[i].value);
            result.push(` ${attrs[i].nodeName}="${val}"`);
          }
        }

        // Recursively creates the XML string for each child
        // node and appends it here with an indentation
        let tmp = node.firstChild;

        if (tmp != null) {
          result.push(`>${newline}`);

          while (tmp != null) {
            result.push(
              mxUtils.getPrettyXml(tmp, tab, indent + tab, newline, ns)
            );
            tmp = tmp.nextSibling;
          }

          result.push(`${indent}</${node.nodeName}>${newline}`);
        } else {
          result.push(` />${newline}`);
        }
      }
    }

    return result.join('');
  },

  /**
   * Function: addTransparentBackgroundFilter
   *
   * Adds a transparent background to the filter of the given node. This
   * background can be used in IE8 standards mode (native IE8 only) to pass
   * events through the node.
   */
  addTransparentBackgroundFilter: node => {
    node.style.filter += `progid:DXImageTransform.Microsoft.AlphaImageLoader(src='${mxClient.imageBasePath}/transparent.gif', sizingMethod='scale')`;
  },

  /**
   * Function: getDocumentSize
   *
   * Returns the client size for the current document as an <mxRectangle>.
   */
  getDocumentSize: () => {
    const b = document.body;
    const d = document.documentElement;

    try {
      return new mxRectangle(
        0,
        0,
        b.clientWidth || d.clientWidth,
        Math.max(b.clientHeight || 0, d.clientHeight)
      );
    } catch (e) {
      return new mxRectangle();
    }
  },

  /**
   * Function: fit
   *
   * Makes sure the given node is inside the visible area of the window. This
   * is done by setting the left and top in the style.
   */
  fit: node => {
    const ds = mxUtils.getDocumentSize();
    const left = parseInt(node.offsetLeft);
    const width = parseInt(node.offsetWidth);

    const offset = mxUtils.getDocumentScrollOrigin(node.ownerDocument);
    const sl = offset.x;
    const st = offset.y;

    const b = document.body;
    const d = document.documentElement;
    const right = sl + ds.width;

    if (left + width > right) {
      node.style.left = `${Math.max(sl, right - width)}px`;
    }

    const top = parseInt(node.offsetTop);
    const height = parseInt(node.offsetHeight);

    const bottom = st + ds.height;

    if (top + height > bottom) {
      node.style.top = `${Math.max(st, bottom - height)}px`;
    }
  },

  /**
   * Function: loadInto
   *
   * Loads the specified URL *asynchronously* into the specified document,
   * invoking onload after the document has been loaded. This implementation
   * does not use <mxXmlRequest>, but the document.load method.
   *
   * Parameters:
   *
   * url - URL to get the data from.
   * doc - The document to load the URL into.
   * onload - Function to execute when the URL has been loaded.
   */
  loadInto: (url, doc, onload) => {
    doc.addEventListener('load', onload, false);
    doc.load(url);
  },

  /**
   * Function: getValue
   *
   * Returns the value for the given key in the given associative array or
   * the given default value if the value is null.
   *
   * Parameters:
   *
   * array - Associative array that contains the value for the key.
   * key - Key whose value should be returned.
   * defaultValue - Value to be returned if the value for the given
   * key is null.
   */
  getValue: (array, key, defaultValue) => {
    let value = array != null ? array[key] : null;
    if (value == null) {
      value = defaultValue;
    }
    return value;
  },

  getStringValue: (array, key, defaultValue) => {
    let value = array != null ? array[key] : null;
    if (value == null) {
      value = defaultValue;
    }
    return value == null ? null : String(value);
  },

  /**
   * Function: getNumber
   *
   * Returns the numeric value for the given key in the given associative
   * array or the given default value (or 0) if the value is null. The value
   * is converted to a numeric value using the Number function.
   *
   * Parameters:
   *
   * array - Associative array that contains the value for the key.
   * key - Key whose value should be returned.
   * defaultValue - Value to be returned if the value for the given
   * key is null. Default is 0.
   */
  getNumber: (array, key, defaultValue) => {
    let value = array != null ? array[key] : null;

    if (value == null) {
      value = defaultValue || 0;
    }

    return Number(value);
  },

  /**
   * Function: getColor
   *
   * Returns the color value for the given key in the given associative
   * array or the given default value if the value is null. If the value
   * is <mxConstants.NONE> then null is returned.
   *
   * Parameters:
   *
   * array - Associative array that contains the value for the key.
   * key - Key whose value should be returned.
   * defaultValue - Value to be returned if the value for the given
   * key is null. Default is null.
   */
  getColor: (array, key, defaultValue) => {
    let value = array != null ? array[key] : null;

    if (value == null) {
      value = defaultValue;
    } else if (value === mxConstants.NONE) {
      value = null;
    }

    return value;
  },

  /**
   * Function: equalPoints
   *
   * Compares all mxPoints in the given lists.
   *
   * Parameters:
   *
   * a - Array of <mxPoints> to be compared.
   * b - Array of <mxPoints> to be compared.
   */
  equalPoints: (a, b) => {
    if (
      (a == null && b != null) ||
      (a != null && b == null) ||
      (a != null && b != null && a.length != b.length)
    ) {
      return false;
    }
    if (a != null && b != null) {
      for (let i = 0; i < a.length; i += 1) {
        if (
          (a[i] != null && b[i] == null) ||
          (a[i] == null && b[i] != null) ||
          (a[i] != null &&
            b[i] != null &&
            (a[i].x != b[i].x || a[i].y != b[i].y))
        ) {
          return false;
        }
      }
    }

    return true;
  },

  /**
   * Function: equalEntries
   *
   * Returns true if all properties of the given objects are equal. Values
   * with NaN are equal to NaN and unequal to any other value.
   *
   * Parameters:
   *
   * a - First object to be compared.
   * b - Second object to be compared.
   */
  equalEntries: (a, b) => {
    // Counts keys in b to check if all values have been compared
    let count = 0;

    if (
      (a == null && b != null) ||
      (a != null && b == null) ||
      (a != null && b != null && a.length != b.length)
    ) {
      return false;
    }
    if (a != null && b != null) {
      for (var key in b) {
        count++;
      }

      for (var key in a) {
        count--;

        if (
          (!mxUtils.isNaN(a[key]) || !mxUtils.isNaN(b[key])) &&
          a[key] != b[key]
        ) {
          return false;
        }
      }
    }

    return count == 0;
  },

  /**
   * Function: removeDuplicates
   *
   * Removes all duplicates from the given array.
   */
  removeDuplicates: arr => {
    const dict = new mxDictionary();
    const result = [];

    for (let i = 0; i < arr.length; i += 1) {
      if (!dict.get(arr[i])) {
        result.push(arr[i]);
        dict.put(arr[i], true);
      }
    }

    return result;
  },

  /**
   * Function: isNaN
   *
   * Returns true if the given value is of type number and isNaN returns true.
   */
  isNaN: value => {
    return typeof value === 'number' && isNaN(value);
  },

  /**
   * Function: toString
   *
   * Returns a textual representation of the specified object.
   *
   * Parameters:
   *
   * obj - Object to return the string representation for.
   */
  toString: obj => {
    let output = '';

    for (const i in obj) {
      try {
        if (obj[i] == null) {
          output += `${i} = [null]\n`;
        } else if (typeof obj[i] === 'function') {
          output += `${i} => [Function]\n`;
        } else if (typeof obj[i] === 'object') {
          const ctor = mxUtils.getFunctionName(obj[i].constructor);
          output += `${i} => [${ctor}]\n`;
        } else {
          output += `${i} = ${obj[i]}\n`;
        }
      } catch (e) {
        output += `${i}=${e.message}`;
      }
    }

    return output;
  },

  /**
   * Function: toRadians
   *
   * Converts the given degree to radians.
   */
  toRadians: deg => {
    return (Math.PI * deg) / 180;
  },

  /**
   * Function: toDegree
   *
   * Converts the given radians to degree.
   */
  toDegree: rad => {
    return (rad * 180) / Math.PI;
  },

  /**
   * Function: arcToCurves
   *
   * Converts the given arc to a series of curves.
   */
  arcToCurves: (x0, y0, r1, r2, angle, largeArcFlag, sweepFlag, x, y) => {
    x -= x0;
    y -= y0;

    if (r1 === 0 || r2 === 0) {
      return result;
    }

    const fS = sweepFlag;
    const psai = angle;
    r1 = Math.abs(r1);
    r2 = Math.abs(r2);
    const ctx = -x / 2;
    const cty = -y / 2;
    const cpsi = Math.cos((psai * Math.PI) / 180);
    const spsi = Math.sin((psai * Math.PI) / 180);
    const rxd = cpsi * ctx + spsi * cty;
    const ryd = -1 * spsi * ctx + cpsi * cty;
    const rxdd = rxd * rxd;
    const rydd = ryd * ryd;
    const r1x = r1 * r1;
    const r2y = r2 * r2;
    const lamda = rxdd / r1x + rydd / r2y;
    let sds;

    if (lamda > 1) {
      r1 = Math.sqrt(lamda) * r1;
      r2 = Math.sqrt(lamda) * r2;
      sds = 0;
    } else {
      let seif = 1;

      if (largeArcFlag === fS) {
        seif = -1;
      }

      sds =
        seif *
        Math.sqrt(
          (r1x * r2y - r1x * rydd - r2y * rxdd) / (r1x * rydd + r2y * rxdd)
        );
    }

    const txd = (sds * r1 * ryd) / r2;
    const tyd = (-1 * sds * r2 * rxd) / r1;
    const tx = cpsi * txd - spsi * tyd + x / 2;
    const ty = spsi * txd + cpsi * tyd + y / 2;
    let rad = Math.atan2((ryd - tyd) / r2, (rxd - txd) / r1) - Math.atan2(0, 1);
    let s1 = rad >= 0 ? rad : 2 * Math.PI + rad;
    rad =
      Math.atan2((-ryd - tyd) / r2, (-rxd - txd) / r1) -
      Math.atan2((ryd - tyd) / r2, (rxd - txd) / r1);
    let dr = rad >= 0 ? rad : 2 * Math.PI + rad;

    if (fS == 0 && dr > 0) {
      dr -= 2 * Math.PI;
    } else if (fS != 0 && dr < 0) {
      dr += 2 * Math.PI;
    }

    const sse = (dr * 2) / Math.PI;
    const seg = Math.ceil(sse < 0 ? -1 * sse : sse);
    const segr = dr / seg;
    const t =
      ((8 / 3) * Math.sin(segr / 4) * Math.sin(segr / 4)) / Math.sin(segr / 2);
    const cpsir1 = cpsi * r1;
    const cpsir2 = cpsi * r2;
    const spsir1 = spsi * r1;
    const spsir2 = spsi * r2;
    let mc = Math.cos(s1);
    let ms = Math.sin(s1);
    let x2 = -t * (cpsir1 * ms + spsir2 * mc);
    let y2 = -t * (spsir1 * ms - cpsir2 * mc);
    let x3 = 0;
    let y3 = 0;

    let result = [];

    for (let n = 0; n < seg; ++n) {
      s1 += segr;
      mc = Math.cos(s1);
      ms = Math.sin(s1);

      x3 = cpsir1 * mc - spsir2 * ms + tx;
      y3 = spsir1 * mc + cpsir2 * ms + ty;
      const dx = -t * (cpsir1 * ms + spsir2 * mc);
      const dy = -t * (spsir1 * ms - cpsir2 * mc);

      // CurveTo updates x0, y0 so need to restore it
      const index = n * 6;
      result[index] = Number(x2 + x0);
      result[index + 1] = Number(y2 + y0);
      result[index + 2] = Number(x3 - dx + x0);
      result[index + 3] = Number(y3 - dy + y0);
      result[index + 4] = Number(x3 + x0);
      result[index + 5] = Number(y3 + y0);

      x2 = x3 + dx;
      y2 = y3 + dy;
    }

    return result;
  },

  /**
   * Function: getBoundingBox
   *
   * Returns the bounding box for the rotated rectangle.
   *
   * Parameters:
   *
   * rect - <mxRectangle> to be rotated.
   * angle - Number that represents the angle (in degrees).
   * cx - Optional <mxPoint> that represents the rotation center. If no
   * rotation center is given then the center of rect is used.
   */
  getBoundingBox: (rect, rotation, cx) => {
    let result = null;

    if (rect != null && rotation != null && rotation != 0) {
      const rad = mxUtils.toRadians(rotation);
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);

      cx =
        cx != null
          ? cx
          : new mxPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);

      let p1 = new mxPoint(rect.x, rect.y);
      let p2 = new mxPoint(rect.x + rect.width, rect.y);
      let p3 = new mxPoint(p2.x, rect.y + rect.height);
      let p4 = new mxPoint(rect.x, p3.y);

      p1 = mxUtils.getRotatedPoint(p1, cos, sin, cx);
      p2 = mxUtils.getRotatedPoint(p2, cos, sin, cx);
      p3 = mxUtils.getRotatedPoint(p3, cos, sin, cx);
      p4 = mxUtils.getRotatedPoint(p4, cos, sin, cx);

      result = new mxRectangle(p1.x, p1.y, 0, 0);
      result.add(new mxRectangle(p2.x, p2.y, 0, 0));
      result.add(new mxRectangle(p3.x, p3.y, 0, 0));
      result.add(new mxRectangle(p4.x, p4.y, 0, 0));
    }

    return result;
  },

  /**
   * Function: getRotatedPoint
   *
   * Rotates the given point by the given cos and sin.
   */
  getRotatedPoint: (pt, cos, sin, c) => {
    c = c != null ? c : new mxPoint();
    const x = pt.x - c.x;
    const y = pt.y - c.y;

    const x1 = x * cos - y * sin;
    const y1 = y * cos + x * sin;

    return new mxPoint(x1 + c.x, y1 + c.y);
  },

  /**
   * Returns an integer mask of the port constraints of the given map
   * @param dict the style map to determine the port constraints for
   * @param defaultValue Default value to return if the key is undefined.
   * @return the mask of port constraint directions
   *
   * Parameters:
   *
   * terminal - <mxCelState> that represents the terminal.
   * edge - <mxCellState> that represents the edge.
   * source - Boolean that specifies if the terminal is the source terminal.
   * defaultValue - Default value to be returned.
   */
  getPortConstraints: (terminal, edge, source, defaultValue) => {
    const value = mxUtils.getValue(
      terminal.style,
      mxConstants.STYLE_PORT_CONSTRAINT,
      mxUtils.getValue(
        edge.style,
        source
          ? mxConstants.STYLE_SOURCE_PORT_CONSTRAINT
          : mxConstants.STYLE_TARGET_PORT_CONSTRAINT,
        null
      )
    );

    if (value == null) {
      return defaultValue;
    }
    const directions = value.toString();
    let returnValue = mxConstants.DIRECTION_MASK_NONE;
    const constraintRotationEnabled = mxUtils.getValue(
      terminal.style,
      mxConstants.STYLE_PORT_CONSTRAINT_ROTATION,
      0
    );
    let rotation = 0;

    if (constraintRotationEnabled == 1) {
      rotation = mxUtils.getValue(
        terminal.style,
        mxConstants.STYLE_ROTATION,
        0
      );
    }

    let quad = 0;

    if (rotation > 45) {
      quad = 1;

      if (rotation >= 135) {
        quad = 2;
      }
    } else if (rotation < -45) {
      quad = 3;

      if (rotation <= -135) {
        quad = 2;
      }
    }

    if (directions.indexOf(mxConstants.DIRECTION_NORTH) >= 0) {
      switch (quad) {
        case 0:
          returnValue |= mxConstants.DIRECTION_MASK_NORTH;
          break;
        case 1:
          returnValue |= mxConstants.DIRECTION_MASK_EAST;
          break;
        case 2:
          returnValue |= mxConstants.DIRECTION_MASK_SOUTH;
          break;
        case 3:
          returnValue |= mxConstants.DIRECTION_MASK_WEST;
          break;
      }
    }
    if (directions.indexOf(mxConstants.DIRECTION_WEST) >= 0) {
      switch (quad) {
        case 0:
          returnValue |= mxConstants.DIRECTION_MASK_WEST;
          break;
        case 1:
          returnValue |= mxConstants.DIRECTION_MASK_NORTH;
          break;
        case 2:
          returnValue |= mxConstants.DIRECTION_MASK_EAST;
          break;
        case 3:
          returnValue |= mxConstants.DIRECTION_MASK_SOUTH;
          break;
      }
    }
    if (directions.indexOf(mxConstants.DIRECTION_SOUTH) >= 0) {
      switch (quad) {
        case 0:
          returnValue |= mxConstants.DIRECTION_MASK_SOUTH;
          break;
        case 1:
          returnValue |= mxConstants.DIRECTION_MASK_WEST;
          break;
        case 2:
          returnValue |= mxConstants.DIRECTION_MASK_NORTH;
          break;
        case 3:
          returnValue |= mxConstants.DIRECTION_MASK_EAST;
          break;
      }
    }
    if (directions.indexOf(mxConstants.DIRECTION_EAST) >= 0) {
      switch (quad) {
        case 0:
          returnValue |= mxConstants.DIRECTION_MASK_EAST;
          break;
        case 1:
          returnValue |= mxConstants.DIRECTION_MASK_SOUTH;
          break;
        case 2:
          returnValue |= mxConstants.DIRECTION_MASK_WEST;
          break;
        case 3:
          returnValue |= mxConstants.DIRECTION_MASK_NORTH;
          break;
      }
    }

    return returnValue;
  },

  /**
   * Function: reversePortConstraints
   *
   * Reverse the port constraint bitmask. For example, north | east
   * becomes south | west
   */
  reversePortConstraints: constraint => {
    let result = 0;

    result = (constraint & mxConstants.DIRECTION_MASK_WEST) << 3;
    result |= (constraint & mxConstants.DIRECTION_MASK_NORTH) << 1;
    result |= (constraint & mxConstants.DIRECTION_MASK_SOUTH) >> 1;
    result |= (constraint & mxConstants.DIRECTION_MASK_EAST) >> 3;

    return result;
  },

  /**
   * Function: findNearestSegment
   *
   * Finds the index of the nearest segment on the given cell state for
   * the specified coordinate pair.
   */
  findNearestSegment: (state, x, y) => {
    let index = -1;

    if (state.absolutePoints.length > 0) {
      let last = state.absolutePoints[0];
      let min = null;

      for (let i = 1; i < state.absolutePoints.length; i += 1) {
        const current = state.absolutePoints[i];
        const dist = mxUtils.ptSegDistSq(
          last.x,
          last.y,
          current.x,
          current.y,
          x,
          y
        );

        if (min == null || dist < min) {
          min = dist;
          index = i - 1;
        }

        last = current;
      }
    }

    return index;
  },

  /**
   * Function: getDirectedBounds
   *
   * Adds the given margins to the given rectangle and rotates and flips the
   * rectangle according to the respective styles in style.
   */
  getDirectedBounds(rect, m, style, flipH, flipV) {
    const d = mxUtils.getValue(
      style,
      mxConstants.STYLE_DIRECTION,
      mxConstants.DIRECTION_EAST
    );
    flipH =
      flipH != null
        ? flipH
        : mxUtils.getValue(style, mxConstants.STYLE_FLIPH, false);
    flipV =
      flipV != null
        ? flipV
        : mxUtils.getValue(style, mxConstants.STYLE_FLIPV, false);

    m.x = Math.round(Math.max(0, Math.min(rect.width, m.x)));
    m.y = Math.round(Math.max(0, Math.min(rect.height, m.y)));
    m.width = Math.round(Math.max(0, Math.min(rect.width, m.width)));
    m.height = Math.round(Math.max(0, Math.min(rect.height, m.height)));

    if (
      (flipV &&
        (d === mxConstants.DIRECTION_SOUTH ||
          d === mxConstants.DIRECTION_NORTH)) ||
      (flipH &&
        (d === mxConstants.DIRECTION_EAST || d === mxConstants.DIRECTION_WEST))
    ) {
      const tmp = m.x;
      m.x = m.width;
      m.width = tmp;
    }

    if (
      (flipH &&
        (d === mxConstants.DIRECTION_SOUTH ||
          d === mxConstants.DIRECTION_NORTH)) ||
      (flipV &&
        (d === mxConstants.DIRECTION_EAST || d === mxConstants.DIRECTION_WEST))
    ) {
      const tmp = m.y;
      m.y = m.height;
      m.height = tmp;
    }

    const m2 = mxRectangle.fromRectangle(m);

    if (d === mxConstants.DIRECTION_SOUTH) {
      m2.y = m.x;
      m2.x = m.height;
      m2.width = m.y;
      m2.height = m.width;
    } else if (d === mxConstants.DIRECTION_WEST) {
      m2.y = m.height;
      m2.x = m.width;
      m2.width = m.x;
      m2.height = m.y;
    } else if (d === mxConstants.DIRECTION_NORTH) {
      m2.y = m.width;
      m2.x = m.y;
      m2.width = m.height;
      m2.height = m.x;
    }

    return new mxRectangle(
      rect.x + m2.x,
      rect.y + m2.y,
      rect.width - m2.width - m2.x,
      rect.height - m2.height - m2.y
    );
  },

  /**
   * Function: getPerimeterPoint
   *
   * Returns the intersection between the polygon defined by the array of
   * points and the line between center and point.
   */
  getPerimeterPoint(pts, center, point) {
    let min = null;

    for (let i = 0; i < pts.length - 1; i += 1) {
      const pt = mxUtils.intersection(
        pts[i].x,
        pts[i].y,
        pts[i + 1].x,
        pts[i + 1].y,
        center.x,
        center.y,
        point.x,
        point.y
      );

      if (pt != null) {
        const dx = point.x - pt.x;
        const dy = point.y - pt.y;
        const ip = { p: pt, distSq: dy * dy + dx * dx };

        if (ip != null && (min == null || min.distSq > ip.distSq)) {
          min = ip;
        }
      }
    }

    return min != null ? min.p : null;
  },

  /**
   * Function: rectangleIntersectsSegment
   *
   * Returns true if the given rectangle intersects the given segment.
   *
   * Parameters:
   *
   * bounds - <mxRectangle> that represents the rectangle.
   * p1 - <mxPoint> that represents the first point of the segment.
   * p2 - <mxPoint> that represents the second point of the segment.
   */
  rectangleIntersectsSegment: (bounds, p1, p2) => {
    const top = bounds.y;
    const left = bounds.x;
    const bottom = top + bounds.height;
    const right = left + bounds.width;

    // Find min and max X for the segment
    let minX = p1.x;
    let maxX = p2.x;

    if (p1.x > p2.x) {
      minX = p2.x;
      maxX = p1.x;
    }

    // Find the intersection of the segment's and rectangle's x-projections
    if (maxX > right) {
      maxX = right;
    }

    if (minX < left) {
      minX = left;
    }

    if (minX > maxX) {
      // If their projections do not intersect return false
      return false;
    }

    // Find corresponding min and max Y for min and max X we found before
    let minY = p1.y;
    let maxY = p2.y;
    const dx = p2.x - p1.x;

    if (Math.abs(dx) > 0.0000001) {
      const a = (p2.y - p1.y) / dx;
      const b = p1.y - a * p1.x;
      minY = a * minX + b;
      maxY = a * maxX + b;
    }

    if (minY > maxY) {
      const tmp = maxY;
      maxY = minY;
      minY = tmp;
    }

    // Find the intersection of the segment's and rectangle's y-projections
    if (maxY > bottom) {
      maxY = bottom;
    }

    if (minY < top) {
      minY = top;
    }

    if (minY > maxY) {
      // If Y-projections do not intersect return false
      return false;
    }

    return true;
  },

  /**
   * Function: contains
   *
   * Returns true if the specified point (x, y) is contained in the given rectangle.
   *
   * Parameters:
   *
   * bounds - <mxRectangle> that represents the area.
   * x - X-coordinate of the point.
   * y - Y-coordinate of the point.
   */
  contains: (bounds, x, y) => {
    return (
      bounds.x <= x &&
      bounds.x + bounds.width >= x &&
      bounds.y <= y &&
      bounds.y + bounds.height >= y
    );
  },

  /**
   * Function: intersects
   *
   * Returns true if the two rectangles intersect.
   *
   * Parameters:
   *
   * a - <mxRectangle> to be checked for intersection.
   * b - <mxRectangle> to be checked for intersection.
   */
  intersects: (a, b) => {
    let tw = a.width;
    let th = a.height;
    let rw = b.width;
    let rh = b.height;

    if (rw <= 0 || rh <= 0 || tw <= 0 || th <= 0) {
      return false;
    }

    const tx = a.x;
    const ty = a.y;
    const rx = b.x;
    const ry = b.y;

    rw += rx;
    rh += ry;
    tw += tx;
    th += ty;

    return (
      (rw < rx || rw > tx) &&
      (rh < ry || rh > ty) &&
      (tw < tx || tw > rx) &&
      (th < ty || th > ry)
    );
  },

  /**
   * Function: intersectsHotspot
   *
   * Returns true if the state and the hotspot intersect.
   *
   * Parameters:
   *
   * state - <mxCellState>
   * x - X-coordinate.
   * y - Y-coordinate.
   * hotspot - Optional size of the hostpot.
   * min - Optional min size of the hostpot.
   * max - Optional max size of the hostpot.
   */
  intersectsHotspot: (state, x, y, hotspot, min, max) => {
    hotspot = hotspot != null ? hotspot : 1;
    min = min != null ? min : 0;
    max = max != null ? max : 0;

    if (hotspot > 0) {
      let cx = state.getCenterX();
      let cy = state.getCenterY();
      let w = state.width;
      let h = state.height;

      const start =
        mxUtils.getValue(state.style, mxConstants.STYLE_STARTSIZE) *
        state.view.scale;

      if (start > 0) {
        if (mxUtils.getValue(state.style, mxConstants.STYLE_HORIZONTAL, true)) {
          cy = state.y + start / 2;
          h = start;
        } else {
          cx = state.x + start / 2;
          w = start;
        }
      }

      w = Math.max(min, w * hotspot);
      h = Math.max(min, h * hotspot);

      if (max > 0) {
        w = Math.min(w, max);
        h = Math.min(h, max);
      }

      const rect = new mxRectangle(cx - w / 2, cy - h / 2, w, h);
      const alpha = mxUtils.toRadians(
        mxUtils.getValue(state.style, mxConstants.STYLE_ROTATION) || 0
      );

      if (alpha != 0) {
        const cos = Math.cos(-alpha);
        const sin = Math.sin(-alpha);
        const cx = new mxPoint(state.getCenterX(), state.getCenterY());
        const pt = mxUtils.getRotatedPoint(new mxPoint(x, y), cos, sin, cx);
        x = pt.x;
        y = pt.y;
      }

      return mxUtils.contains(rect, x, y);
    }

    return true;
  },

  /**
   * Function: getOffset
   *
   * Returns the offset for the specified container as an <mxPoint>. The
   * offset is the distance from the top left corner of the container to the
   * top left corner of the document.
   *
   * Parameters:
   *
   * container - DOM node to return the offset for.
   * scollOffset - Optional boolean to add the scroll offset of the document.
   * Default is false.
   */
  getOffset: (container, scrollOffset) => {
    let offsetLeft = 0;
    let offsetTop = 0;

    // Ignores document scroll origin for fixed elements
    let fixed = false;
    let node = container;
    const b = document.body;
    const d = document.documentElement;

    while (node != null && node != b && node != d && !fixed) {
      const style = mxUtils.getCurrentStyle(node);

      if (style != null) {
        fixed = fixed || style.position == 'fixed';
      }

      node = node.parentNode;
    }

    if (!scrollOffset && !fixed) {
      const offset = mxUtils.getDocumentScrollOrigin(container.ownerDocument);
      offsetLeft += offset.x;
      offsetTop += offset.y;
    }

    const r = container.getBoundingClientRect();

    if (r != null) {
      offsetLeft += r.left;
      offsetTop += r.top;
    }

    return new mxPoint(offsetLeft, offsetTop);
  },

  /**
   * Function: getDocumentScrollOrigin
   *
   * Returns the scroll origin of the given document or the current document
   * if no document is given.
   */
  getDocumentScrollOrigin: doc => {
    const wnd = doc.defaultView || doc.parentWindow;

    const x =
      wnd != null && window.pageXOffset !== undefined
        ? window.pageXOffset
        : (
            document.documentElement ||
            document.body.parentNode ||
            document.body
          ).scrollLeft;
    const y =
      wnd != null && window.pageYOffset !== undefined
        ? window.pageYOffset
        : (
            document.documentElement ||
            document.body.parentNode ||
            document.body
          ).scrollTop;

    return new mxPoint(x, y);
  },

  /**
   * Function: getScrollOrigin
   *
   * Returns the top, left corner of the viewrect as an <mxPoint>.
   *
   * Parameters:
   *
   * node - DOM node whose scroll origin should be returned.
   * includeAncestors - Whether the scroll origin of the ancestors should be
   * included. Default is false.
   * includeDocument - Whether the scroll origin of the document should be
   * included. Default is true.
   */
  getScrollOrigin: (node, includeAncestors, includeDocument) => {
    includeAncestors = includeAncestors != null ? includeAncestors : false;
    includeDocument = includeDocument != null ? includeDocument : true;

    const doc = node != null ? node.ownerDocument : document;
    const b = doc.body;
    const d = doc.documentElement;
    const result = new mxPoint();
    let fixed = false;

    while (node != null && node != b && node != d) {
      if (!isNaN(node.scrollLeft) && !isNaN(node.scrollTop)) {
        result.x += node.scrollLeft;
        result.y += node.scrollTop;
      }

      const style = mxUtils.getCurrentStyle(node);

      if (style != null) {
        fixed = fixed || style.position == 'fixed';
      }

      node = includeAncestors ? node.parentNode : null;
    }

    if (!fixed && includeDocument) {
      const origin = mxUtils.getDocumentScrollOrigin(doc);

      result.x += origin.x;
      result.y += origin.y;
    }

    return result;
  },

  /**
   * Function: convertPoint
   *
   * Converts the specified point (x, y) using the offset of the specified
   * container and returns a new <mxPoint> with the result.
   *
   * (code)
   * let pt = mxUtils.convertPoint(graph.container,
   *   mxEvent.getClientX(evt), mxEvent.getClientY(evt));
   * (end)
   *
   * Parameters:
   *
   * container - DOM node to use for the offset.
   * x - X-coordinate of the point to be converted.
   * y - Y-coordinate of the point to be converted.
   */
  convertPoint: (container, x, y) => {
    const origin = mxUtils.getScrollOrigin(container, false);
    const offset = mxUtils.getOffset(container);

    offset.x -= origin.x;
    offset.y -= origin.y;

    return new mxPoint(x - offset.x, y - offset.y);
  },

  /**
   * Function: isNumeric
   *
   * Returns true if the specified value is numeric, that is, if it is not
   * null, not an empty string, not a HEX number and isNaN returns false.
   *
   * Parameters:
   *
   * n - String representing the possibly numeric value.
   */
  isNumeric: n => {
    return (
      !isNaN(parseFloat(n)) &&
      isFinite(n) &&
      (typeof n !== 'string' || n.toLowerCase().indexOf('0x') < 0)
    );
  },

  /**
   * Function: isInteger
   *
   * Returns true if the given value is an valid integer number.
   *
   * Parameters:
   *
   * n - String representing the possibly numeric value.
   */
  isInteger: n => {
    return String(parseInt(n)) === String(n);
  },

  /**
   * Function: mod
   *
   * Returns the remainder of division of n by m. You should use this instead
   * of the built-in operation as the built-in operation does not properly
   * handle negative numbers.
   */
  mod: (n, m) => {
    return ((n % m) + m) % m;
  },

  /**
   * Function: intersection
   *
   * Returns the intersection of two lines as an <mxPoint>.
   *
   * Parameters:
   *
   * x0 - X-coordinate of the first line's startpoint.
   * y0 - X-coordinate of the first line's startpoint.
   * x1 - X-coordinate of the first line's endpoint.
   * y1 - Y-coordinate of the first line's endpoint.
   * x2 - X-coordinate of the second line's startpoint.
   * y2 - Y-coordinate of the second line's startpoint.
   * x3 - X-coordinate of the second line's endpoint.
   * y3 - Y-coordinate of the second line's endpoint.
   */
  intersection(x0, y0, x1, y1, x2, y2, x3, y3) {
    const denom = (y3 - y2) * (x1 - x0) - (x3 - x2) * (y1 - y0);
    const nume_a = (x3 - x2) * (y0 - y2) - (y3 - y2) * (x0 - x2);
    const nume_b = (x1 - x0) * (y0 - y2) - (y1 - y0) * (x0 - x2);

    const ua = nume_a / denom;
    const ub = nume_b / denom;

    if (ua >= 0.0 && ua <= 1.0 && ub >= 0.0 && ub <= 1.0) {
      // Get the intersection point
      const x = x0 + ua * (x1 - x0);
      const y = y0 + ua * (y1 - y0);

      return new mxPoint(x, y);
    }

    // No intersection
    return null;
  },

  /**
   * Function: ptSegDistSq
   *
   * Returns the square distance between a segment and a point. To get the
   * distance between a point and a line (with infinite length) use
   * <mxUtils.ptLineDist>.
   *
   * Parameters:
   *
   * x1 - X-coordinate of the startpoint of the segment.
   * y1 - Y-coordinate of the startpoint of the segment.
   * x2 - X-coordinate of the endpoint of the segment.
   * y2 - Y-coordinate of the endpoint of the segment.
   * px - X-coordinate of the point.
   * py - Y-coordinate of the point.
   */
  ptSegDistSq: (x1, y1, x2, y2, px, py) => {
    x2 -= x1;
    y2 -= y1;

    px -= x1;
    py -= y1;

    let dotprod = px * x2 + py * y2;
    let projlenSq;

    if (dotprod <= 0.0) {
      projlenSq = 0.0;
    } else {
      px = x2 - px;
      py = y2 - py;
      dotprod = px * x2 + py * y2;

      if (dotprod <= 0.0) {
        projlenSq = 0.0;
      } else {
        projlenSq = (dotprod * dotprod) / (x2 * x2 + y2 * y2);
      }
    }

    let lenSq = px * px + py * py - projlenSq;

    if (lenSq < 0) {
      lenSq = 0;
    }

    return lenSq;
  },

  /**
   * Function: ptLineDist
   *
   * Returns the distance between a line defined by two points and a point.
   * To get the distance between a point and a segment (with a specific
   * length) use <mxUtils.ptSeqDistSq>.
   *
   * Parameters:
   *
   * x1 - X-coordinate of point 1 of the line.
   * y1 - Y-coordinate of point 1 of the line.
   * x2 - X-coordinate of point 1 of the line.
   * y2 - Y-coordinate of point 1 of the line.
   * px - X-coordinate of the point.
   * py - Y-coordinate of the point.
   */
  ptLineDist: (x1, y1, x2, y2, px, py) => {
    return (
      Math.abs((y2 - y1) * px - (x2 - x1) * py + x2 * y1 - y2 * x1) /
      Math.sqrt((y2 - y1) * (y2 - y1) + (x2 - x1) * (x2 - x1))
    );
  },

  /**
   * Function: relativeCcw
   *
   * Returns 1 if the given point on the right side of the segment, 0 if its
   * on the segment, and -1 if the point is on the left side of the segment.
   *
   * Parameters:
   *
   * x1 - X-coordinate of the startpoint of the segment.
   * y1 - Y-coordinate of the startpoint of the segment.
   * x2 - X-coordinate of the endpoint of the segment.
   * y2 - Y-coordinate of the endpoint of the segment.
   * px - X-coordinate of the point.
   * py - Y-coordinate of the point.
   */
  relativeCcw: (x1, y1, x2, y2, px, py) => {
    x2 -= x1;
    y2 -= y1;
    px -= x1;
    py -= y1;
    let ccw = px * y2 - py * x2;

    if (ccw == 0.0) {
      ccw = px * x2 + py * y2;

      if (ccw > 0.0) {
        px -= x2;
        py -= y2;
        ccw = px * x2 + py * y2;

        if (ccw < 0.0) {
          ccw = 0.0;
        }
      }
    }

    return ccw < 0.0 ? -1 : ccw > 0.0 ? 1 : 0;
  },

  /**
   * Function: setOpacity
   *
   * Sets the opacity of the specified DOM node to the given value in %.
   *
   * Parameters:
   *
   * node - DOM node to set the opacity for.
   * value - Opacity in %. Possible values are between 0 and 100.
   */
  setOpacity: (node, value) => {
    node.style.opacity = value / 100;
  },

  /**
   * Function: createImage
   *
   * Creates and returns an image (IMG node) or VML image (v:image) in IE6 in
   * quirks mode.
   *
   * Parameters:
   *
   * src - URL that points to the image to be displayed.
   */
  createImage: src => {
    let imageNode = null;
    imageNode = document.createElement('img');
    imageNode.setAttribute('src', src);
    imageNode.setAttribute('border', '0');
    return imageNode;
  },

  /**
   * Function: sortCells
   *
   * Sorts the given cells according to the order in the cell hierarchy.
   * Ascending is optional and defaults to true.
   */
  sortCells: (cells, ascending) => {
    ascending = ascending != null ? ascending : true;
    const lookup = new mxDictionary();
    cells.sort((o1, o2) => {
      let p1 = lookup.get(o1);

      if (p1 == null) {
        p1 = mxCellPath.create(o1).split(mxCellPath.PATH_SEPARATOR);
        lookup.put(o1, p1);
      }

      let p2 = lookup.get(o2);

      if (p2 == null) {
        p2 = mxCellPath.create(o2).split(mxCellPath.PATH_SEPARATOR);
        lookup.put(o2, p2);
      }

      const comp = mxCellPath.compare(p1, p2);

      return comp == 0 ? 0 : comp > 0 == ascending ? 1 : -1;
    });

    return cells;
  },

  /**
   * Function: getStylename
   *
   * Returns the stylename in a style of the form [(stylename|key=value);] or
   * an empty string if the given style does not contain a stylename.
   *
   * Parameters:
   *
   * style - String of the form [(stylename|key=value);].
   */
  getStylename: style => {
    if (style != null) {
      const pairs = style.split(';');
      const stylename = pairs[0];

      if (stylename.indexOf('=') < 0) {
        return stylename;
      }
    }

    return '';
  },

  /**
   * Function: getStylenames
   *
   * Returns the stylenames in a style of the form [(stylename|key=value);]
   * or an empty array if the given style does not contain any stylenames.
   *
   * Parameters:
   *
   * style - String of the form [(stylename|key=value);].
   */
  getStylenames: style => {
    const result = [];

    if (style != null) {
      const pairs = style.split(';');

      for (let i = 0; i < pairs.length; i += 1) {
        if (pairs[i].indexOf('=') < 0) {
          result.push(pairs[i]);
        }
      }
    }

    return result;
  },

  /**
   * Function: indexOfStylename
   *
   * Returns the index of the given stylename in the given style. This
   * returns -1 if the given stylename does not occur (as a stylename) in the
   * given style, otherwise it returns the index of the first character.
   */
  indexOfStylename: (style, stylename) => {
    if (style != null && stylename != null) {
      const tokens = style.split(';');
      let pos = 0;

      for (let i = 0; i < tokens.length; i += 1) {
        if (tokens[i] == stylename) {
          return pos;
        }

        pos += tokens[i].length + 1;
      }
    }

    return -1;
  },

  /**
   * Function: addStylename
   *
   * Adds the specified stylename to the given style if it does not already
   * contain the stylename.
   */
  addStylename: (style, stylename) => {
    if (mxUtils.indexOfStylename(style, stylename) < 0) {
      if (style == null) {
        style = '';
      } else if (style.length > 0 && style.charAt(style.length - 1) != ';') {
        style += ';';
      }

      style += stylename;
    }

    return style;
  },

  /**
   * Function: removeStylename
   *
   * Removes all occurrences of the specified stylename in the given style
   * and returns the updated style. Trailing semicolons are not preserved.
   */
  removeStylename: (style, stylename) => {
    const result = [];

    if (style != null) {
      const tokens = style.split(';');

      for (let i = 0; i < tokens.length; i += 1) {
        if (tokens[i] != stylename) {
          result.push(tokens[i]);
        }
      }
    }

    return result.join(';');
  },

  /**
   * Function: removeAllStylenames
   *
   * Removes all stylenames from the given style and returns the updated
   * style.
   */
  removeAllStylenames: style => {
    const result = [];

    if (style != null) {
      const tokens = style.split(';');

      for (let i = 0; i < tokens.length; i += 1) {
        // Keeps the key, value assignments
        if (tokens[i].indexOf('=') >= 0) {
          result.push(tokens[i]);
        }
      }
    }

    return result.join(';');
  },

  /**
   * Function: setCellStyles
   *
   * Assigns the value for the given key in the styles of the given cells, or
   * removes the key from the styles if the value is null.
   *
   * Parameters:
   *
   * model - <mxGraphModel> to execute the transaction in.
   * cells - Array of <mxCells> to be updated.
   * key - Key of the style to be changed.
   * value - New value for the given key.
   */
  setCellStyles: (model, cells, key, value) => {
    if (cells != null && cells.length > 0) {
      model.beginUpdate();
      try {
        for (let i = 0; i < cells.length; i += 1) {
          if (cells[i] != null) {
            const style = mxUtils.setStyle(
              cells[i].getStyle(),
              key,
              value
            );
            model.setStyle(cells[i], style);
          }
        }
      } finally {
        model.endUpdate();
      }
    }
  },

  /**
   * Function: setStyle
   *
   * Adds or removes the given key, value pair to the style and returns the
   * new style. If value is null or zero length then the key is removed from
   * the style. This is for cell styles, not for CSS styles.
   *
   * Parameters:
   *
   * style - String of the form [(stylename|key=value);].
   * key - Key of the style to be changed.
   * value - New value for the given key.
   */
  setStyle: (style, key, value) => {
    const isValue =
      value != null &&
      (typeof value.length === 'undefined' || value.length > 0);

    if (style == null || style.length == 0) {
      if (isValue) {
        style = `${key}=${value};`;
      }
    } else if (style.substring(0, key.length + 1) == `${key}=`) {
      const next = style.indexOf(';');

      if (isValue) {
        style = `${key}=${value}${next < 0 ? ';' : style.substring(next)}`;
      } else {
        style =
          next < 0 || next == style.length - 1 ? '' : style.substring(next + 1);
      }
    } else {
      const index = style.indexOf(`;${key}=`);

      if (index < 0) {
        if (isValue) {
          const sep = style.charAt(style.length - 1) == ';' ? '' : ';';
          style = `${style + sep + key}=${value};`;
        }
      } else {
        const next = style.indexOf(';', index + 1);

        if (isValue) {
          style = `${style.substring(0, index + 1) + key}=${value}${
            next < 0 ? ';' : style.substring(next)
          }`;
        } else {
          style =
            style.substring(0, index) +
            (next < 0 ? ';' : style.substring(next));
        }
      }
    }

    return style;
  },

  /**
   * Function: setCellStyleFlags
   *
   * Sets or toggles the flag bit for the given key in the cell's styles.
   * If value is null then the flag is toggled.
   *
   * Example:
   *
   * (code)
   * let cells = graph.getSelectionCells();
   * mxUtils.setCellStyleFlags(graph.model,
   *       cells,
   *       mxConstants.STYLE_FONTSTYLE,
   *       mxConstants.FONT_BOLD);
   * (end)
   *
   * Toggles the bold font style.
   *
   * Parameters:
   *
   * model - <mxGraphModel> that contains the cells.
   * cells - Array of <mxCells> to change the style for.
   * key - Key of the style to be changed.
   * flag - Integer for the bit to be changed.
   * value - Optional boolean value for the flag.
   */
  setCellStyleFlags: (model, cells, key, flag, value) => {
    if (cells != null && cells.length > 0) {
      model.beginUpdate();
      try {
        for (let i = 0; i < cells.length; i += 1) {
          if (cells[i] != null) {
            const style = mxUtils.setStyleFlag(
              cells[i].getStyle(),
              key,
              flag,
              value
            );
            model.setStyle(cells[i], style);
          }
        }
      } finally {
        model.endUpdate();
      }
    }
  },

  /**
   * Function: setStyleFlag
   *
   * Sets or removes the given key from the specified style and returns the
   * new style. If value is null then the flag is toggled.
   *
   * Parameters:
   *
   * style - String of the form [(stylename|key=value);].
   * key - Key of the style to be changed.
   * flag - Integer for the bit to be changed.
   * value - Optional boolean value for the given flag.
   */
  setStyleFlag: (style, key, flag, value) => {
    if (style == null || style.length == 0) {
      if (value || value == null) {
        style = `${key}=${flag}`;
      } else {
        style = `${key}=0`;
      }
    } else {
      const index = style.indexOf(`${key}=`);

      if (index < 0) {
        const sep = style.charAt(style.length - 1) == ';' ? '' : ';';

        if (value || value == null) {
          style = `${style + sep + key}=${flag}`;
        } else {
          style = `${style + sep + key}=0`;
        }
      } else {
        const cont = style.indexOf(';', index);
        let tmp = '';

        if (cont < 0) {
          tmp = style.substring(index + key.length + 1);
        } else {
          tmp = style.substring(index + key.length + 1, cont);
        }

        if (value == null) {
          tmp = parseInt(tmp) ^ flag;
        } else if (value) {
          tmp = parseInt(tmp) | flag;
        } else {
          tmp = parseInt(tmp) & ~flag;
        }

        style = `${style.substring(0, index) + key}=${tmp}${
          cont >= 0 ? style.substring(cont) : ''
        }`;
      }
    }

    return style;
  },

  /**
   * Function: getAlignmentAsPoint
   *
   * Returns an <mxPoint> that represents the horizontal and vertical alignment
   * for numeric computations. X is -0.5 for center, -1 for right and 0 for
   * left alignment. Y is -0.5 for middle, -1 for bottom and 0 for top
   * alignment. Default values for missing arguments is top, left.
   */
  getAlignmentAsPoint: (align, valign) => {
    let dx = -0.5;
    let dy = -0.5;

    // Horizontal alignment
    if (align === mxConstants.ALIGN_LEFT) {
      dx = 0;
    } else if (align === mxConstants.ALIGN_RIGHT) {
      dx = -1;
    }

    // Vertical alignment
    if (valign === mxConstants.ALIGN_TOP) {
      dy = 0;
    } else if (valign === mxConstants.ALIGN_BOTTOM) {
      dy = -1;
    }

    return new mxPoint(dx, dy);
  },

  /**
   * Function: getSizeForString
   *
   * Returns an <mxRectangle> with the size (width and height in pixels) of
   * the given string. The string may contain HTML markup. Newlines should be
   * converted to <br> before calling this method. The caller is responsible
   * for sanitizing the HTML markup.
   *
   * Example:
   *
   * (code)
   * let label = graph.getLabel(cell).replace(/\n/g, "<br>");
   * let size = graph.getSizeForString(label);
   * (end)
   *
   * Parameters:
   *
   * text - String whose size should be returned.
   * fontSize - Integer that specifies the font size in pixels. Default is
   * <mxConstants.DEFAULT_FONTSIZE>.
   * fontFamily - String that specifies the name of the font family. Default
   * is <mxConstants.DEFAULT_FONTFAMILY>.
   * textWidth - Optional width for text wrapping.
   * fontStyle - Optional font style.
   */
  getSizeForString: (text, fontSize, fontFamily, textWidth, fontStyle) => {
    fontSize = fontSize != null ? fontSize : mxConstants.DEFAULT_FONTSIZE;
    fontFamily =
      fontFamily != null ? fontFamily : mxConstants.DEFAULT_FONTFAMILY;
    const div = document.createElement('div');

    // Sets the font size and family
    div.style.fontFamily = fontFamily;
    div.style.fontSize = `${Math.round(fontSize)}px`;
    div.style.lineHeight = `${Math.round(
      fontSize * mxConstants.LINE_HEIGHT
    )}px`;

    // Sets the font style
    if (fontStyle != null) {
      if ((fontStyle & mxConstants.FONT_BOLD) === mxConstants.FONT_BOLD) {
        div.style.fontWeight = 'bold';
      }

      if ((fontStyle & mxConstants.FONT_ITALIC) === mxConstants.FONT_ITALIC) {
        div.style.fontStyle = 'italic';
      }

      const txtDecor = [];

      if (
        (fontStyle & mxConstants.FONT_UNDERLINE) ==
        mxConstants.FONT_UNDERLINE
      ) {
        txtDecor.push('underline');
      }

      if (
        (fontStyle & mxConstants.FONT_STRIKETHROUGH) ==
        mxConstants.FONT_STRIKETHROUGH
      ) {
        txtDecor.push('line-through');
      }

      if (txtDecor.length > 0) {
        div.style.textDecoration = txtDecor.join(' ');
      }
    }

    // Disables block layout and outside wrapping and hides the div
    div.style.position = 'absolute';
    div.style.visibility = 'hidden';
    div.style.display = 'inline-block';

    if (textWidth != null) {
      div.style.width = `${textWidth}px`;
      div.style.whiteSpace = 'normal';
    } else {
      div.style.whiteSpace = 'nowrap';
    }

    // Adds the text and inserts into DOM for updating of size
    div.innerHTML = text;
    document.body.appendChild(div);

    // Gets the size and removes from DOM
    const size = new mxRectangle(0, 0, div.offsetWidth, div.offsetHeight);
    document.body.removeChild(div);

    return size;
  },

  /**
   * Function: getScaleForPageCount
   *
   * Returns the scale to be used for printing the graph with the given
   * bounds across the specifies number of pages with the given format. The
   * scale is always computed such that it given the given amount or fewer
   * pages in the print output. See <mxPrintPreview> for an example.
   *
   * Parameters:
   *
   * pageCount - Specifies the number of pages in the print output.
   * graph - <mxGraph> that should be printed.
   * pageFormat - Optional <mxRectangle> that specifies the page format.
   * Default is <mxConstants.PAGE_FORMAT_A4_PORTRAIT>.
   * border - The border along each side of every page.
   */
  getScaleForPageCount: (pageCount, graph, pageFormat, border) => {
    if (pageCount < 1) {
      // We can't work with less than 1 page, return no scale
      // change
      return 1;
    }

    pageFormat =
      pageFormat != null ? pageFormat : mxConstants.PAGE_FORMAT_A4_PORTRAIT;
    border = border != null ? border : 0;

    const availablePageWidth = pageFormat.width - border * 2;
    const availablePageHeight = pageFormat.height - border * 2;

    // Work out the number of pages required if the
    // graph is not scaled.
    const graphBounds = graph.getGraphBounds().clone();
    const sc = graph.getView().getScale();
    graphBounds.width /= sc;
    graphBounds.height /= sc;
    const graphWidth = graphBounds.width;
    const graphHeight = graphBounds.height;

    let scale = 1;

    // The ratio of the width/height for each printer page
    const pageFormatAspectRatio = availablePageWidth / availablePageHeight;
    // The ratio of the width/height for the graph to be printer
    const graphAspectRatio = graphWidth / graphHeight;

    // The ratio of horizontal pages / vertical pages for this
    // graph to maintain its aspect ratio on this page format
    const pagesAspectRatio = graphAspectRatio / pageFormatAspectRatio;

    // Factor the square root of the page count up and down
    // by the pages aspect ratio to obtain a horizontal and
    // vertical page count that adds up to the page count
    // and has the correct aspect ratio
    const pageRoot = Math.sqrt(pageCount);
    const pagesAspectRatioSqrt = Math.sqrt(pagesAspectRatio);
    let numRowPages = pageRoot * pagesAspectRatioSqrt;
    let numColumnPages = pageRoot / pagesAspectRatioSqrt;

    // These value are rarely more than 2 rounding downs away from
    // a total that meets the page count. In cases of one being less
    // than 1 page, the other value can be too high and take more iterations
    // In this case, just change that value to be the page count, since
    // we know the other value is 1
    if (numRowPages < 1 && numColumnPages > pageCount) {
      const scaleChange = numColumnPages / pageCount;
      numColumnPages = pageCount;
      numRowPages /= scaleChange;
    }

    if (numColumnPages < 1 && numRowPages > pageCount) {
      const scaleChange = numRowPages / pageCount;
      numRowPages = pageCount;
      numColumnPages /= scaleChange;
    }

    let currentTotalPages = Math.ceil(numRowPages) * Math.ceil(numColumnPages);

    let numLoops = 0;

    // Iterate through while the rounded up number of pages comes to
    // a total greater than the required number
    while (currentTotalPages > pageCount) {
      // Round down the page count (rows or columns) that is
      // closest to its next integer down in percentage terms.
      // i.e. Reduce the page total by reducing the total
      // page area by the least possible amount

      let roundRowDownProportion = Math.floor(numRowPages) / numRowPages;
      let roundColumnDownProportion =
        Math.floor(numColumnPages) / numColumnPages;

      // If the round down proportion is, work out the proportion to
      // round down to 1 page less
      if (roundRowDownProportion == 1) {
        roundRowDownProportion = Math.floor(numRowPages - 1) / numRowPages;
      }
      if (roundColumnDownProportion == 1) {
        roundColumnDownProportion =
          Math.floor(numColumnPages - 1) / numColumnPages;
      }

      // Check which rounding down is smaller, but in the case of very small roundings
      // try the other dimension instead
      let scaleChange = 1;

      // Use the higher of the two values
      if (roundRowDownProportion > roundColumnDownProportion) {
        scaleChange = roundRowDownProportion;
      } else {
        scaleChange = roundColumnDownProportion;
      }

      numRowPages *= scaleChange;
      numColumnPages *= scaleChange;
      currentTotalPages = Math.ceil(numRowPages) * Math.ceil(numColumnPages);

      numLoops++;

      if (numLoops > 10) {
        break;
      }
    }

    // Work out the scale from the number of row pages required
    // The column pages will give the same value
    const posterWidth = availablePageWidth * numRowPages;
    scale = posterWidth / graphWidth;

    // Allow for rounding errors
    return scale * 0.99999;
  },

  /**
   * Function: show
   *
   * Copies the styles and the markup from the graph's container into the
   * given document and removes all cursor styles. The document is returned.
   *
   * This function should be called from within the document with the graph.
   * If you experience problems with missing stylesheets in IE then try adding
   * the domain to the trusted sites.
   *
   * Parameters:
   *
   * graph - <mxGraph> to be copied.
   * doc - Document where the new graph is created.
   * x0 - X-coordinate of the graph view origin. Default is 0.
   * y0 - Y-coordinate of the graph view origin. Default is 0.
   * w - Optional width of the graph view.
   * h - Optional height of the graph view.
   */
  show: (graph, doc, x0, y0, w, h) => {
    x0 = x0 != null ? x0 : 0;
    y0 = y0 != null ? y0 : 0;

    if (doc == null) {
      const wnd = window.open();
      doc = wnd.document;
    } else {
      doc.open();
    }

    const bounds = graph.getGraphBounds();
    const dx = Math.ceil(x0 - bounds.x);
    const dy = Math.ceil(y0 - bounds.y);

    if (w == null) {
      w =
        Math.ceil(bounds.width + x0) +
        Math.ceil(Math.ceil(bounds.x) - bounds.x);
    }

    if (h == null) {
      h =
        Math.ceil(bounds.height + y0) +
        Math.ceil(Math.ceil(bounds.y) - bounds.y);
    }

    doc.writeln('<html><head>');

    const base = document.getElementsByTagName('base');

    for (let i = 0; i < base.length; i += 1) {
      doc.writeln(getOuterHtml(base[i]));
    }

    const links = document.getElementsByTagName('link');

    for (let i = 0; i < links.length; i += 1) {
      doc.writeln(getOuterHtml(links[i]));
    }

    const styles = document.getElementsByTagName('style');

    for (let i = 0; i < styles.length; i += 1) {
      doc.writeln(getOuterHtml(styles[i]));
    }

    doc.writeln('</head><body style="margin:0px;"></body></html>');
    doc.close();

    const outer = doc.createElement('div');
    outer.position = 'absolute';
    outer.overflow = 'hidden';
    outer.style.width = `${w}px`;
    outer.style.height = `${h}px`;

    // Required for HTML labels if foreignObjects are disabled
    const div = doc.createElement('div');
    div.style.position = 'absolute';
    div.style.left = `${dx}px`;
    div.style.top = `${dy}px`;

    let node = graph.container.firstChild;
    let svg = null;

    while (node != null) {
      const clone = node.cloneNode(true);

      if (node == graph.view.drawPane.ownerSVGElement) {
        outer.appendChild(clone);
        svg = clone;
      } else {
        div.appendChild(clone);
      }

      node = node.nextSibling;
    }

    doc.body.appendChild(outer);

    if (div.firstChild != null) {
      doc.body.appendChild(div);
    }

    if (svg != null) {
      svg.style.minWidth = '';
      svg.style.minHeight = '';
      svg.firstChild.setAttribute('transform', `translate(${dx},${dy})`);
    }

    mxUtils.removeCursors(doc.body);

    return doc;
  },

  /**
   * Function: printScreen
   *
   * Prints the specified graph using a new window and the built-in print
   * dialog.
   *
   * This function should be called from within the document with the graph.
   *
   * Parameters:
   *
   * graph - <mxGraph> to be printed.
   */
  printScreen: graph => {
    const wnd = window.open();
    const bounds = graph.getGraphBounds();
    mxUtils.show(graph, wnd.document);

    const print = () => {
      wnd.focus();
      wnd.print();
      wnd.close();
    };

    // Workaround for Google Chrome which needs a bit of a
    // delay in order to render the SVG contents
    if (mxClient.IS_GC) {
      wnd.setTimeout(print, 500);
    } else {
      print();
    }
  }
};

export default mxUtils;
