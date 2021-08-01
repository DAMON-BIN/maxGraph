/**
 * Copyright (c) 2006-2015, JGraph Ltd
 * Copyright (c) 2006-2015, Gaudenz Alder
 * Updated to ES9 syntax by David Morrissey 2021
 * Type definitions from the typed-mxgraph project
 */

import mxObjectIdentity from '../mxObjectIdentity';
import mxLog from '../gui/mxLog';
import Geometry from '../../view/geometry/Geometry';
import Point from '../../view/geometry/Point';
import { NODETYPE_ELEMENT } from '../Constants';
import utils, { isInteger, isNumeric } from '../Utils';
import { getTextContent } from '../DomUtils';
import { load } from '../network/mxXmlRequest';

/**
 * Generic codec for JavaScript objects that implements a mapping between
 * JavaScript objects and XML nodes that maps each field or element to an
 * attribute or child node, and vice versa.
 *
 * ### Atomic Values
 *
 * Consider the following example.
 *
 * ```javascript
 * var obj = new Object();
 * obj.foo = "Foo";
 * obj.bar = "Bar";
 * ```
 *
 * This object is encoded into an XML node using the following.
 *
 * ```javascript
 * var enc = new mxCodec();
 * var node = enc.encode(obj);
 * ```
 *
 * The output of the encoding may be viewed using {@link mxLog} as follows.
 *
 * ```javascript
 * mxLog.show();
 * mxLog.debug(mxUtils.getPrettyXml(node));
 * ```
 *
 * Finally, the result of the encoding looks as follows.
 *
 * ```javascript
 * <Object foo="Foo" bar="Bar"/>
 * ```
 *
 * In the above output, the foo and bar fields have been mapped to attributes
 * with the same names, and the name of the constructor was used for the
 * nodename.
 *
 * ### Booleans
 *
 * Since booleans are numbers in JavaScript, all boolean values are encoded
 * into 1 for true and 0 for false. The decoder also accepts the string true
 * and false for boolean values.
 *
 * ### Objects
 *
 * The above scheme is applied to all atomic fields, that is, to all non-object
 * fields of an object. For object fields, a child node is created with a
 * special attribute that contains the fieldname. This special attribute is
 * called "as" and hence, as is a reserved word that should not be used for a
 * fieldname.
 *
 * Consider the following example where foo is an object and bar is an atomic
 * property of foo.
 *
 * ```javascript
 * var obj = {foo: {bar: "Bar"}};
 * ```
 *
 * This will be mapped to the following XML structure by mxObjectCodec.
 *
 * ```javascript
 * <Object>
 *   <Object bar="Bar" as="foo"/>
 * </Object>
 * ```
 *
 * In the above output, the inner Object node contains the as-attribute that
 * specifies the fieldname in the enclosing object. That is, the field foo was
 * mapped to a child node with an as-attribute that has the value foo.
 *
 * ### Arrays
 *
 * Arrays are special objects that are either associative, in which case each
 * key, value pair is treated like a field where the key is the fieldname, or
 * they are a sequence of atomic values and objects, which is mapped to a
 * sequence of child nodes. For object elements, the above scheme is applied
 * without the use of the special as-attribute for creating each child. For
 * atomic elements, a special add-node is created with the value stored in the
 * value-attribute.
 *
 * For example, the following array contains one atomic value and one object
 * with a field called bar. Furthermore it contains two associative entries
 * called bar with an atomic value, and foo with an object value.
 *
 * ```javascript
 * var obj = ["Bar", {bar: "Bar"}];
 * obj["bar"] = "Bar";
 * obj["foo"] = {bar: "Bar"};
 * ```
 *
 * This array is represented by the following XML nodes.
 *
 * ```javascript
 * <Array bar="Bar">
 *   <add value="Bar"/>
 *   <Object bar="Bar"/>
 *   <Object bar="Bar" as="foo"/>
 * </Array>
 * ```
 *
 * The Array node name is the name of the constructor. The additional
 * as-attribute in the last child contains the key of the associative entry,
 * whereas the second last child is part of the array sequence and does not
 * have an as-attribute.
 *
 * ### References
 *
 * Objects may be represented as child nodes or attributes with ID values,
 * which are used to lookup the object in a table within {@link mxCodec}. The
 * {@link isReference} function is in charge of deciding if a specific field should
 * be encoded as a reference or not. Its default implementation returns true if
 * the fieldname is in {@link idrefs}, an array of strings that is used to configure
 * the {@link mxObjectCodec}.
 *
 * Using this approach, the mapping does not guarantee that the referenced
 * object itself exists in the document. The fields that are encoded as
 * references must be carefully chosen to make sure all referenced objects
 * exist in the document, or may be resolved by some other means if necessary.
 *
 * For example, in the case of the graph model all cells are stored in a tree
 * whose root is referenced by the model's root field. A tree is a structure
 * that is well suited for an XML representation, however, the additional edges
 * in the graph model have a reference to a source and target cell, which are
 * also contained in the tree. To handle this case, the source and target cell
 * of an edge are treated as references, whereas the children are treated as
 * objects. Since all cells are contained in the tree and no edge references a
 * source or target outside the tree, this setup makes sure all referenced
 * objects are contained in the document.
 *
 * In the case of a tree structure we must further avoid infinite recursion by
 * ignoring the parent reference of each child. This is done by returning true
 * in {@link isExcluded}, whose default implementation uses the array of excluded
 * fieldnames passed to the mxObjectCodec constructor.
 *
 * References are only used for cells in mxGraph. For defining other
 * referencable object types, the codec must be able to work out the ID of an
 * object. This is done by implementing {@link mxCodec.reference}. For decoding a
 * reference, the XML node with the respective id-attribute is fetched from the
 * document, decoded, and stored in a lookup table for later reference. For
 * looking up external objects, {@link mxCodec.lookup} may be implemented.
 *
 * ### Expressions
 *
 * For decoding JavaScript expressions, the add-node may be used with a text
 * content that contains the JavaScript expression. For example, the following
 * creates a field called foo in the enclosing object and assigns it the value
 * of {@link mxConstants.ALIGN_LEFT}.
 *
 * ```javascript
 * <Object>
 *   <add as="foo">mxConstants.ALIGN_LEFT</add>
 * </Object>
 * ```
 *
 * The resulting object has a field called foo with the value "left". Its XML
 * representation looks as follows.
 *
 * ```javascript
 * <Object foo="left"/>
 * ```
 *
 * This means the expression is evaluated at decoding time and the result of
 * the evaluation is stored in the respective field. Valid expressions are all
 * JavaScript expressions, including function definitions, which are mapped to
 * functions on the resulting object.
 *
 * Expressions are only evaluated if {@link allowEval} is true.
 *
 * @class mxObjectCodec
 */
class mxObjectCodec {
  constructor(template, exclude, idrefs, mapping) {
    this.template = template;

    this.exclude = exclude != null ? exclude : [];
    this.idrefs = idrefs != null ? idrefs : [];
    this.mapping = mapping != null ? mapping : [];

    this.reverse = {};

    for (const i in this.mapping) {
      this.reverse[this.mapping[i]] = i;
    }
  }

  /**
   * Static global switch that specifies if expressions in arrays are allowed.
   * Default is false. NOTE: Enabling this carries a possible security risk.
   * @static
   */
  // static allowEval: boolean;
  static allowEval = false;

  /**
   * Holds the template object associated with this codec.
   */
  // template: any;
  template = null;

  /**
   * Array containing the variable names that should be
   * ignored by the codec.
   */
  // exclude: Array<string>;
  exclude = null;

  /**
   * Array containing the variable names that should be
   * turned into or converted from references. See
   * {@link mxCodec.getId} and {@link mxCodec.getObject}.
   */
  // idrefs: Array<string>;
  idrefs = null;

  /**
   * Maps from from fieldnames to XML attribute names.
   */
  // mapping: { [key: string]: string };
  mapping = null;

  /**
   * Maps from from XML attribute names to fieldnames.
   */
  // reverse: any;
  reverse = null;

  /**
   * Returns the name used for the nodenames and lookup of the codec when
   * classes are encoded and nodes are decoded. For classes to work with
   * this the codec registry automatically adds an alias for the classname
   * if that is different than what this returns. The default implementation
   * returns the classname of the template class.
   */
  // getName(): string;
  getName() {
    return this.template.constructor.name;
  }

  /**
   * Returns a new instance of the template for this codec.
   */
  // cloneTemplate(): any;
  cloneTemplate() {
    return new this.template.constructor();
  }

  /**
   * Returns the fieldname for the given attributename.
   * Looks up the value in the {@link reverse} mapping or returns
   * the input if there is no reverse mapping for the
   * given name.
   */
  // getFieldName(attributename: string): string;
  getFieldName(attributename) {
    if (attributename != null) {
      const mapped = this.reverse[attributename];

      if (mapped != null) {
        attributename = mapped;
      }
    }

    return attributename;
  }

  /**
   * Returns the attributename for the given fieldname.
   * Looks up the value in the {@link mapping} or returns
   * the input if there is no mapping for the
   * given name.
   */
  // getAttributeName(fieldname: string): string;
  getAttributeName(fieldname) {
    if (fieldname != null) {
      const mapped = this.mapping[fieldname];

      if (mapped != null) {
        fieldname = mapped;
      }
    }

    return fieldname;
  }

  /**
   * Returns true if the given attribute is to be ignored by the codec. This
   * implementation returns true if the given fieldname is in {@link exclude} or
   * if the fieldname equals {@link mxObjectIdentity.FIELD_NAME}.
   *
   * @param obj Object instance that contains the field.
   * @param attr Fieldname of the field.
   * @param value Value of the field.
   * @param write Boolean indicating if the field is being encoded or decoded.
   * Write is true if the field is being encoded, else it is being decoded.
   */
  // isExcluded(obj: any, attr: string, value: any, write?: boolean): boolean;
  isExcluded(obj, attr, value, write) {
    return (
      attr == mxObjectIdentity.FIELD_NAME || this.exclude.indexOf(attr) >= 0
    );
  }

  /**
   * Returns true if the given fieldname is to be treated
   * as a textual reference (ID). This implementation returns
   * true if the given fieldname is in {@link idrefs}.
   *
   * @param obj Object instance that contains the field.
   * @param attr Fieldname of the field.
   * @param value Value of the field.
   * @param write Boolean indicating if the field is being encoded or decoded.
   * Write is true if the field is being encoded, else it is being decoded.
   */
  // isReference(obj: any, attr: string, value: any, write?: boolean): boolean;
  isReference(obj, attr, value, write) {
    return this.idrefs.indexOf(attr) >= 0;
  }

  /**
   * Encodes the specified object and returns a node
   * representing then given object. Calls {@link beforeEncode}
   * after creating the node and {@link afterEncode} with the
   * resulting node after processing.
   *
   * Enc is a reference to the calling encoder. It is used
   * to encode complex objects and create references.
   *
   * This implementation encodes all variables of an
   * object according to the following rules:
   *
   * - If the variable name is in {@link exclude} then it is ignored.
   * - If the variable name is in {@link idrefs} then {@link mxCodec.getId}
   * is used to replace the object with its ID.
   * - The variable name is mapped using {@link mapping}.
   * - If obj is an array and the variable name is numeric
   * (ie. an index) then it is not encoded.
   * - If the value is an object, then the codec is used to
   * create a child node with the variable name encoded into
   * the "as" attribute.
   * - Else, if {@link encodeDefaults} is true or the value differs
   * from the template value, then ...
   * - ... if obj is not an array, then the value is mapped to
   * an attribute.
   * - ... else if obj is an array, the value is mapped to an
   * add child with a value attribute or a text child node,
   * if the value is a function.
   *
   * If no ID exists for a variable in {@link idrefs} or if an object
   * cannot be encoded, a warning is issued using {@link mxLog.warn}.
   *
   * Returns the resulting XML node that represents the given
   * object.
   *
   * @param enc {@link mxCodec} that controls the encoding process.
   * @param obj Object to be encoded.
   */
  // encode(enc: mxCodec, obj: any): Node;
  encode(enc, obj) {
    const node = enc.document.createElement(this.getName());

    obj = this.beforeEncode(enc, obj, node);
    this.encodeObject(enc, obj, node);

    return this.afterEncode(enc, obj, node);
  }

  /**
   * Encodes the value of each member in then given obj into the given node using
   * {@link encodeValue}.
   *
   * @param enc {@link mxCodec} that controls the encoding process.
   * @param obj Object to be encoded.
   * @param node XML node that contains the encoded object.
   */
  // encodeObject(enc: mxCodec, obj: any, node: Node): void;
  encodeObject(enc, obj, node) {
    enc.setAttribute(node, 'id', enc.getId(obj));

    for (const i in obj) {
      let name = i;
      const value = obj[name];

      if (value != null && !this.isExcluded(obj, name, value, true)) {
        if (isInteger(name)) {
          name = null;
        }

        this.encodeValue(enc, obj, name, value, node);
      }
    }
  }

  /**
   * Converts the given value according to the mappings
   * and id-refs in this codec and uses {@link writeAttribute}
   * to write the attribute into the given node.
   *
   * @param enc {@link mxCodec} that controls the encoding process.
   * @param obj Object whose property is going to be encoded.
   * @param name XML node that contains the encoded object.
   * @param value Value of the property to be encoded.
   * @param node XML node that contains the encoded object.
   */
  // encodeValue(enc: mxCodec, obj: any, name: string, value: any, node: Node): void;
  encodeValue(enc, obj, name, value, node) {
    if (value != null) {
      if (this.isReference(obj, name, value, true)) {
        const tmp = enc.getId(value);

        if (tmp == null) {
          mxLog.warn(
            `mxObjectCodec.encode: No ID for ${this.getName()}.${name}=${value}`
          );
          return; // exit
        }

        value = tmp;
      }

      const defaultValue = this.template[name];

      // Checks if the value is a default value and
      // the name is correct
      if (name == null || enc.encodeDefaults || defaultValue != value) {
        name = this.getAttributeName(name);
        this.writeAttribute(enc, obj, name, value, node);
      }
    }
  }

  /**
   * Writes the given value into node using {@link writePrimitiveAttribute}
   * or {@link writeComplexAttribute} depending on the type of the value.
   */
  // writeAttribute(enc: mxCodec, obj: any, name: string, value: any, node: Node): void;
  writeAttribute(enc, obj, name, value, node) {
    if (typeof value !== 'object' /* primitive type */) {
      this.writePrimitiveAttribute(enc, obj, name, value, node);
    } /* complex type */ else {
      this.writeComplexAttribute(enc, obj, name, value, node);
    }
  }

  /**
   * Writes the given value as an attribute of the given node.
   */
  // writePrimitiveAttribute(enc: mxCodec, obj: any, name: string, value: any, node: Node): void;
  writePrimitiveAttribute(enc, obj, name, value, node) {
    value = this.convertAttributeToXml(enc, obj, name, value, node);

    if (name == null) {
      const child = enc.document.createElement('add');

      if (typeof value === 'function') {
        child.appendChild(enc.document.createTextNode(value));
      } else {
        enc.setAttribute(child, 'value', value);
      }

      node.appendChild(child);
    } else if (typeof value !== 'function') {
      enc.setAttribute(node, name, value);
    }
  }

  /**
   * Writes the given value as a child node of the given node.
   */
  // writeComplexAttribute(enc: mxCodec, obj: any, name: string, value: any, node: Node): void;
  writeComplexAttribute(enc, obj, name, value, node) {
    const child = enc.encode(value);

    if (child != null) {
      if (name != null) {
        child.setAttribute('as', name);
      }

      node.appendChild(child);
    } else {
      mxLog.warn(
        `mxObjectCodec.encode: No node for ${this.getName()}.${name}: ${value}`
      );
    }
  }

  /**
   * Converts true to "1" and false to "0" is {@link isBooleanAttribute} returns true.
   * All other values are not converted.
   *
   * @param enc {@link mxCodec} that controls the encoding process.
   * @param obj Objec to convert the attribute for.
   * @param name Name of the attribute to be converted.
   * @param value Value to be converted.
   */
  // convertAttributeToXml(enc: mxCodec, obj: any, name: string, value: any): any;
  convertAttributeToXml(enc, obj, name, value) {
    // Makes sure to encode boolean values as numeric values
    if (this.isBooleanAttribute(enc, obj, name, value)) {
      // Checks if the value is true (do not use the value as is, because
      // this would check if the value is not null, so 0 would be true)
      value = value == true ? '1' : '0';
    }

    return value;
  }

  /**
   * Returns true if the given object attribute is a boolean value.
   *
   * @param enc {@link mxCodec} that controls the encoding process.
   * @param obj Objec to convert the attribute for.
   * @param name Name of the attribute to be converted.
   * @param value Value of the attribute to be converted.
   */
  // isBooleanAttribute(enc: mxCodec, obj: any, name: string, value: any): boolean;
  isBooleanAttribute(enc, obj, name, value) {
    return (
      typeof value.length === 'undefined' && (value == true || value == false)
    );
  }

  /**
   * Converts booleans and numeric values to the respective types. Values are
   * numeric if {@link isNumericAttribute} returns true.
   *
   * @param dec {@link mxCodec} that controls the decoding process.
   * @param attr XML attribute to be converted.
   * @param obj Objec to convert the attribute for.
   */
  // convertAttributeFromXml(dec: mxCodec, attr: any, obj: any): any;
  convertAttributeFromXml(dec, attr, obj) {
    let { value } = attr;

    if (this.isNumericAttribute(dec, attr, obj)) {
      value = parseFloat(value);

      if (Number.isNaN(value) || !Number.isFinite(value)) {
        value = 0;
      }
    }

    return value;
  }

  /**
   * Returns true if the given XML attribute is or should be a numeric value.
   *
   * @param dec {@link mxCodec} that controls the decoding process.
   * @param attr XML attribute to be converted.
   * @param obj Objec to convert the attribute for.
   */
  // isNumericAttribute(dec: mxCodec, attr: any, obj: any): boolean;
  isNumericAttribute(dec, attr, obj) {
    // Handles known numeric attributes for generic objects
    const result =
      (obj.constructor === Geometry &&
        (attr.name === 'x' ||
          attr.name === 'y' ||
          attr.name === 'width' ||
          attr.name === 'height')) ||
      (obj.constructor === Point &&
        (attr.name === 'x' || attr.name === 'y')) ||
      isNumeric(attr.value);

    return result;
  }

  /**
   * Hook for subclassers to pre-process the object before
   * encoding. This returns the input object. The return
   * value of this function is used in {@link encode} to perform
   * the default encoding into the given node.
   *
   * @param enc {@link mxCodec} that controls the encoding process.
   * @param obj Object to be encoded.
   * @param node XML node to encode the object into.
   */
  // beforeEncode(enc: mxCodec, obj: any, node?: Node): any;
  beforeEncode(enc, obj, node) {
    return obj;
  }

  /**
   * Hook for subclassers to post-process the node
   * for the given object after encoding and return the
   * post-processed node. This implementation returns
   * the input node. The return value of this method
   * is returned to the encoder from {@link encode}.
   *
   * @param enc {@link mxCodec} that controls the encoding process.
   * @param obj Object to be encoded.
   * @param node XML node that represents the default encoding.
   */
  // afterEncode(enc: mxCodec, obj: any, node: Node): Node;
  afterEncode(enc, obj, node) {
    return node;
  }

  /**
   * Parses the given node into the object or returns a new object
   * representing the given node.
   *
   * Dec is a reference to the calling decoder. It is used to decode
   * complex objects and resolve references.
   *
   * If a node has an id attribute then the object cache is checked for the
   * object. If the object is not yet in the cache then it is constructed
   * using the constructor of {@link template} and cached in {@link mxCodec.objects}.
   *
   * This implementation decodes all attributes and childs of a node
   * according to the following rules:
   *
   * - If the variable name is in {@link exclude} or if the attribute name is "id"
   * or "as" then it is ignored.
   * - If the variable name is in {@link idrefs} then {@link mxCodec.getObject} is used
   * to replace the reference with an object.
   * - The variable name is mapped using a reverse {@link mapping}.
   * - If the value has a child node, then the codec is used to create a
   * child object with the variable name taken from the "as" attribute.
   * - If the object is an array and the variable name is empty then the
   * value or child object is appended to the array.
   * - If an add child has no value or the object is not an array then
   * the child text content is evaluated using {@link eval}.
   *
   * For add nodes where the object is not an array and the variable name
   * is defined, the default mechanism is used, allowing to override/add
   * methods as follows:
   *
   * ```javascript
   * <Object>
   *   <add as="hello"><![CDATA[
   *     function(arg1) {
   *       mxUtils.alert('Hello '+arg1);
   *     }
   *   ]]></add>
   * </Object>
   * ```
   *
   * If no object exists for an ID in {@link idrefs} a warning is issued
   * using {@link mxLog.warn}.
   *
   * Returns the resulting object that represents the given XML node
   * or the object given to the method as the into parameter.
   *
   * @param dec {@link mxCodec} that controls the decoding process.
   * @param node XML node to be decoded.
   * @param into Optional objec to encode the node into.
   */
  // decode(dec: mxCodec, node: Node, into?: any): any;
  decode(dec, node, into) {
    const id = node.getAttribute('id');
    let obj = dec.objects[id];

    if (obj == null) {
      obj = into || this.cloneTemplate();

      if (id != null) {
        dec.putObject(id, obj);
      }
    }

    node = this.beforeDecode(dec, node, obj);
    this.decodeNode(dec, node, obj);

    return this.afterDecode(dec, node, obj);
  }

  /**
   * Calls {@link decodeAttributes} and {@link decodeChildren} for the given node.
   *
   * @param dec {@link mxCodec} that controls the decoding process.
   * @param node XML node to be decoded.
   * @param obj Objec to encode the node into.
   */
  // decodeNode(dec: mxCodec, node: Node, obj: any): void;
  decodeNode(dec, node, obj) {
    if (node != null) {
      this.decodeAttributes(dec, node, obj);
      this.decodeChildren(dec, node, obj);
    }
  }

  /**
   * Decodes all attributes of the given node using {@link decodeAttribute}.
   *
   * @param dec {@link mxCodec} that controls the decoding process.
   * @param node XML node to be decoded.
   * @param obj Objec to encode the node into.
   */
  // decodeAttributes(dec: mxCodec, node: Node, obj: any): void;
  decodeAttributes(dec, node, obj) {
    const attrs = node.attributes;

    if (attrs != null) {
      for (let i = 0; i < attrs.length; i += 1) {
        this.decodeAttribute(dec, attrs[i], obj);
      }
    }
  }

  /**
   * Returns true if the given attribute should be ignored. This implementation
   * returns true if the attribute name is "as" or "id".
   *
   * @param dec {@link mxCodec} that controls the decoding process.
   * @param attr XML attribute to be decoded.
   * @param obj Objec to encode the attribute into.
   */
  // isIgnoredAttribute(dec: mxCodec, attr: any, obj?: any): boolean;
  isIgnoredAttribute(dec, attr, obj) {
    return attr.nodeName === 'as' || attr.nodeName === 'id';
  }

  /**
   * Reads the given attribute into the specified object.
   *
   * @param dec {@link mxCodec} that controls the decoding process.
   * @param attr XML attribute to be decoded.
   * @param obj Objec to encode the attribute into.
   */
  // decodeAttribute(dec: mxCodec, attr: any, obj?: any): void;
  decodeAttribute(dec, attr, obj) {
    if (!this.isIgnoredAttribute(dec, attr, obj)) {
      const name = attr.nodeName;

      // Converts the string true and false to their boolean values.
      // This may require an additional check on the obj to see if
      // the existing field is a boolean value or uninitialized, in
      // which case we may want to convert true and false to a string.
      let value = this.convertAttributeFromXml(dec, attr, obj);
      const fieldname = this.getFieldName(name);

      if (this.isReference(obj, fieldname, value, false)) {
        const tmp = dec.getObject(value);

        if (tmp == null) {
          mxLog.warn(
            `mxObjectCodec.decode: No object for ${this.getName()}.${name}=${value}`
          );
          return; // exit
        }

        value = tmp;
      }

      if (!this.isExcluded(obj, name, value, false)) {
        // mxLog.debug(mxUtils.getFunctionName(obj.constructor)+'.'+name+'='+value);
        obj[name] = value;
      }
    }
  }

  /**
   * Decodes all children of the given node using {@link decodeChild}.
   *
   * @param dec {@link mxCodec} that controls the decoding process.
   * @param node XML node to be decoded.
   * @param obj Objec to encode the node into.
   */
  // decodeChildren(dec: mxCodec, node: Node, obj?: any): void;
  decodeChildren(dec, node, obj) {
    let child = node.firstChild;

    while (child != null) {
      const tmp = child.nextSibling;

      if (
        child.nodeType === NODETYPE_ELEMENT &&
        !this.processInclude(dec, child, obj)
      ) {
        this.decodeChild(dec, child, obj);
      }

      child = tmp;
    }
  }

  /**
   * Reads the specified child into the given object.
   *
   * @param dec {@link mxCodec} that controls the decoding process.
   * @param child XML child element to be decoded.
   * @param obj Objec to encode the node into.
   */
  // decodeChild(dec: mxCodec, child: Node, obj: any): void;
  decodeChild(dec, child, obj) {
    const fieldname = this.getFieldName(child.getAttribute('as'));

    if (fieldname == null || !this.isExcluded(obj, fieldname, child, false)) {
      const template = this.getFieldTemplate(obj, fieldname, child);
      let value = null;

      if (child.nodeName === 'add') {
        value = child.getAttribute('value');

        if (value == null && mxObjectCodec.allowEval) {
          value = eval(getTextContent(child));
        }
      } else {
        value = dec.decode(child, template);
      }

      try {
        this.addObjectValue(obj, fieldname, value, template);
      } catch (e) {
        throw new Error(`${e.message} for ${child.nodeName}`);
      }
    }
  }

  /**
   * Returns the template instance for the given field. This returns the
   * value of the field, null if the value is an array or an empty collection
   * if the value is a collection. The value is then used to populate the
   * field for a new instance. For strongly typed languages it may be
   * required to override this to return the correct collection instance
   * based on the encoded child.
   */
  // getFieldTemplate(obj: any, fieldname: string, child: Node): any;
  getFieldTemplate(obj, fieldname, child) {
    let template = obj[fieldname];

    // Non-empty arrays are replaced completely
    if (template instanceof Array && template.length > 0) {
      template = null;
    }

    return template;
  }

  /**
   * Sets the decoded child node as a value of the given object. If the
   * object is a map, then the value is added with the given fieldname as a
   * key. If the fieldname is not empty, then setFieldValue is called or
   * else, if the object is a collection, the value is added to the
   * collection. For strongly typed languages it may be required to
   * override this with the correct code to add an entry to an object.
   */
  // addObjectValue(obj: any, fieldname: string, value: any, template: any): void;
  addObjectValue(obj, fieldname, value, template) {
    if (value != null && value !== template) {
      if (fieldname != null && fieldname.length > 0) {
        obj[fieldname] = value;
      } else {
        obj.push(value);
      }
      // mxLog.debug('Decoded '+mxUtils.getFunctionName(obj.constructor)+'.'+fieldname+': '+value);
    }
  }

  /**
   * Returns true if the given node is an include directive and
   * executes the include by decoding the XML document. Returns
   * false if the given node is not an include directive.
   *
   * @param dec {@link mxCodec} that controls the encoding/decoding process.
   * @param node XML node to be checked.
   * @param into Optional object to pass-thru to the codec.
   */
  // processInclude(dec: mxCodec, node: Node, into?: any): boolean;
  processInclude(dec, node, into) {
    if (node.nodeName === 'include') {
      const name = node.getAttribute('name');
      if (name != null) {
        try {
          const xml = load(name).getDocumentElement();
          if (xml != null) {
            dec.decode(xml, into);
          }
        } catch (e) {
          // ignore
        }
      }
      return true;
    }
    return false;
  }

  /**
   * Hook for subclassers to pre-process the node for
   * the specified object and return the node to be
   * used for further processing by {@link decode}.
   * The object is created based on the template in the
   * calling method and is never null. This implementation
   * returns the input node. The return value of this
   * function is used in {@link decode} to perform
   * the default decoding into the given object.
   *
   * @param dec {@link mxCodec} that controls the decoding process.
   * @param node XML node to be decoded.
   * @param obj Object to encode the node into.
   */
  // beforeDecode(dec: mxCodec, node: Node, obj: any): Node;
  beforeDecode(dec, node, obj) {
    return node;
  }

  /**
   * Hook for subclassers to post-process the object after
   * decoding. This implementation returns the given object
   * without any changes. The return value of this method
   * is returned to the decoder from {@link decode}.
   *
   * @param enc {@link mxCodec} that controls the encoding process.
   * @param node XML node to be decoded.
   * @param obj Object that represents the default decoding.
   */
  // afterDecode(dec: mxCodec, node: Node, obj?: any): any;
  afterDecode(dec, node, obj) {
    return obj;
  }
}

export default mxObjectCodec;